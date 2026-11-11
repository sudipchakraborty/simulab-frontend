import { parseProject } from "../circuit/project";
import type { CircuitProject } from "../circuit/types";
export type BoardId =
  "uno" | "nano" | "mega2560" | "esp32" | "esp32s3" | "yd-n16r8";
export type WorkspaceTab = "hardware" | "code" | "debugger" | "serial";
export interface SourceFile {
  name: string;
  content: string;
  cursor?: { lineNumber: number; column: number };
}
export interface WorkspaceDocument {
  version: "1.0.0";
  circuit: CircuitProject;
  board: BoardId;
  files: SourceFile[];
  activeFile: string;
  activeTab: WorkspaceTab;
  breakpoints: Record<string, number[]>;
}
/** @brief Explicit board/toolchain/execution mapping; generic ESP32 has no installed execution backend. */
export const boardProfiles: Record<
  BoardId,
  { name: string; target: "uno" | "nano" | "mega2560" | "esp32s3" | null }
> = {
  uno: { name: "Arduino Uno", target: "uno" },
  nano: { name: "Arduino Nano", target: "nano" },
  mega2560: { name: "Arduino Mega2560", target: "mega2560" },
  esp32: { name: "ESP32 DevKit (build/upload)", target: null },
  esp32s3: { name: "ESP32-S3 DevKit", target: "esp32s3" },
  "yd-n16r8": {
    name: "YD ESP32-S3 N16R8 (compatible compile profile)",
    target: "esp32s3",
  },
};
/** @brief Minimal fresh-project source without reference firmware behavior. */
export const blankSketch = "void setup() {\n}\n\nvoid loop() {\n}\n";
export const unoSketch =
  '// SimuLab: real Arduino firmware\nvoid setup() { pinMode(13, OUTPUT); Serial.begin(9600); }\nvoid loop() { digitalWrite(13, HIGH); Serial.println("LED ON"); delay(250); digitalWrite(13, LOW); delay(250); }\n';
export const s3Sketch =
  '// ESP32-S3 GPIO4 output; wire GPIO4 to an LED through a resistor.\nvoid setup() { pinMode(4, OUTPUT); Serial.begin(115200); }\nvoid loop() { digitalWrite(4, HIGH); Serial.println("GPIO4 HIGH"); delay(250); digitalWrite(4, LOW); delay(250); }\n';
/** @brief Construct a portable multifile IDE document around an existing circuit. */
export function newWorkspace(circuit: CircuitProject): WorkspaceDocument {
  return {
    version: "1.0.0",
    circuit,
    board: "uno",
    files: [{ name: "sketch.ino", content: unoSketch }],
    activeFile: "sketch.ino",
    activeTab: "hardware",
    breakpoints: {},
  };
}
/** @brief Parse untrusted IDE documents with bounded source/filename/schema validation. */
export function parseWorkspace(json: string): WorkspaceDocument {
  if (json.length > 3_100_000) throw new Error("Workspace exceeds 3 MB");
  const w = JSON.parse(json) as WorkspaceDocument;
  if (
    !w ||
    w.version !== "1.0.0" ||
    !Object.hasOwn(boardProfiles, w.board) ||
    !["hardware", "code", "debugger", "serial"].includes(w.activeTab) ||
    !Array.isArray(w.files) ||
    !w.files.length ||
    w.files.length > 32
  )
    throw new Error("Invalid IDE workspace");
  const names = new Set<string>();
  let size = 0;
  for (const f of w.files) {
    if (
      !f ||
      !/^[A-Za-z][A-Za-z0-9_-]{0,63}\.(ino|h|hpp|cpp|c)$/.test(f.name) ||
      /^(con|prn|aux|nul|com\d|lpt\d)\./i.test(f.name) ||
      names.has(f.name.toLowerCase()) ||
      typeof f.content !== "string"
    )
      throw new Error("Invalid source file");
    names.add(f.name.toLowerCase());
    size += f.content.length;
    if (
      f.cursor &&
      (!Number.isSafeInteger(f.cursor.lineNumber) ||
        f.cursor.lineNumber < 1 ||
        !Number.isSafeInteger(f.cursor.column) ||
        f.cursor.column < 1)
    )
      throw new Error("Invalid cursor");
  }
  if (
    size > 1_000_000 ||
    !names.has("sketch.ino") ||
    !w.files.some((f) => f.name === w.activeFile)
  )
    throw new Error("Invalid source project");
  if (
    !w.breakpoints ||
    typeof w.breakpoints !== "object" ||
    Object.entries(w.breakpoints).some(
      ([f, lines]) =>
        !w.files.some((s) => s.name === f) ||
        !Array.isArray(lines) ||
        lines.length > 1000 ||
        lines.some((n) => !Number.isSafeInteger(n) || n < 1),
    )
  )
    throw new Error("Invalid breakpoints");
  return { ...w, circuit: parseProject(JSON.stringify(w.circuit)) };
}
/** @brief Serialize validated circuit + source; compiler artifacts and pairing tokens are deliberately excluded. */
export function serializeWorkspace(w: WorkspaceDocument) {
  return JSON.stringify(parseWorkspace(JSON.stringify(w)), null, 2);
}
/** @brief Capability-driven debugger. Instruction registers are real; source mappings/GDB are absent. */
export function debugCapabilities(target: string) {
  return {
    execution: ["uno", "nano", "mega2560", "esp32s3"].includes(target),
    instructionStep: ["uno", "nano", "mega2560"].includes(target),
    sourceStep: false,
    watch: false,
    callStack: false,
    physicalDebug: false,
    reason: ["uno", "nano", "mega2560"].includes(target)
      ? "AVR instruction stepping and registers available. Source stepping, source breakpoints, variables and stack need ELF/DWARF mapping."
      : "This adapter does not expose instruction debugging or source mappings.",
  };
}
/** @brief Download text/blob without retaining object URLs. */
export function download(
  name: string,
  content: BlobPart,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
