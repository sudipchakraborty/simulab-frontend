import { validateModelProperties, parameterBounds } from "../models/parameters";
import { BoardDetails } from "./BoardDetails";
import { Cpu, Info, MousePointer2, Trash2 } from "lucide-react";
import { catalog } from "../circuit/catalog";
import type { CircuitComponent, CircuitProject } from "../circuit/types";
import type { ModelSnapshot } from "../models/contract";

/** @brief Host-supplied document and callbacks keep the inspector independent of editor state. */
export interface InspectorProps {
  project: CircuitProject;
  selected?: string;
  commit: (project: CircuitProject) => void;
  onDelete: () => void;
  onNotice: (message: string) => void;
  deviceStates?: Record<string, ModelSnapshot>;
}

/** @brief Edit selected component or wire metadata within the circuit JSON contract limits.
 * @param props Current document, selection, and host-owned mutation callbacks.
 */
export function Inspector({
  project,
  selected,
  commit,
  onDelete,
  onNotice,
  deviceStates,
}: InspectorProps) {
  const part = project.components.find(
    (component) => component.id === selected,
  );
  const wire = project.wires.find((connection) => connection.id === selected);

  const updatePart = (patch: Partial<CircuitComponent>) => {
    if (!part) return;
    commit({
      ...project,
      components: project.components.map((component) =>
        component.id === part.id ? { ...component, ...patch } : component,
      ),
    });
  };

  const updateProperty = (
    key: string,
    previous: string | number | boolean,
    input: string,
  ) => {
    if (!part) return;
    const value =
      typeof previous === "number"
        ? Number(input)
        : typeof previous === "boolean"
          ? input === "true"
          : input;
    if (
      typeof value === "number" &&
      (!Number.isFinite(value) || Math.abs(value) > 1e12)
    ) {
      onNotice("Property must be a finite number within +/- 1e12.");
      return;
    }
    const properties = { ...part.properties, [key]: value };
    try {
      validateModelProperties(part.kind, properties);
    } catch (error) {
      onNotice(
        error instanceof Error ? error.message : "Invalid model parameter",
      );
      return;
    }
    updatePart({ properties });
  };

  return (
    <aside className="inspector">
      <div className="inspector-heading">
        <h2>Inspector</h2>
        <span>PROPERTIES</span>
      </div>
      {part ? (
        <>
          <div className="selected-type">
            <span className="selected-icon">
              <Cpu size={25} />
            </span>
            <h3>{catalog[part.kind].name}</h3>
            <p>{part.label}</p>
            <p>{catalog[part.kind].description}</p>
          </div>
          <div className="property-section">
            {deviceStates?.[part.id] && (
              <>
                <h4>LIVE MODEL STATE</h4>
                <dl>
                  {Object.entries(deviceStates[part.id].values).map(
                    ([key, v]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ),
                  )}
                </dl>
                {deviceStates[part.id].warnings.map((w) => (
                  <p key={w} className="model-warning">
                    {w}
                  </p>
                ))}
              </>
            )}
            <h4>COMPONENT</h4>
            <label>
              Reference
              <input
                aria-label="Component reference"
                maxLength={200}
                value={part.label}
                onChange={(event) => updatePart({ label: event.target.value })}
              />
            </label>
            <label>
              Type
              <input value={part.kind} readOnly />
            </label>
            <div className="property-grid">
              <label>
                X position
                <input value={part.position.x} readOnly />
              </label>
              <label>
                Y position
                <input value={part.position.y} readOnly />
              </label>
            </div>
            {part.kind === "yd-esp32-s3" && (
              <BoardDetails part={part} onChange={updatePart} />
            )}
            {part.kind !== "yd-esp32-s3" && part.rotation !== 0 && (
              <p className="muted">
                Rotation metadata: {part.rotation} degrees (visual rotation
                unavailable in Phase 1)
              </p>
            )}
            {Object.entries(part.properties)
              .filter(
                ([key]) =>
                  part.kind !== "yd-esp32-s3" ||
                  !["memoryVariant", "boardRevision"].includes(key),
              )
              .map(([key, value]) => (
                <label key={key}>
                  {key}
                  <input
                    aria-label={`Property ${key}`}
                    min={parameterBounds[key]?.[0]}
                    max={parameterBounds[key]?.[1]}
                    step="any"
                    maxLength={1000}
                    type={typeof value === "number" ? "number" : "text"}
                    value={String(value)}
                    onChange={(event) =>
                      updateProperty(key, value, event.target.value)
                    }
                  />
                </label>
              ))}
          </div>
          <div className="property-section">
            <h4>PIN REFERENCE</h4>
            <div className="pin-reference">
              {catalog[part.kind].pins.map((pin) => (
                <span key={pin.id}>
                  <b>{pin.label}</b>
                  <small>{pin.electricalType}</small>
                </span>
              ))}
            </div>
          </div>
          <button className="delete-button" onClick={onDelete}>
            <Trash2 size={14} /> Delete component
          </button>
        </>
      ) : wire ? (
        <div className="property-section">
          <h3>Wire</h3>
          <label>
            Label
            <input
              aria-label="Wire label"
              maxLength={200}
              value={wire.label}
              onChange={(event) =>
                commit({
                  ...project,
                  wires: project.wires.map((connection) =>
                    connection.id === wire.id
                      ? { ...connection, label: event.target.value }
                      : connection,
                  ),
                })
              }
            />
          </label>
          <label>
            Color
            <input
              type="color"
              aria-label="Wire color"
              value={wire.color}
              onChange={(event) =>
                commit({
                  ...project,
                  wires: project.wires.map((connection) =>
                    connection.id === wire.id
                      ? { ...connection, color: event.target.value }
                      : connection,
                  ),
                })
              }
            />
          </label>
          <p className="muted">
            {wire.from.pinId} to {wire.to.pinId}
          </p>
          <button className="delete-button" onClick={onDelete}>
            <Trash2 size={14} /> Delete wire
          </button>
        </div>
      ) : (
        <div className="inspector-empty">
          <MousePointer2 size={30} />
          <h3>A closer look</h3>
          <p>
            Select a component or wire to view its properties and connections.
          </p>
        </div>
      )}
      <div className="phase-card">
        <span>PHASE 02</span>
        <strong>Design and run real firmware.</strong>
        <p>
          Load compiled AVR HEX to execute instructions in an isolated browser
          Worker.
        </p>
        <div>
          <Info size={13} /> Bounded resistive DC; educational mechanics
        </div>
      </div>
    </aside>
  );
}
