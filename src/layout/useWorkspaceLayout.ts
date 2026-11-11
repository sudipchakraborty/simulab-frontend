import { useEffect, useState } from "react";
import {
  defaultLayout,
  fitLayout,
  panelBounds,
  panelIds,
  parseLayout,
  resizePanel,
  type PanelId,
} from "./model";
/** @brief Inject a workspace-specific key; blocked storage never prevents panel operation. */
export function useWorkspaceLayout(storageKey: string) {
  const key = storageKey + ".layout.v1";
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [layout, setLayout] = useState(() => {
    try {
      return parseLayout(
        localStorage.getItem(key),
        window.innerWidth,
        window.innerHeight,
      );
    } catch {
      return defaultLayout(window.innerWidth, window.innerHeight);
    }
  });
  useEffect(() => {
    const update = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const effective = fitLayout(layout, viewport.width, viewport.height);
  useEffect(() => {
    setLayout((s) => fitLayout(s, viewport.width, viewport.height));
  }, [layout, viewport.width, viewport.height]);
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(layout));
    } catch {
      /* Layout remains usable without persistence. */
    }
  }, [key, layout]);
  const toggle = (id: PanelId) =>
    setLayout((s) => ({
      ...s,
      panels: {
        ...s.panels,
        [id]: { ...s.panels[id], visible: !s.panels[id].visible },
      },
    }));
  const resize = (id: PanelId, delta: number) =>
    setLayout((s) =>
      resizePanel(s, id, delta, viewport.width, viewport.height),
    );
  const reset = () => setLayout(defaultLayout(viewport.width, viewport.height));
  const showAll = () =>
    setLayout((s) => ({
      ...s,
      panels: Object.fromEntries(
        panelIds.map((id) => [id, { ...s.panels[id], visible: true }]),
      ) as typeof s.panels,
    }));
  const pane = (id: PanelId) => {
    const bounds = panelBounds(effective, id, viewport.width, viewport.height);
    return {
      id,
      visible: effective.panels[id].visible,
      size: effective.panels[id].size,
      minSize: bounds.min,
      maxSize: bounds.max,
      onResize: (delta: number) => resize(id, delta),
      onHide: () => toggle(id),
    };
  };
  return { layout: effective, toggle, resize, reset, showAll, pane };
}
export type WorkspaceLayoutController = ReturnType<typeof useWorkspaceLayout>;
