import { RotateCw } from "lucide-react";
import type { CircuitComponent } from "../circuit/types";
import { ydBoard } from "../boards/yd-esp32-s3";
/** @brief Board-specific metadata stays outside generic property editing and CPU execution. */
export function BoardDetails({
  part,
  onChange,
}: {
  part: CircuitComponent;
  onChange: (patch: Partial<CircuitComponent>) => void;
}) {
  return (
    <div className="board-details">
      <h4>ESP32-S3 / XTENSA LX7</h4>
      <p>
        44 headers / 22 per side
        <br />
        RGB: GPIO48 / BOOT: GPIO0
      </p>
      <label>
        Memory profile
        <select
          aria-label="Board memory profile"
          value={String(part.properties.memoryVariant ?? "unconfirmed")}
          onChange={(e) =>
            onChange({
              properties: { ...part.properties, memoryVariant: e.target.value },
            })
          }
        >
          <option value="unconfirmed">Unconfirmed module</option>
          <option value="N16R8">N16R8: 16 MB flash / 8 MB PSRAM</option>
        </select>
      </label>
      <p className="board-confirmation">
        Manufacturer family pinout verified. Exact V1.3 revision and installed
        module require confirmation.{" "}
        {part.properties.memoryVariant === "N16R8"
          ? "GPIO35/36/37 are reserved by octal PSRAM."
          : ""}
      </p>
      <button
        aria-label="Rotate board clockwise"
        onClick={() => onChange({ rotation: (part.rotation + 90) % 360 })}
      >
        <RotateCw size={13} /> Rotate {part.rotation} degrees
      </button>
      <p className="muted">
        Graphics: available
        <br />
        Firmware: real boot validated
        <br />
        GPIO / UART: validated
        <br />
        RGB / I2C: unsupported
      </p>
      <small>
        {ydBoard.dimensionsMm
          ? `${ydBoard.dimensionsMm.width} x ${ydBoard.dimensionsMm.height} mm overall / manufacturer family`
          : "PCB dimensions require confirmation; drawing is illustrative. Browser reference reports 4 MiB flash; full N16R8 flash emulation is unavailable."}
      </small>
    </div>
  );
}
