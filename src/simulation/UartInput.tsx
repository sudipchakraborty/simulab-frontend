import { useState } from "react";
import { Send } from "lucide-react";
import type { SimulationController } from "./useSimulation";
export const blinkProgram =
  "from machine import Pin,Timer\nled=Pin(4,Pin.OUT)\ndef tick(timer):\n led.value(1-led.value())\n print('BLINK='+str(led.value()))\ntimer=Timer(0)\ntimer.init(period=250,mode=Timer.PERIODIC,callback=tick)";
export const buttonProgram =
  "from machine import Pin,Timer\nbutton=Pin(5,Pin.IN,Pin.PULL_UP)\ndef tick(timer):\n print('BUTTON='+str(button.value()))\nmonitor=Timer(1)\nmonitor.init(period=100,mode=Timer.PERIODIC,callback=tick)";
/** @brief Send UART bytes to real guest firmware. Sample programs require the MicroPython reference image. */
export function UartInput({
  simulation,
}: {
  simulation: SimulationController;
}) {
  const [text, setText] = useState("");
  const enabled =
    simulation.target === "esp32s3" && simulation.status === "running";
  return (
    <div className="uart-input">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          simulation.sendUART(text);
          setText("");
        }}
      >
        <input
          aria-label="UART command"
          value={text}
          maxLength={4095}
          placeholder={
            simulation.target === "esp32s3"
              ? "Send a line to guest firmware (MicroPython REPL supported)"
              : "UART RX unavailable for Uno adapter"
          }
          disabled={!enabled}
          onChange={(e) => setText(e.target.value)}
        />
        <button aria-label="Send UART command" disabled={!enabled}>
          <Send size={12} />
        </button>
      </form>
      {simulation.target === "esp32s3" && (
        <div>
          <button
            disabled={!enabled}
            onClick={() =>
              simulation.sendUART("exec(" + JSON.stringify(blinkProgram) + ")")
            }
          >
            Send GPIO4 blink program
          </button>
          <button
            disabled={!enabled}
            onClick={() =>
              simulation.sendUART("exec(" + JSON.stringify(buttonProgram) + ")")
            }
          >
            Send GPIO5 button monitor
          </button>
          <span>
            Examples run inside MicroPython firmware; not host-side simulation.
          </span>
        </div>
      )}
    </div>
  );
}
