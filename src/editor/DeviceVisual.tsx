import { ExpandedDeviceVisual } from "./ExpandedDeviceVisual";
import type { CircuitComponent } from "../circuit/types";
import type { ModelSnapshot } from "../models/contract";
/** @brief SVG device artwork reflects actual behavioral snapshots; never generates simulated output. */
export function DeviceVisual({
  part,
  state,
}: {
  part: CircuitComponent;
  state?: ModelSnapshot;
}) {
  const v = state?.values ?? {},
    kind = part.kind;
  if (
    !["ds3231", "mux4067", "dc-motor", "ws2812", "relay", "h-bridge"].includes(
      kind,
    )
  )
    return <ExpandedDeviceVisual part={part} state={state} />;
  return (
    <div className="device-visual">
      <svg viewBox="0 0 180 90" role="img" aria-label={`${part.label} device`}>
        <rect
          x="5"
          y="5"
          width="170"
          height="80"
          rx="8"
          fill={
            kind === "relay"
              ? "#235998"
              : kind === "ds3231"
                ? "#294f99"
                : "#167768"
          }
        />
        {[15, 165].flatMap((x) =>
          [15, 75].map((y) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#d2bd79" />
          )),
        )}
        {kind === "dc-motor" ? (
          <g
            transform={`rotate(${(Number(v.angle ?? 0) * 180) / Math.PI} 90 45)`}
          >
            <circle cx="90" cy="45" r="30" fill="#b8c4cc" />
            <path d="M90 20V70M65 45H115" stroke="#37434a" strokeWidth="7" />
            <circle cx="90" cy="45" r="7" fill="#e1cb79" />
          </g>
        ) : kind === "ws2812" ? (
          <>
            {String(v.colors ?? "#000000")
              .split(",")
              .slice(0, 8)
              .map((color, i) => (
                <rect
                  key={i}
                  x={20 + i * 18}
                  y="30"
                  width="15"
                  height="26"
                  rx="4"
                  fill={color}
                  stroke="#fff"
                />
              ))}
          </>
        ) : kind === "relay" ? (
          <>
            <rect x="35" y="20" width="70" height="50" fill="#368ce4" />
            <path
              d={v.energized ? "M110 60L150 25" : "M110 60L145 50"}
              stroke="#ffe7a3"
              strokeWidth="4"
            />
            <circle
              cx="145"
              cy="70"
              r="5"
              fill={v.energized ? "#7dff78" : "#38454c"}
            />
          </>
        ) : (
          <>
            <rect x="55" y="20" width="70" height="50" rx="3" fill="#14232b" />
            <text x="90" y="49" textAnchor="middle" fill="#fff" fontSize="10">
              {kind === "ds3231"
                ? "DS3231"
                : kind === "mux4067"
                  ? `CH ${v.channel ?? "—"}`
                  : "H-BRIDGE"}
            </text>
          </>
        )}
      </svg>
      <output>
        {kind === "ds3231"
          ? String(v.iso ?? "RTC awaiting simulation")
          : kind === "dc-motor"
            ? `${Number(v.rpm ?? 0).toFixed(0)} RPM · ${Number(v.currentA ?? 0).toFixed(3)} A`
            : kind === "relay"
              ? v.energized
                ? "ENERGIZED · COM → NO"
                : "COM → NC"
              : kind === "mux4067"
                ? `Channel ${v.channel ?? "open"} · ${v.value ?? "floating"} V`
                : kind === "ws2812"
                  ? String(v.colors ?? "Awaiting timed data")
                  : v.enabled
                    ? "DRIVER ON"
                    : "DRIVER OFF"}
      </output>
    </div>
  );
}
