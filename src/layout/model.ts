/** @file Validated, versioned appearance preferences independent of circuit/account data. */
export const panelIds = ["top", "left", "right", "bottom"] as const;
export type PanelId = (typeof panelIds)[number];
export interface PanelPreference {
  visible: boolean;
  size: number;
}
export interface WorkspaceLayout {
  version: 1;
  panels: Record<PanelId, PanelPreference>;
}
export const panelTitles: Record<PanelId, string> = {
  top: "Top toolbar",
  left: "Components",
  right: "Inspector",
  bottom: "Output",
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
/** @brief Safe viewport defaults; narrow layouts retain an unobstructed central workspace. */
export function defaultLayout(width = 1440, height = 1000): WorkspaceLayout {
  return {
    version: 1,
    panels: {
      top: { visible: true, size: width < 650 ? 210 : 164 },
      left: { visible: width >= 900, size: 252 },
      right: { visible: width >= 900, size: 245 },
      bottom: { visible: true, size: width < 900 || height < 750 ? 140 : 190 },
    },
  };
}
/** @brief Keep a usable center; narrow screens display explicitly opened side panes as overlays. */
export function panelBounds(
  layout: WorkspaceLayout,
  id: PanelId,
  width: number,
  height: number,
) {
  if (id === "left" || id === "right") {
    const other = layout.panels[id === "left" ? "right" : "left"];
    return {
      min: 180,
      max: Math.max(
        180,
        Math.min(
          520,
          width < 900
            ? width - 32
            : width - (other.visible ? other.size : 0) - 320,
        ),
      ),
    };
  }
  const other = layout.panels[id === "top" ? "bottom" : "top"];
  const min = id === "top" ? 164 : 120;
  return {
    min,
    max: Math.max(
      min,
      Math.min(
        id === "top" ? 320 : 520,
        height - (other.visible ? other.size : 0) - (width < 650 ? 600 : 540),
      ),
    ),
  };
}
/** @brief Normalize actual dimensions before drawing or applying incremental gestures after a viewport change. */
export function fitLayout(
  layout: WorkspaceLayout,
  width: number,
  height: number,
): WorkspaceLayout {
  let result = layout;
  for (const id of panelIds) {
    const { min, max } = panelBounds(result, id, width, height);
    const size = clamp(result.panels[id].size, min, max);
    if (size !== result.panels[id].size)
      result = {
        ...result,
        panels: { ...result.panels, [id]: { ...result.panels[id], size } },
      };
  }
  return result;
}
/** @brief Resize using screen deltas; right/bottom borders have the opposite direction. */
export function resizePanel(
  layout: WorkspaceLayout,
  id: PanelId,
  delta: number,
  width: number,
  height: number,
): WorkspaceLayout {
  if (!Number.isFinite(delta)) return layout;
  layout = fitLayout(layout, width, height);
  const { min, max } = panelBounds(layout, id, width, height);
  return {
    ...layout,
    panels: {
      ...layout.panels,
      [id]: {
        ...layout.panels[id],
        size: clamp(
          layout.panels[id].size +
            delta * (id === "right" || id === "bottom" ? -1 : 1),
          min,
          max,
        ),
      },
    },
  };
}
/** @brief Parse untrusted local preferences and recover individually from malformed fields. */
export function parseLayout(
  text: string | null,
  width = 1440,
  height = 1000,
): WorkspaceLayout {
  const result = defaultLayout(width, height);
  try {
    const raw = JSON.parse(text || "null");
    if (raw?.version !== 1 || !raw.panels) return result;
    for (const id of panelIds) {
      const p = raw.panels[id];
      if (!p || typeof p !== "object") continue;
      if (typeof p.visible === "boolean") result.panels[id].visible = p.visible;
      if (typeof p.size === "number" && Number.isFinite(p.size))
        result.panels[id].size = clamp(
          p.size,
          id === "top" ? 164 : id === "bottom" ? 120 : 180,
          id === "top" ? 320 : 520,
        );
    }
    for (const id of panelIds) {
      const { min, max } = panelBounds(result, id, width, height);
      result.panels[id].size = clamp(result.panels[id].size, min, max);
    }
    return result;
  } catch {
    return result;
  }
}
