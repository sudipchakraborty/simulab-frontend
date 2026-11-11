import { useEffect, useRef } from "react";
import type { SourceFile } from "./workspace";
import type { Diagnostic } from "./ToolchainClient";
import * as monaco from "monaco-editor/editor/editor.api.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import "monaco-editor/features/find/register.js";
import "monaco-editor/features/bracketMatching/register.js";
import "monaco-editor/features/clipboard/register.js";
import { formatCpp } from "./formatCpp";
(globalThis as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};
/** @brief Multifile Monaco host; models and view state survive main-tab/file switches. */
export default function CodeEditor({
  files,
  readOnly = false,
  activeFile,
  onChange,
  onCursor,
  diagnostics,
  breakpoints,
  onBreakpoint,
}: {
  files: SourceFile[];
  readOnly?: boolean;
  activeFile: string;
  onChange: (name: string, content: string) => void;
  onCursor: (
    name: string,
    cursor: { lineNumber: number; column: number },
  ) => void;
  diagnostics: Diagnostic[];
  breakpoints: Record<string, number[]>;
  onBreakpoint: (name: string, line: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    editor = useRef<monaco.editor.IStandaloneCodeEditor | undefined>(undefined),
    models = useRef(new Map<string, monaco.editor.ITextModel>()),
    views = useRef(new Map<string, monaco.editor.ICodeEditorViewState>());
  const callbacks = useRef({ onChange, onCursor, onBreakpoint });
  callbacks.current = { onChange, onCursor, onBreakpoint };
  useEffect(() => {
    const e = monaco.editor.create(host.current!, {
      language: "cpp",
      theme:
        document.documentElement.dataset.colorScheme === "light"
          ? "vs"
          : "vs-dark",
      readOnly,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 14,
      glyphMargin: true,
      scrollBeyondLastLine: false,
      tabSize: 2,
      insertSpaces: true,
      matchBrackets: "always",
      ariaLabel: "Arduino source editor",
    });
    editor.current = e;
    const changes = e.onDidChangeModelContent(() => {
      const model = e.getModel();
      if (model)
        callbacks.current.onChange(model.uri.path.slice(1), model.getValue());
    });
    const cursor = e.onDidChangeCursorPosition((ev) => {
      const model = e.getModel();
      if (model)
        callbacks.current.onCursor(model.uri.path.slice(1), ev.position);
    });
    const mouse = e.onMouseDown((ev) => {
      if (
        ev.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        ev.target.position
      )
        callbacks.current.onBreakpoint(
          e.getModel()!.uri.path.slice(1),
          ev.target.position.lineNumber,
        );
    });
    const resize = new ResizeObserver(() => e.layout());
    resize.observe(host.current!);
    return () => {
      resize.disconnect();
      changes.dispose();
      cursor.dispose();
      mouse.dispose();
      e.dispose();
      for (const m of models.current.values()) m.dispose();
      models.current.clear();
    };
  }, []);
  useEffect(() => {
    editor.current?.updateOptions({ readOnly });
  }, [readOnly]);
  useEffect(() => {
    const theme = () =>
      monaco.editor.setTheme(
        document.documentElement.dataset.colorScheme === "light"
          ? "vs"
          : "vs-dark",
      );
    window.addEventListener("simulab-theme-change", theme);
    return () => window.removeEventListener("simulab-theme-change", theme);
  }, []);
  useEffect(() => {
    const e = editor.current;
    if (!e) return;
    // Monaco owns in-flight edits. Reapplying delayed React props here corrupts fast typing/cursor order.
    // External project/sample replacement remounts this host through its sourceRevision key.
    for (const f of files) {
      let m = models.current.get(f.name);
      if (!m) {
        m = monaco.editor.createModel(
          f.content,
          "cpp",
          monaco.Uri.parse("file:///" + f.name),
        );
        models.current.set(f.name, m);
      }
    }
    for (const [name, m] of models.current)
      if (!files.some((f) => f.name === name)) {
        m.dispose();
        models.current.delete(name);
      }
    const previous = e.getModel();
    if (previous && previous.uri.path.slice(1) !== activeFile)
      views.current.set(previous.uri.path.slice(1), e.saveViewState()!);
    const model = models.current.get(activeFile);
    if (model && e.getModel() !== model) {
      e.setModel(model);
      const view = views.current.get(activeFile);
      if (view) e.restoreViewState(view);
      else
        e.setPosition(
          files.find((f) => f.name === activeFile)?.cursor ?? {
            lineNumber: 1,
            column: 1,
          },
        );
    }
    for (const [name, m] of models.current) {
      monaco.editor.setModelMarkers(
        m,
        "arduino",
        diagnostics
          .filter((d) => d.file === name)
          .map((d) => ({
            severity:
              d.severity === "error"
                ? monaco.MarkerSeverity.Error
                : monaco.MarkerSeverity.Warning,
            startLineNumber: d.line,
            startColumn: d.column,
            endLineNumber: d.line,
            endColumn: d.column + 1,
            message: d.message,
          })),
      );
    }
  }, [files, activeFile, diagnostics]);
  useEffect(() => {
    const m = models.current.get(activeFile);
    if (!m) return;
    const ids = m.deltaDecorations(
      [],
      (breakpoints[activeFile] ?? []).map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          glyphMarginClassName: "breakpoint-glyph",
          glyphMarginHoverMessage: {
            value: "Requested breakpoint: source execution binding unavailable",
          },
        },
      })),
    );
    return () => {
      if (!m.isDisposed()) m.deltaDecorations(ids, []);
    };
  }, [activeFile, breakpoints]);
  return (
    <>
      <div className="editor-tools">
        <button
          onClick={() => editor.current?.getAction("actions.find")?.run()}
        >
          Find / Replace
        </button>
        <button
          disabled={readOnly}
          onClick={() => {
            if (readOnly) return;
            const e = editor.current,
              m = e?.getModel();
            if (!e || !m) return;
            // Conservative indentation formatter: strings/comments are left untouched; no unsupported C++ parser claim.
            const text = formatCpp(m.getValue());
            e.executeEdits("indent", [{ range: m.getFullModelRange(), text }]);
          }}
        >
          Format indentation
        </button>
        <span>
          C/C++ · Ctrl+F search · Ctrl+H replace · click gutter to manage
          requested breakpoints
        </span>
      </div>
      <div ref={host} className="monaco-host" />
    </>
  );
}
