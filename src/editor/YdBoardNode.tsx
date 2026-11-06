import { useLayoutEffect, useState } from "react";
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react";
import type { CircuitComponent } from "../circuit/types";
import { ydBoard, boardPinTooltip } from "../boards/yd-esp32-s3";
import { boardSvgTransform, getBoardGeometry } from "./boardGeometry";
export interface YdBoardNodeProps {
  part: CircuitComponent;
  selected?: boolean;
  onBootChange?: (pressed: boolean) => void;
  onReset?: () => void;
}
const directions = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};
/** @brief Metric-scaled manufacturer-family drawing. Exact V1.3 revision equivalence remains unconfirmed.
 * @details Artwork and physical terminals use the same10unit/mm geometry and quarter-turn transform. RGB has no fabricated state.
 */
export function YdBoardNode({
  part,
  selected = false,
  onBootChange,
  onReset,
}: YdBoardNodeProps) {
  const geometry = getBoardGeometry(part.rotation),
    base = getBoardGeometry(0),
    update = useUpdateNodeInternals();
  const [hovered, setHovered] = useState<string>();
  useLayoutEffect(() => {
    update(part.id);
  }, [part.id, part.rotation, update]);
  const variant = String(part.properties.memoryVariant ?? "unconfirmed");
  const buttonStyle = {
    width: "100%",
    height: "100%",
    padding: 0,
    border: "1px solid #83978e",
    borderRadius: 3,
    background: "#354943",
    color: "#d8e8db",
    fontSize: 8,
    cursor: "pointer",
  };
  return (
    <div
      className={`yd-board-node ${selected ? "selected" : ""}`}
      data-testid={`part-${part.id}`}
      data-board-rotation={part.rotation}
      style={{
        width: geometry.width,
        height: geometry.height,
        position: "relative",
        outline: selected ? "2px solid #65bba4" : "none",
        outlineOffset: 7,
        borderRadius: 8,
      }}
    >
      <svg
        width={geometry.width}
        height={geometry.height}
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        role="img"
        aria-label={`${ydBoard.name} development board,44 physical header pins`}
        style={{
          display: "block",
          overflow: "visible",
          filter: "drop-shadow(0 5px 5px #17352a22)",
        }}
      >
        <defs>
          <linearGradient id={`shield-${part.id}`}>
            <stop stopColor="#a8b4ae" />
            <stop offset=".5" stopColor="#e4e6df" />
            <stop offset="1" stopColor="#b9c2bb" />
          </linearGradient>
        </defs>
        <g transform={boardSvgTransform(part.rotation)}>
          <rect
            x="0"
            y="62.4"
            width="279.4"
            height="571.5"
            rx="9"
            fill="#25373b"
            stroke="#13282b"
            strokeWidth="2"
          />
          <path d="M24 76H255M25 621H254" stroke="#4f7465" strokeWidth="1" />
          <rect
            x="49.7"
            y="0"
            width="180"
            height="248"
            rx="3"
            fill="#243433"
            stroke="#809388"
          />
          <path
            d="M61 52V14H80V44H99V14H118V44H137V14H156V44H175V14H194V44H215"
            fill="none"
            stroke="#baaa76"
            strokeWidth="4"
          />
          <rect
            x="49.7"
            y="67"
            width="180"
            height="181"
            rx="4"
            fill={`url(#shield-${part.id})`}
            stroke="#87988e"
          />
          <g fill="#65746c" textAnchor="middle" fontFamily="monospace">
            <text x="139.7" y="111" fontSize="11" fontWeight="700">
              ESPRESSIF
            </text>
            <text x="139.7" y="137" fontSize="12">
              ESP32-S3-WROOM-1
            </text>
            <text x="139.7" y="161" fontSize="9">
              XTENSA LX7 / 2 CORES
            </text>
            <text x="139.7" y="194" fontSize="8">
              MODULE: VERIFY MARKING
            </text>
            <text x="139.7" y="224" fontSize="7">
              YD FAMILY REFERENCE
            </text>
          </g>
          <rect
            x="66"
            y="273"
            width="54"
            height="25"
            fill="#a3b5a5"
            stroke="#c9d5ca"
          />
          <rect x="75" y="279" width="36" height="13" fill="#4d6153" />
          <rect
            x="74"
            y="309"
            width="40"
            height="62"
            rx="2"
            fill="#17272c"
            stroke="#719285"
            strokeDasharray="3 3"
          />
          <rect x="124" y="324" width="17" height="38" fill="#7e9584" />
          <rect
            x="182"
            y="276"
            width="40"
            height="32"
            rx="3"
            fill="#98aa9f"
            stroke="#ccd8cb"
          />
          <circle cx="202" cy="292" r="10" fill="#34564b" stroke="#6c8c7d" />
          <rect
            x="182"
            y="327"
            width="40"
            height="32"
            rx="3"
            fill="#98aa9f"
            stroke="#ccd8cb"
          />
          <circle cx="202" cy="343" r="10" fill="#34564b" stroke="#6c8c7d" />
          <g fill="#9db6a7" fontFamily="monospace" fontSize="8">
            <text x="225" y="295">
              RST
            </text>
            <text x="223" y="347">
              BOOT
            </text>
          </g>
          <rect x="67" y="385" width="56" height="25" fill="#b0beae" />
          <rect x="76" y="391" width="38" height="13" fill="#5c6d58" />
          <circle cx="86" cy="454" r="25" fill="#9bafa0" stroke="#d1d9c8" />
          <circle cx="86" cy="454" r="20" fill="#3b5950" />
          <rect
            x="120"
            y="421"
            width="17"
            height="22"
            rx="2"
            fill="#cdd9ca"
            stroke="#97aa9a"
          />
          <rect x="125" y="426" width="7" height="12" fill="#8b9e93" />
          <text
            x="118"
            y="415"
            fill="#9fb8a8"
            fontFamily="monospace"
            fontSize="7"
          >
            RGB48
          </text>
          {[169, 195, 221].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y="421"
                width="8"
                height="19"
                rx="1"
                fill="#8ba295"
                stroke="#bed0bf"
              />
              <text
                x={x + 4}
                y="450"
                textAnchor="middle"
                fontFamily="monospace"
                fontSize="6"
                fill="#88a394"
              >
                {["PWR", "TX", "RX"][i]}
              </text>
            </g>
          ))}
          <rect
            x="177"
            y="476"
            width="48"
            height="49"
            rx="2"
            fill="#17262c"
            stroke="#778f82"
            strokeDasharray="3 3"
          />
          <text
            x="201"
            y="505"
            textAnchor="middle"
            fill="#9db1a2"
            fontFamily="monospace"
            fontSize="8"
          >
            CH343P
          </text>
          <path
            d="M113 355H151V385H165M139 451V478H163M229 484V463H241"
            fill="none"
            stroke="#4c6c60"
          />
          <g fill="#93a58f">
            {[54, 78, 102].map((x) => (
              <rect key={x} x={x} y="495" width="11" height="28" rx="1" />
            ))}
          </g>
          {[40, 151].map((x, i) => (
            <g key={x}>
              <rect
                x={x}
                y="546"
                width="87"
                height="83"
                rx="5"
                fill="#b4c1b9"
                stroke="#849d8e"
                strokeWidth="2"
              />
              <rect
                x={x + 10}
                y="597"
                width="67"
                height="18"
                rx="8"
                fill="#243d39"
                stroke="#d5dfd2"
              />
              <rect x={x + 29} y="603" width="30" height="5" fill="#91a894" />
              <text
                x={x + 43}
                y="540"
                textAnchor="middle"
                fill="#92ac9d"
                fontSize="7"
                fontFamily="monospace"
              >
                USB-C {i + 1}
              </text>
            </g>
          ))}
          {base.pins.map((attachment) => {
            const pin = ydBoard.pins.find((p) => p.id === attachment.id)!;
            const left = pin.side === "left";
            return (
              <g key={pin.id}>
                <title>{boardPinTooltip(pin, variant)}</title>
                <rect
                  x={attachment.x - 5}
                  y={attachment.y - 5}
                  width="10"
                  height="10"
                  rx="1"
                  fill={hovered === pin.id ? "#70d5a6" : "#a8b891"}
                  stroke="#d5dfb9"
                />
                <text
                  x={left ? 29 : 250.4}
                  y={attachment.y + 3}
                  textAnchor={left ? "start" : "end"}
                  fill={hovered === pin.id ? "#a7f2cc" : "#c3d9c8"}
                  fontFamily="monospace"
                  fontSize="9"
                >
                  {pin.label}
                </text>
              </g>
            );
          })}
          {onReset && (
            <foreignObject x="182" y="276" width="40" height="32">
              <button
                className="nodrag nopan"
                type="button"
                aria-label="Reset ESP32-S3"
                style={buttonStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                }}
              >
                RST
              </button>
            </foreignObject>
          )}
          {onBootChange && (
            <foreignObject x="182" y="327" width="40" height="32">
              <button
                className="nodrag nopan"
                type="button"
                aria-label="Hold ESP32-S3 BOOT"
                style={buttonStyle}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onBootChange(true);
                }}
                onPointerUp={() => onBootChange(false)}
                onPointerCancel={() => onBootChange(false)}
                onPointerLeave={() => onBootChange(false)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    onBootChange(true);
                  }
                }}
                onKeyUp={() => onBootChange(false)}
                onBlur={() => onBootChange(false)}
              >
                BOOT
              </button>
            </foreignObject>
          )}
        </g>
      </svg>
      {geometry.pins.map((attachment) => {
        const pin = ydBoard.pins.find((p) => p.id === attachment.id)!;
        return (
          <Handle
            key={pin.id}
            id={pin.id}
            type="source"
            position={directions[attachment.direction]}
            title={boardPinTooltip(pin, variant)}
            aria-label={`${part.label} ${pin.id} ${pin.label}${pin.gpio !== null ? " GPIO" + pin.gpio : ""}`}
            data-testid={`pin-${part.id}-${pin.id}`}
            onMouseEnter={() => setHovered(pin.id)}
            onMouseLeave={() => setHovered(undefined)}
            style={{
              left: attachment.x,
              top: attachment.y,
              right: "auto",
              bottom: "auto",
              transform: "translate(-50%,-50%)",
              width: 12,
              height: 12,
              border: "2px solid #e1e9ce",
              borderRadius: 2,
              background: hovered === pin.id ? "#69d5a9" : "#496b54",
              zIndex: 5,
            }}
          />
        );
      })}
    </div>
  );
}
