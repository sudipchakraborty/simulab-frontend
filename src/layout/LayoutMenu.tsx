import { useRef } from "react";
import { PanelsTopLeft, RotateCcw } from "lucide-react";
import { panelIds, panelTitles } from "./model";
import type { WorkspaceLayoutController } from "./useWorkspaceLayout";
/** @brief Always-mounted escape route: every hidden panel can be restored without reopening the app. */
export function LayoutMenu({
  controller,
}: {
  controller: WorkspaceLayoutController;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <div className="layout-bar">
      <span className="layout-caption">WORKSPACE</span>
      <details
        className="layout-menu"
        ref={menu}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            menu.current?.removeAttribute("open");
            menu.current?.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>
          <PanelsTopLeft size={15} />
          Layout
        </summary>
        <div className="layout-popover" aria-label="Workspace layout settings">
          <strong>Show panels</strong>
          {panelIds.map((id) => (
            <label key={id}>
              <input
                type="checkbox"
                checked={controller.layout.panels[id].visible}
                onChange={() => controller.toggle(id)}
              />
              {panelTitles[id]}
            </label>
          ))}
          <div className="layout-menu-actions">
            <button onClick={controller.showAll}>Show all panels</button>
            <button onClick={controller.reset}>
              <RotateCcw size={12} />
              Reset layout
            </button>
          </div>
          <small>
            Drag panel borders to resize. Sizes and visibility are remembered.
          </small>
        </div>
      </details>
    </div>
  );
}
