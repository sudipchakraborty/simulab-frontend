import type { CircuitProject } from "../circuit/types";
/** @brief Resolve target explicitly; one board per session prevents cross-architecture fallback. */
export function simulationTarget(
  project: CircuitProject,
): "uno" | "esp32s3" | "none" | "multiple" {
  const boards = project.components.filter(
    (c) => c.kind === "uno" || c.kind === "yd-esp32-s3",
  );
  return boards.length > 1
    ? "multiple"
    : boards.length === 0
      ? "none"
      : boards[0].kind === "uno"
        ? "uno"
        : "esp32s3";
}
