import { YdBoardNode } from "./YdBoardNode";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

import { catalog } from "../circuit/catalog";

import type { CircuitComponent } from "../circuit/types";
import { DeviceVisual } from "./DeviceVisual";
import type { ModelSnapshot } from "../models/contract";

export type PartNode = Node<
  {
    part: CircuitComponent;
    deviceState?: ModelSnapshot;
    ledState?: boolean | null;
    buttonPressed?: boolean;
    onButtonChange?: (pressed: boolean) => void;
    onBootChange?: (pressed: boolean) => void;
    onReset?: () => void;
  },
  "part"
>;

/** @brief Reusable visual adapter; pins use stable catalog IDs, never visual coordinates. */

export function ComponentNode({ data, selected }: NodeProps<PartNode>) {
  const c = data.part;
  if (c.kind === "yd-esp32-s3")
    return (
      <YdBoardNode
        part={c}
        selected={selected}
        onBootChange={data.onBootChange}
        onReset={data.onReset}
      />
    );
  const definition = catalog[c.kind];
  const junction = c.kind === "junction";
  const device = ![
    "uno",
    "led",
    "resistor",
    "switch",
    "tactile-switch",
    "junction",
  ].includes(c.kind);
  return (
    <div
      className={`part part-${c.kind} ${selected ? "selected" : ""}`}
      style={
        device
          ? {
              minHeight: Math.max(
                205,
                90 + Math.ceil(catalog[c.kind].pins.length / 2) * 20,
              ),
              width: 235,
            }
          : undefined
      }
      data-testid={`part-${c.id}`}
      data-led-state={
        c.kind === "led"
          ? data.ledState === true
            ? "on"
            : data.ledState === false
              ? "off"
              : "unknown"
          : undefined
      }
    >
      {junction ? (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="J"
            aria-label={`${c.label} J`}
            data-testid={`pin-${c.id}-J`}
          />
          <span className="junction-dot" />
        </>
      ) : (
        <>
          <div className="part-heading">
            <span>{c.kind === "uno" ? "ARDUINO" : c.label}</span>
            <span className="part-code">
              {c.kind === "uno" ? "UNO R3" : c.kind.toUpperCase()}
            </span>
          </div>
          <div className="part-art">
            {device ? (
              <DeviceVisual part={c} state={data.deviceState} />
            ) : c.kind === "uno" ? (
              <>
                <span className="usb-port" />
                <span className="board-logo">
                  &infin;<small>UNO</small>
                </span>
                <span className="chip">ATMEGA328P</span>
                <span className="board-led" />
              </>
            ) : c.kind === "led" ? (
              <span
                className={`led-bulb ${data.ledState === true ? "led-on" : ""}`}
              />
            ) : c.kind === "resistor" ? (
              <span className="resistor-body">
                <i />
                <i />
                <i />
                <i />
              </span>
            ) : (
              <button
                className="switch-body nodrag"
                aria-label={`Press button ${c.label}`}
                aria-pressed={data.buttonPressed ?? false}
                disabled={!data.onButtonChange}
                onPointerDown={() => data.onButtonChange?.(true)}
                onPointerUp={() => data.onButtonChange?.(false)}
                onPointerLeave={() => data.onButtonChange?.(false)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    data.onButtonChange?.(true);
                  }
                }}
                onKeyUp={() => data.onButtonChange?.(false)}
                onBlur={() => data.onButtonChange?.(false)}
              />
            )}
          </div>
          <div className="pins">
            {definition.pins.map((pin, i) => {
              const left = i < Math.ceil(definition.pins.length / 2);
              const row = left ? i : i - Math.ceil(definition.pins.length / 2);
              return (
                <div
                  key={pin.id}
                  className={`pin-label ${left ? "left" : "right"} ${c.kind === "mux4067" && pin.id === `C${data.deviceState?.values.channel}` ? "active-channel" : ""}`}
                  style={{ top: 67 + row * 20 }}
                >
                  <Handle
                    type="source"
                    position={left ? Position.Left : Position.Right}
                    id={pin.id}
                    style={{ top: 10 }}
                    aria-label={`${c.label} ${pin.label}`}
                    data-testid={`pin-${c.id}-${pin.id}`}
                  />
                  {pin.label}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
