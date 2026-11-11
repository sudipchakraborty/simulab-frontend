import { useRef, type CSSProperties, type ReactNode } from "react";
import { X } from "lucide-react";
import { panelTitles, type PanelId } from "./model";
export interface DockPanelProps {
  id: PanelId;
  title?: string;
  visible: boolean;
  size: number;
  minSize: number;
  maxSize: number;
  onResize: (screenDelta: number) => void;
  onHide: () => void;
  children: ReactNode;
  className?: string;
  inactive?: boolean;
}
/** @brief Fixed edge container: hiding preserves mounted children, source state and running Workers.
 * @param props Host owns visibility, bounded dimensions, persistence and layout policy.
 */
export function DockPanel({
  id,
  title = panelTitles[id],
  visible,
  size,
  minSize,
  maxSize,
  onResize,
  onHide,
  children,
  className = "",
  inactive = false,
}: DockPanelProps) {
  const side = id === "left" || id === "right";
  const drag = useRef<{ pointer: number; last: number } | null>(null);
  return (
    <section
      className={`dock-panel dock-${id} ${className}`}
      hidden={!visible || inactive}
      style={{ "--pane-size": size + "px" } as CSSProperties}
      aria-label={`${title} panel`}
    >
      <div className="dock-heading">
        <span>{title}</span>
        <button
          type="button"
          onClick={onHide}
          aria-label={`Hide ${title}`}
          title={`Hide ${title}`}
        >
          <X size={13} />
        </button>
      </div>
      <div className="dock-content">{children}</div>
      <div
        className={`dock-resizer ${side ? "vertical" : "horizontal"}`}
        role="separator"
        tabIndex={0}
        aria-label={`Resize ${id} panel`}
        aria-orientation={side ? "vertical" : "horizontal"}
        aria-valuemin={Math.round(minSize)}
        aria-valuemax={Math.round(maxSize)}
        aria-valuenow={Math.round(size)}
        title="Drag to resize. Arrow keys resize; Shift makes larger steps."
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          drag.current = {
            pointer: e.pointerId,
            last: side ? e.clientX : e.clientY,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.pointer !== e.pointerId) return;
          const position = side ? e.clientX : e.clientY;
          onResize(position - d.last);
          d.last = position;
        }}
        onPointerUp={(e) => {
          if (drag.current?.pointer !== e.pointerId) return;
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 48 : 16;
          let delta = side
            ? e.key === "ArrowLeft"
              ? -step
              : e.key === "ArrowRight"
                ? step
                : 0
            : e.key === "ArrowUp"
              ? -step
              : e.key === "ArrowDown"
                ? step
                : 0;
          if (e.key === "Home" || e.key === "End")
            delta =
              ((e.key === "Home" ? minSize : maxSize) - size) *
              (id === "right" || id === "bottom" ? -1 : 1);
          if (delta) {
            e.preventDefault();
            onResize(delta);
          }
        }}
      />
    </section>
  );
}
