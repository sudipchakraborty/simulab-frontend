import {
  Copy,
  ClipboardPaste,
  CopyPlus,
  Trash2,
  FilePlus2,
  SquareDashedMousePointer,
} from "lucide-react";
interface Props {
  canEdit: boolean;
  components: number;
  wires: number;
  total: number;
  canPaste: boolean;
  onNew: () => void;
  onSelectAll: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDeleteAll: () => void;
}
/** @brief Reusable selection command strip; host supplies document policy and callbacks. */
export function SelectionToolbar(p: Props) {
  return (
    <div
      className="selection-toolbar"
      role="toolbar"
      aria-label="Design editing"
    >
      <button disabled={!p.canEdit} onClick={p.onNew}>
        <FilePlus2 size={14} />
        New project
      </button>
      <button disabled={!p.total} onClick={p.onSelectAll}>
        <SquareDashedMousePointer size={14} />
        Select all
      </button>
      <button
        disabled={!p.canEdit || !p.components}
        onClick={p.onCopy}
        title="Ctrl/Cmd+C copies selected components and internal wires"
      >
        <Copy size={14} />
        Copy
      </button>
      <button
        disabled={!p.canEdit || !p.canPaste}
        onClick={p.onPaste}
        title="Ctrl/Cmd+V"
      >
        <ClipboardPaste size={14} />
        Paste
      </button>
      <button disabled={!p.canEdit || !p.components} onClick={p.onDuplicate}>
        <CopyPlus size={14} />
        Duplicate
      </button>
      <button
        disabled={!p.canEdit || (!p.components && !p.wires)}
        onClick={p.onDelete}
      >
        <Trash2 size={14} />
        Delete selected
      </button>
      <button disabled={!p.canEdit || !p.total} onClick={p.onDeleteAll}>
        Delete all
      </button>
      <span aria-live="polite" data-testid="selection-count">
        {p.components} components, {p.wires} wires selected
      </span>
    </div>
  );
}
