import type { CircuitComponent } from "../circuit/types";
import type { ModelSnapshot } from "../models/contract";
import { catalog } from "../circuit/catalog";
/** @brief SVG view of model snapshots. Scene artwork never drives motors or creates sensor measurements. */
export function ExpandedDeviceVisual({
  part,
  state,
}: {
  part: CircuitComponent;
  state?: ModelSnapshot;
}) {
  const v = state?.values ?? {},
    kind = part.kind,
    isArm = [
      "arm-6dof",
      "universal-arm",
      "dobot-magician",
      "uarm-metal",
    ].includes(kind),
    angle = Number(v.angleDeg ?? 0),
    powered = v.powered === true || v.enabled === true;
  const meter = kind === "voltmeter" || kind === "ammeter",
    reading = v[kind === "voltmeter" ? "voltageV" : "currentA"];
  const status = meter
    ? `${typeof reading === "number" ? reading.toFixed(kind === "voltmeter" ? 3 : 5) : "�"} ${kind === "voltmeter" ? "V" : "A"} � ${v.status ?? "awaiting simulation"}`
    : isArm
      ? `Tool (${Number(v.toolX ?? 0).toFixed(0)}, ${Number(v.toolY ?? 0).toFixed(0)}, ${Number(v.toolZ ?? 0).toFixed(0)}) mm`
      : kind === "dht22"
        ? `${v.temperatureC ?? part.properties.temperatureC} �C � ${v.humidityPct ?? part.properties.humidityPct}% RH`
        : kind === "hx711"
          ? `${v.channel ?? "A"} gain ${v.gain ?? 128} � ${v.ready ? "READY" : v.powerDown ? "POWER DOWN" : "CONVERTING"}`
          : kind === "ir-emitter"
            ? v.emitting
              ? "IR EMITTING"
              : "IR OFF"
            : kind === "ir-detector"
              ? v.detected
                ? "BEAM DETECTED"
                : "BEAM CLEAR / ABSENT"
              : kind === "conveyor"
                ? `${Number(v.speedMps ?? 0).toFixed(2)} m/s � ${Number(v.distanceM ?? 0).toFixed(2)} m`
                : kind === "robotic-car"
                  ? `(${Number(v.xM ?? 0).toFixed(2)}, ${Number(v.yM ?? 0).toFixed(2)}) m � ${Number(v.headingRad ?? 0).toFixed(2)} rad`
                  : kind === "electromagnetic-switch"
                    ? `${v.energized ? "COIL ON ? NO" : "COIL OFF ? NC"} � ${Number(v.coilCurrentA ?? 0).toFixed(3)} A`
                    : ["nano", "mega2560"].includes(kind)
                      ? kind === "nano"
                        ? "ATmega328P � A6/A7 ADC-only unsupported"
                        : "ATmega2560 � native D0�53/A0�15"
                      : `${angle.toFixed(1)}� � ${powered ? "POWERED" : "OFF"}`;
  const r = Math.PI / 180,
    a = Number(v.joint2Deg ?? 0) * r,
    b = a + Number(v.joint3Deg ?? 0) * r,
    x1 = 50 + 48 * Math.cos(a),
    y1 = 70 - 36 * Math.sin(a),
    x2 = x1 + 45 * Math.cos(b),
    y2 = y1 - 32 * Math.sin(b);
  return (
    <div className="device-visual">
      <svg
        viewBox="0 0 180 90"
        role="img"
        aria-label={`${part.label} live device`}
      >
        <rect
          x="5"
          y="5"
          width="170"
          height="80"
          rx="8"
          fill={meter ? "#26383e" : "#176b62"}
          stroke="#7eaaa4"
        />
        {meter ? (
          <>
            <rect x="20" y="18" width="140" height="40" rx="4" fill="#d3e5ce" />
            <text
              x="90"
              y="45"
              textAnchor="middle"
              fill="#173a2d"
              fontSize="20"
            >
              {typeof reading === "number" ? reading.toFixed(3) : "�"}
            </text>
            <text x="90" y="76" textAnchor="middle" fill="#fff" fontSize="12">
              {kind === "voltmeter" ? "V DC � HIGH Z" : "A DC � SERIES SHUNT"}
            </text>
          </>
        ) : isArm ? (
          <>
            <path d="M25 78H70" stroke="#b3c6cf" strokeWidth="8" />
            <path
              d={`M50 70L${x1} ${y1}L${x2} ${y2}`}
              fill="none"
              stroke={kind === "universal-arm" ? "#9cc8ef" : "#f4b35b"}
              strokeWidth="10"
              strokeLinecap="round"
            />
            {[
              [50, 70],
              [x1, y1],
              [x2, y2],
            ].map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="7"
                fill="#263d4d"
                stroke="#b6c9d3"
              />
            ))}
            <path
              d={`M${x2} ${y2}l10 -5m-10 5l10 5`}
              stroke="#fff"
              strokeWidth="3"
            />
            <text x="95" y="17" fill="#fff" fontSize="8">
              APPROXIMATE PROFILE
            </text>
          </>
        ) : ["servo", "stepper", "stepper-driver"].includes(kind) ? (
          <>
            <circle cx="90" cy="45" r="28" fill="#9caab2" />
            <g transform={`rotate(${angle} 90 45)`}>
              <rect
                x="84"
                y="14"
                width="12"
                height="62"
                rx="5"
                fill="#e6c87d"
              />
              <circle cx="90" cy="45" r="7" fill="#3c444c" />
            </g>
          </>
        ) : kind === "conveyor" ? (
          <>
            <rect
              x="20"
              y="29"
              width="140"
              height="35"
              rx="17"
              fill="#233c47"
              stroke="#bdcbd2"
              strokeWidth="4"
            />
            {Array.from({ length: 7 }, (_, i) => (
              <path
                key={i}
                d={`M${25 + (i * 20 + ((Number(v.distanceM ?? 0) * 100) % 20))} 33v27`}
                stroke="#76949e"
                strokeWidth="2"
              />
            ))}
          </>
        ) : kind === "robotic-car" ? (
          <g
            transform={`rotate(${(Number(v.headingRad ?? 0) * 180) / Math.PI} 90 45)`}
          >
            <rect x="46" y="22" width="88" height="46" rx="12" fill="#e0b85d" />
            {[55, 110].flatMap((x) =>
              [15, 65].map((y) => (
                <rect
                  key={`${x}-${y}`}
                  x={x}
                  y={y}
                  width="22"
                  height="12"
                  rx="3"
                  fill="#182b33"
                />
              )),
            )}
            <path
              d="M100 45h25m-8 -7l8 7l-8 7"
              stroke="#fff"
              fill="none"
              strokeWidth="3"
            />
          </g>
        ) : kind === "ir-emitter" || kind === "ir-detector" ? (
          <>
            <circle
              cx="65"
              cy="45"
              r="20"
              fill={v.emitting || v.detected ? "#ff6374" : "#344953"}
            />
            <path
              d="M95 30q30 15 0 30m10 -38q45 23 0 46"
              fill="none"
              stroke={v.emitting || v.detected ? "#ff8893" : "#63808d"}
              strokeWidth="3"
            />
          </>
        ) : kind === "electromagnetic-switch" ? (
          <>
            <path
              d="M25 55q8 -45 16 0q8 -45 16 0q8 -45 16 0"
              fill="none"
              stroke={v.energized ? "#ffbd70" : "#bd8d65"}
              strokeWidth="4"
            />
            <path
              d={v.energized ? "M100 65L150 25" : "M100 65L145 50"}
              stroke="#eee0b4"
              strokeWidth="4"
            />
            <text x="90" y="78" textAnchor="middle" fill="#fff" fontSize="8">
              ISOLATED COIL / CONTACTS
            </text>
          </>
        ) : (
          <>
            <rect x="45" y="21" width="90" height="47" rx="4" fill="#1a2c35" />
            <text x="90" y="47" textAnchor="middle" fill="#fff" fontSize="12">
              {kind.toUpperCase()}
            </text>
            <circle
              cx="146"
              cy="27"
              r="5"
              fill={powered ? "#8eee96" : "#38505d"}
            />
          </>
        )}
      </svg>
      <output title={state?.warnings.join("\n")}>{status}</output>
    </div>
  );
}
