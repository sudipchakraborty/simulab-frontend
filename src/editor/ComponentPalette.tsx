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
import { CATEGORIES, componentCategory } from "../circuit/categories";
import type { ComponentKind } from "../circuit/types";
const kinds = Object.keys(catalog) as ComponentKind[];
/** @brief Reusable palette emits component kind; host controls placement and persistence. */
export function ComponentPalette({
  onAdd,
  onLoadYdExample,
  onLoadComponentExample,
}: {
  onAdd: (kind: ComponentKind) => void;
  onLoadYdExample?: () => void;
  onLoadComponentExample?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleKinds = kinds.filter(
    (kind) =>
      (category === "all" || componentCategory(kind) === category) &&
      `${catalog[kind].name} ${catalog[kind].description}`
        .toLowerCase()
        .includes(normalizedQuery),
  );
  return (
    <aside className="palette">
      <div className="section-kicker">BUILD YOUR CIRCUIT</div>
      <h2>
        Components <span>{kinds.length}</span>
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
      <label className="palette-filter">
        Category
        <select
          aria-label="Component category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      {visibleKinds.length === 0 && (
        <p className="palette-empty">No components match your search.</p>
      )}
      {CATEGORIES.map((group) => {
        const groupKinds = visibleKinds.filter(
          (kind) => componentCategory(kind) === group,
        );
        return groupKinds.length > 0 ? (
          <section className="palette-group" key={group} aria-label={group}>
            <h3>{group}</h3>
            {groupKinds.map((kind) => (
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
                  {componentCategory(kind) === "Microcontroller" ? (
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
                              : catalog[kind].description}
                  </small>
                </span>
                <Plus size={15} />
              </button>
            ))}
          </section>
        ) : null;
      })}
      <button className="yd-example" onClick={onLoadYdExample}>
        Open YD GPIO4 example
      </button>
      <button onClick={onLoadComponentExample}>
        Open component laboratory
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
        <Layers size={14} /> Component library <span>v0.4</span>
      </div>
    </aside>
  );
}
