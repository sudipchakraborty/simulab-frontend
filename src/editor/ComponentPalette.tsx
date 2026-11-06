import { useState } from "react";
import {
  Cpu,
  Plus,
  Search,
  Layers,
  MousePointer2,
  GitBranch,
  Lightbulb,
  ToggleLeft,
  RectangleEllipsis,
} from "lucide-react";
import { catalog } from "../circuit/catalog";
import type { ComponentKind } from "../circuit/types";
const kinds: ComponentKind[] = [
  "uno",
  "yd-esp32-s3",
  "led",
  "resistor",
  "switch",
  "junction",
];
/** @brief Reusable palette emits component kind; host controls placement and persistence. */
export function ComponentPalette({
  onAdd,
  onLoadYdExample,
}: {
  onAdd: (kind: ComponentKind) => void;
  onLoadYdExample?: () => void;
}) {
  const [query, setQuery] = useState("");
  return (
    <aside className="palette">
      <div className="section-kicker">BUILD YOUR CIRCUIT</div>
      <h2>
        Components <span>06</span>
      </h2>
      <label className="search">
        <Search size={16} />
        <input
          aria-label="Search components"
          placeholder="Find a component "
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <kbd>/</kbd>
      </label>
      <div className="palette-category">MICROCONTROLLERS & COMPONENTS</div>
      {kinds
        .filter((k) =>
          catalog[k].name.toLowerCase().includes(query.toLowerCase()),
        )
        .map((kind) => (
          <button
            key={kind}
            className="palette-card"
            draggable
            onDragStart={(e) =>
              e.dataTransfer.setData("application/simulab", kind)
            }
            onClick={() => onAdd(kind)}
            title="Drag to canvas or click to add"
          >
            <span className={`palette-icon ${kind}`}>
              {kind === "uno" || kind === "yd-esp32-s3" ? (
                <Cpu size={25} />
              ) : kind === "led" ? (
                <Lightbulb size={23} />
              ) : kind === "resistor" ? (
                <RectangleEllipsis size={24} />
              ) : kind === "switch" ? (
                <ToggleLeft size={24} />
              ) : (
                <GitBranch size={24} />
              )}
            </span>
            <span>
              <strong>{catalog[kind].name}</strong>
              <small>
                {kind === "uno"
                  ? "ATmega328P   16 MHz"
                  : kind === "yd-esp32-s3"
                    ? "Xtensa LX7 / 44 pins"
                    : kind === "led"
                      ? "Indicator   2 pins"
                      : kind === "resistor"
                        ? "Passive   2 pins"
                        : kind === "switch"
                          ? "Input   2 pins"
                          : "Explicit electrical node"}
              </small>
            </span>
            <Plus size={15} />
          </button>
        ))}
      <button className="yd-example" onClick={onLoadYdExample}>
        Open YD GPIO4 example
      </button>
      <div className="palette-help">
        <span className="tiny-label">A PLACE TO EXPERIMENT</span>
        <h3>Start with a connection.</h3>
        <p>
          Drag components onto the grid. Connect the pins to bring your design
          together.
        </p>
        <span>
          <MousePointer2 size={14} /> Click or drag to place
        </span>
      </div>
      <div className="palette-footer">
        <Layers size={14} /> Component library <span>v0.1</span>
      </div>
    </aside>
  );
}
