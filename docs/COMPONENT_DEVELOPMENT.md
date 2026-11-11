# Behavioral component development

Domain modules live in `src/models` and contain no React, Worker or Node imports. Their clock is absolute simulation microseconds; tests supply the clock explicitly. They never read wall time or parse Arduino source.

`contract.ts` defines `Pins`, `Contact`, `ModelSnapshot` and `ComponentModel.update(timeUs, pins)`. Pins contain resolved volts or null for floating/conflicting sources. Outputs contain voltage sources or null for high impedance. Contacts are bidirectional terminal pairs; geometric intersections have no electrical meaning.

`CircuitRuntime(project, target, factories)` is the circuit host. Optional factories are keyed by catalog kind and initialized with the component document. A factory returns a `ComponentModel`; its contacts, outputs, warnings and properties are integrated without changing the MCU engine. Example:

```ts
const runtime = new CircuitRuntime(project, 'uno', {
  relay: component => new MyRelayAdapter(component.properties),
});
runtime.advance(cpuTimeMicros, gpio, gpioTransitions);
```

Keep a new model in its own module, add its portable pin/default definition and a schema migration when introducing a new kind, then register its factory at composition. Public APIs use `/** ... */`, `@param`, and `@returns` comments. React adapters render snapshots only. New bus protocols require an explicit engine/bus adapter; implementing a visual alone does not enable MCU communication.

## Implemented models

| Device | Functional behavior | Approximation / restriction |
| --- | --- | --- |
| DS3231 | 0x68 I2C pointer/register reads/writes, BCD calendar, 12/24-hour conversion, leap days, century, alarm1/2 masks/flags, OSF, sampled SQW/32K | Address override is an educational nonphysical option; actual DS3231 address is fixed. Backup time persists without VCC but bus disconnects. Temperature is fixed 25°C; oscillator drift, busy/conversion and battery chemistry are not modeled. I2C is logical byte traffic, not analog open-drain waveform analysis. |
| CD74HC4067 / CD4067B | All 16 channels, active-low EN, four select lines, bidirectional voltage/contact routing, break-before-make delay | Separate HC 2–6V and B 3–18V single-supply profiles. Nominal 0.1/0.3µs delay and 70/125Ω are illustrative, not guaranteed datasheet corners. On resistance is displayed; no loaded analog network solution or dual supply. |
| DC motor | Signed winding current/torque, back EMF, exponential inertia/load response, speed, direction, angle, stall | Viscous-load, duty-averaged winding model; no inductance, heat, gearbox or encoder. Refuses direct GPIO drive. Powered ideal H-bridge is included, with explicit VM/VCC and logic pins; no specific L298N/TB6612 voltage-drop claims. |
| WS2812B | GRB edge decoding, 280µs reset/latch, 1–256 total pixels, brightness, chained DOUT offsets, malformed frame rejection, power estimate | Uno cycle-timestamped GPIO only. Every upstream strip must be powered. Supply/logic level validation is behavioral. Per-pixel estimates use ~20mA/channel, not a thermal/current solver. S3 and original ESP32 protocol decoding are disabled. |
| 5V relay module | Powered driver/coil estimate, configurable active polarity/3.3V compatibility, mechanical delay, isolated COM/NO/NC continuity, DC voltage warning | 4.5–5.5V module profile, deterministic contacts without bounce/arc/coil inductance. Current rating is metadata: load current safety cannot be established without a load solver. Mains and bare-coil drive are unsupported. |

RTC output pins are open-drain sinks; an external pull-up is needed for a defined HIGH. The existing resistor path model is ideal and cannot solve a loaded pull-up current. Unsupported/floating states stay explicit. AVR input feedback uses resolved thresholds; an undriven input falls back to the MCU's pull-up or deterministic LOW, which is not a physical assertion about a floating voltage. S3 feedback is sampled; no timing-critical external bus claims.

## Tests and wiring

Use `npm.cmd test -- src/models` for unit/circuit/real AVR fixture integration checks. Runtime GPIO hooks propagate Uno contact/mux outputs synchronously at MCU pin changes; mechanical time advances at CPU snapshot boundaries as well. Reset/stop-restart reconstruct volatile component state. The RTC initial epoch and properties serialize; live volatile device state is not saved as firmware state.

DS3231 Uno: VCC→5V, GND→GND, SDA→A4, SCL→A5. Select the RTC to inspect live time. Motor: board logic → H-bridge IN1/IN2/EN, power → VM and VCC, OUT1/OUT2 → motor POS/NEG, common ground. Relay contacts and mux COM/Cn are separate signal paths. WS2812: VDD/GND power, Uno output→DIN; DOUT→next DIN, configured counts must match transmitted GRB words.

References: [DS3231 datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/DS3231.pdf), [TI CD74HC4067](https://www.ti.com/product/CD74HC4067), [TI CD4067B](https://www.ti.com/product/CD4067B).
