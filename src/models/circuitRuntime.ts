import { isMcuKind, boardI2cPins } from "../circuit/boardRegistry";
import { solveDc, type DcBranch } from "./dcSolver";
import { OpticalChannel } from "./robotics";
import { createExpandedModel } from "./factory";
import { catalog } from "../circuit/catalog";
import { buildNets, endpointKey } from "../circuit/netlist";
import type { CircuitProject, CircuitComponent } from "../circuit/types";
import { ydBoard } from "../boards/yd-esp32-s3";
import { Ds3231 } from "./ds3231";
import { Mux4067 } from "./mux4067";
import { DcMotor } from "./motor";
import { RelayModule } from "./relay";
import { Ws2812 } from "./ws2812";
import {
  checkTime,
  type ModelSnapshot,
  type Pins,
  type ComponentModel,
} from "./contract";
const empty = (): ModelSnapshot => ({
  values: {},
  warnings: [],
  contacts: [],
  outputs: {},
});
/** @brief Parameter-initialized circuit host: explicit nets, bounded ideal contacts and voltage sources.
 * @details This is a behavioral voltage propagation model, a bounded linear DC resistor/shunt solver; nonlinear/transient analog circuits are unsupported.
 */
export class CircuitRuntime {
  private models = new Map<
    string,
    Ds3231 | Mux4067 | DcMotor | RelayModule | Ws2812
  >();
  private states: Record<string, ModelSnapshot> = {};
  private pins: Record<string, Record<string, number | null>> = {};
  private netOf = new Map<string, string>();
  private time = 0;
  private gpio: Record<string, 0 | 1 | null> = {};
  private powered = new Set<string>();
  readonly transactions: {
    timeUs: number;
    address: number;
    direction: string;
    bytes: number[];
    ack: boolean;
  }[] = [];
  private wsSources = new Map<string, string>();
  private wsChains = new Map<string, string[]>();
  private extensions = new Map<string, ComponentModel>();
  private optical = new OpticalChannel();
  private dcCurrents: Record<string, number | null> = {};
  private dcIssues: string[] = [];
  constructor(
    readonly project: CircuitProject,
    readonly target: "uno" | "nano" | "mega2560" | "esp32s3",
    factories: Readonly<
      Record<string, (component: CircuitComponent) => ComponentModel>
    > = {},
  ) {
    this.project = structuredClone(project);
    for (const c of project.components) {
      if (factories[c.kind]) {
        this.extensions.set(c.id, factories[c.kind](c));
        this.states[c.id] = empty();
        continue;
      }
      const extension = createExpandedModel(c, this.optical);
      if (extension) {
        this.extensions.set(c.id, extension);
        this.states[c.id] = empty();
        continue;
      }
      if (["voltmeter", "ammeter"].includes(c.kind))
        this.states[c.id] = empty();
      const p = { ...catalog[c.kind].defaultProperties, ...c.properties };
      if (c.kind === "ds3231")
        this.models.set(
          c.id,
          new Ds3231({ epoch: String(p.epoch), address: Number(p.address) }),
        );
      if (c.kind === "mux4067")
        this.models.set(c.id, new Mux4067(String(p.variant) as "HC" | "B"));
      if (c.kind === "dc-motor")
        this.models.set(
          c.id,
          new DcMotor({
            ratedVoltage: Number(p.ratedVoltage),
            ratedRpm: Number(p.ratedRpm),
            resistance: Number(p.resistance),
            inertia: Number(p.inertia),
            load: Number(p.load),
          }),
        );
      if (c.kind === "relay")
        this.models.set(
          c.id,
          new RelayModule({
            activeLow: p.activeLow === true,
            logic3v3: p.logic3v3 === true,
            delayUs: Number(p.delayUs),
            ratingV: Number(p.ratingV),
            ratingA: Number(p.ratingA),
          }),
        );
      if (c.kind === "ws2812") {
        const nets = buildNets(project),
          net = (id: string, pin: string) =>
            nets.find((n) =>
              n.endpoints.some((e) => e.componentId === id && e.pinId === pin),
            );
        let upstream = c,
          offset = 0;
        const seen = new Set([c.id]);
        while (true) {
          const n = net(upstream.id, "DIN");
          const previous = project.components.find(
            (part) =>
              part.kind === "ws2812" &&
              n?.endpoints.some(
                (e) => e.componentId === part.id && e.pinId === "DOUT",
              ),
          );
          if (!previous) break;
          if (seen.has(previous.id))
            throw new Error("WS2812 chain forms a loop");
          seen.add(previous.id);
          offset += Number(previous.properties.count ?? 1);
          upstream = previous;
        }
        this.wsSources.set(c.id, upstream.id);
        this.wsChains.set(c.id, [...seen]);
        this.models.set(
          c.id,
          new Ws2812(Number(p.count), Number(p.brightness), offset),
        );
      }
      if (this.models.has(c.id) || c.kind === "h-bridge")
        this.states[c.id] = empty();
    }
    this.resolve();
  }
  private key(c: string, p: string) {
    return endpointKey({ componentId: c, pinId: p });
  }
  private resolve() {
    const parent = new Map<string, string>();
    for (const c of this.project.components)
      for (const p of catalog[c.kind].pins) {
        const k = this.key(c.id, p.id);
        parent.set(k, k);
      }
    const root = (k: string): string => {
      const p = parent.get(k);
      return !p || p === k ? k : root(p);
    };
    const join = (a: string, b: string) => parent.set(root(a), root(b));
    for (const n of buildNets(this.project))
      for (const e of n.endpoints.slice(1))
        join(endpointKey(n.endpoints[0]), endpointKey(e));
    for (const c of this.project.components) {
      for (const [a, b] of this.states[c.id]?.contacts ?? [])
        join(this.key(c.id, a), this.key(c.id, b));
      if (c.kind === "switch" && c.properties.pressed === true)
        join(this.key(c.id, "1"), this.key(c.id, "2"));
      if (c.kind === "tactile-switch") {
        join(this.key(c.id, "1A"), this.key(c.id, "1B"));
        join(this.key(c.id, "2A"), this.key(c.id, "2B"));
        if (c.properties.pressed === true)
          join(this.key(c.id, "1A"), this.key(c.id, "2A"));
      }
    }
    this.netOf = new Map([...parent.keys()].map((k) => [k, root(k)]));
    const drivers = new Map<string, number[]>();
    const drive = (id: string, pin: string, v: number | null) => {
      if (v === null) return;
      const net = root(this.key(id, pin));
      drivers.set(net, [...(drivers.get(net) ?? []), v]);
    };
    for (const c of this.project.components) {
      if (isMcuKind(c.kind) && c.kind !== "yd-esp32-s3") {
        drive(c.id, "5V", 5);
        drive(c.id, "3V3", 3.3);
        drive(c.id, "GND", 0);
        for (const [pin, v] of Object.entries(this.gpio))
          if (
            v !== null &&
            catalog[c.kind].pins.some(
              (p) =>
                p.id === pin &&
                ["bidirectional", "analog"].includes(p.electricalType),
            )
          )
            drive(c.id, pin, v * 5);
      }
      if (c.kind === "yd-esp32-s3")
        for (const p of ydBoard.pins) {
          if (p.electricalType === "ground") drive(c.id, p.id, 0);
          if (p.electricalType === "power")
            drive(c.id, p.id, p.label === "3V3" ? 3.3 : 5);
          if (p.gpio !== null && this.gpio[`GPIO${p.gpio}`] != null)
            drive(c.id, p.id, this.gpio[`GPIO${p.gpio}`]! * 3.3);
        }
      for (const [pin, v] of Object.entries(this.states[c.id]?.outputs ?? {}))
        drive(c.id, pin, v);
    }
    const nodes = [...new Set([...parent.keys()].map(root))],
      branches: DcBranch[] = [];
    for (const c of this.project.components) {
      if (c.kind === "resistor")
        branches.push({
          id: c.id,
          a: root(this.key(c.id, "1")),
          b: root(this.key(c.id, "2")),
          ohms: Number(c.properties.resistanceOhms ?? 220),
        });
      if (c.kind === "electromagnetic-switch")
        branches.push({
          id: c.id,
          a: root(this.key(c.id, "COIL_POS")),
          b: root(this.key(c.id, "COIL_NEG")),
          ohms: Number(c.properties.resistanceOhms ?? 70),
        });
      if (c.kind === "ammeter")
        branches.push({
          id: c.id,
          a: root(this.key(c.id, "POS")),
          b: root(this.key(c.id, "NEG")),
          ohms: Number(c.properties.shuntOhms ?? 0.1),
        });
    }
    const dc = solveDc(nodes, Object.fromEntries(drivers), branches);
    this.dcCurrents = dc.currents;
    this.dcIssues = dc.issues;
    this.pins = {};
    for (const c of this.project.components) {
      this.pins[c.id] = {};
      for (const p of catalog[c.kind].pins)
        this.pins[c.id][p.id] = dc.volts[root(this.key(c.id, p.id))] ?? null;
    }
  }

  private connected(c: string, p: string, boardPin: string) {
    const board = this.project.components.find(
      (c) => isMcuKind(c.kind) && c.kind !== "yd-esp32-s3",
    );
    return (
      !!board &&
      this.netOf.get(this.key(c, p)) ===
        this.netOf.get(this.key(board.id, boardPin))
    );
  }
  private supply(p: Pins, rail = "VCC", min = 2.3, max = 5.5) {
    return (
      typeof p[rail] === "number" &&
      p.GND === 0 &&
      p[rail]! >= min &&
      p[rail]! <= max
    );
  }
  private evaluate(timeUs: number) {
    this.resolve();
    this.powered.clear();
    for (const c of this.project.components.filter((c) =>
      ["stepper-driver", "ir-emitter"].includes(c.kind),
    )) {
      const m = this.extensions.get(c.id);
      if (m) this.states[c.id] = m.update(timeUs, this.pins[c.id]);
    }
    // Drivers are evaluated first so the motor receives a real powered output in this time slice.
    for (const c of this.project.components.filter(
      (c) => c.kind === "h-bridge",
    )) {
      if (this.extensions.has(c.id)) continue;
      const p = this.pins[c.id],
        s = empty();
      const powered =
        this.supply(p, "VCC", 2.7, 5.5) &&
        typeof p.VM === "number" &&
        p.VM >= 0 &&
        p.VM <= 48;
      const valid = ["EN", "IN1", "IN2"].every(
        (k) =>
          typeof p[k] === "number" &&
          ((p[k]! >= 0 && p[k]! <= 0.8) || (p[k]! >= 2 && p[k]! <= 5.5)),
      );
      if (!powered || !valid)
        s.warnings.push(
          "H-bridge requires logic power, motor supply, ground and valid logic inputs",
        );
      const on = powered && valid && p.EN! >= 2,
        a = on && p.IN1! >= 2,
        b = on && p.IN2! >= 2;
      s.outputs = {
        OUT1: powered ? (a ? p.VM! : 0) : null,
        OUT2: powered ? (b ? p.VM! : 0) : null,
      };
      s.values = { enabled: on };
      this.states[c.id] = s;
    }
    this.resolve();
    for (const [id, m] of this.models) {
      const c = this.project.components.find((c) => c.id === id)!,
        p = this.pins[id],
        s = empty();
      if (m instanceof Ds3231) {
        m.advance(timeUs);
        s.values = { ...m.snapshot() };
        if (this.supply(p)) this.powered.add(id);
        else
          s.warnings.push(
            "RTC unpowered; I2C disconnected (backup calendar retained)",
          );
        if (this.target === "esp32s3")
          s.warnings.push("ESP32-S3 binding has no external I2C device hooks");
        if (this.powered.has(id)) {
          const r = m.snapshot();
          s.outputs = {
            SQW: r.interruptLow ? 0 : r.sqw === 0 ? 0 : null,
            "32K": r.clock32k === 0 ? 0 : null,
          };
        }
      } else if (m instanceof Mux4067) {
        const r = m.update(timeUs, p);
        s.values = { channel: r.channel, value: r.value, onOhms: r.onOhms };
        s.contacts = r.contacts;
        s.warnings = r.warnings;
      } else if (m instanceof RelayModule) {
        const r = m.update(timeUs, p);
        s.values = { energized: r.energized, currentA: r.currentA };
        s.contacts = r.contacts;
        s.warnings = r.warnings;
      } else if (m instanceof DcMotor) {
        const valid = typeof p.POS === "number" && typeof p.NEG === "number";
        const direct = this.project.components.some(
          (b) =>
            isMcuKind(b.kind) &&
            catalog[b.kind].pins.some(
              (pin) =>
                (pin.electricalType === "bidirectional" ||
                  pin.electricalType === "analog") &&
                ["POS", "NEG"].some(
                  (mp) =>
                    this.netOf.get(this.key(id, mp)) ===
                    this.netOf.get(this.key(b.id, pin.id)),
                ),
            ),
        );
        if (direct)
          s.warnings.push(
            "Motor connected directly to MCU GPIO: drive refused; use a powered H-bridge",
          );
        if (!valid) s.warnings.push("Motor terminals floating or conflicting");
        const r = m.update(
          timeUs,
          valid && !direct ? p.POS! - p.NEG! : 0,
          c.properties.stalled === true,
        );
        s.values = { ...r };
        if (
          Math.abs(r.currentA) >
          Number(catalog["h-bridge"].defaultProperties.maxCurrentA)
        )
          s.warnings.push("Motor current exceeds default 3 A driver rating");
      } else if (m instanceof Ws2812) {
        if (this.supply(p, "VDD", 3.5, 5.5)) this.powered.add(id);
        else {
          s.warnings.push("WS2812 needs VDD and GND");
          m.powerOff();
        }
        m.advance(timeUs);
        const r = m.snapshot();
        s.values = {
          colors: r.colors.join(","),
          currentA: r.currentA,
          errors: r.errors,
        };
        if (this.target === "esp32s3")
          s.warnings.push(
            "WS2812 firmware decoding unavailable: S3 GPIO snapshots are not edge-accurate",
          );
      }
      this.states[id] = s;
    }
    this.resolve();
    for (const [id, m] of this.extensions) {
      const c = this.project.components.find((c) => c.id === id)!;
      if (["stepper-driver", "ir-emitter"].includes(c.kind)) continue;
      const pins = { ...this.pins[id] };
      let unsafe = false;
      if (c.kind === "stepper" || c.kind === "electromagnetic-switch") {
        const terminals =
          c.kind === "stepper"
            ? ["A1", "A2", "B1", "B2"]
            : ["COIL_POS", "COIL_NEG"];
        unsafe = this.project.components.some(
          (b) =>
            isMcuKind(b.kind) &&
            catalog[b.kind].pins.some(
              (p) =>
                ["bidirectional", "analog"].includes(p.electricalType) &&
                terminals.some(
                  (t) =>
                    this.netOf.get(this.key(id, t)) ===
                    this.netOf.get(this.key(b.id, p.id)),
                ),
            ),
        );
        if (unsafe) for (const pin of terminals) pins[pin] = null;
      }
      this.states[id] = m.update(timeUs, pins);
      if (unsafe)
        this.states[id].warnings.push(
          "Direct MCU GPIO coil power refused; use a powered driver",
        );
      if (
        this.target === "esp32s3" &&
        [
          "hx711",
          "dht22",
          "servo",
          "stepper-driver",
          "arm-6dof",
          "universal-arm",
          "dobot-magician",
          "uarm-metal",
        ].includes(c.kind)
      )
        this.states[id].warnings.push(
          "S3 snapshot binding is not edge-accurate; timed firmware protocol support is unverified",
        );
    }
    this.resolve();
    for (const c of this.project.components.filter((c) =>
      ["voltmeter", "ammeter"].includes(c.kind),
    )) {
      const s = empty(),
        a = this.pinVoltage(c.id, "POS"),
        b = this.pinVoltage(c.id, "NEG"),
        v = a === null || b === null ? null : a - b,
        value = c.kind === "voltmeter" ? v : (this.dcCurrents[c.id] ?? null),
        range = Number(
          c.properties[c.kind === "voltmeter" ? "rangeV" : "rangeA"] ??
            (c.kind === "voltmeter" ? 60 : 10),
        );
      s.values = {
        status:
          value === null
            ? "floating-or-conflicting"
            : Math.abs(value) > range
              ? "overrange"
              : "ok",
        [c.kind === "voltmeter" ? "voltageV" : "currentA"]: value,
      };
      if (value === null)
        s.warnings.push(
          "Meter terminals floating, conflicting, invalid shunt or DC solver bound exceeded",
        );
      if (value !== null && Math.abs(value) > range)
        s.warnings.push("Meter exceeds configured measurement range");
      s.warnings.push(...this.dcIssues);
      this.states[c.id] = s;
    }
  }
  /** @brief Advance from real CPU timestamps. AVR transitions are instruction-cycle accurate. */
  advance(
    timeUs: number,
    gpio: Record<string, 0 | 1 | null>,
    transitions: { pin: string; level: 0 | 1 | null; cycle: number }[] = [],
  ) {
    checkTime(timeUs, this.time);
    if (this.target !== "esp32s3")
      for (const e of transitions) {
        const at = e.cycle / 16;
        if (at < this.time || at > timeUs) continue;
        // Integrate the old voltage up to the edge, then apply the new level.
        this.evaluate(at);
        this.gpio = { ...this.gpio, [e.pin]: e.level };
        this.evaluate(at);
        if (e.level !== null)
          for (const [id, m] of this.models)
            if (
              m instanceof Ws2812 &&
              (this.wsChains.get(id) ?? [id]).every((c) =>
                this.powered.has(c),
              ) &&
              this.connected(this.wsSources.get(id) ?? id, "DIN", e.pin)
            ) {
              const source = this.wsSources.get(id) ?? id;
              const voltage = this.pinVoltage(source, "DIN"),
                vdd = this.pinVoltage(source, "VDD");
              const valid =
                voltage !== null &&
                vdd !== null &&
                voltage >= 0 &&
                voltage <= vdd &&
                (e.level === 1 ? voltage >= 0.7 * vdd : voltage <= 0.3 * vdd);
              if (valid) m.edge(at, e.level);
              else m.powerOff(); // Discard malformed electrical frames instead of decoding raw CPU bits through conflicts.
            }
      }
    this.gpio = { ...gpio };
    this.evaluate(timeUs);
    this.time = timeUs;
    return structuredClone(this.states);
  }
  /** @brief Address an actual wired and powered Uno I2C RTC; otherwise NACK. */
  i2cWrite(address: number, bytes: number[]) {
    const matches = [...this.models].filter(
      ([id, m]) =>
        m instanceof Ds3231 &&
        m.address === address &&
        this.powered.has(id) &&
        this.connected(id, "SDA", boardI2cPins(this.target).sda) &&
        this.connected(id, "SCL", boardI2cPins(this.target).scl),
    );
    const ack = matches.length === 1;
    this.transactions.push({
      timeUs: this.time,
      address,
      direction: bytes.length ? "write" : "address",
      bytes: [...bytes],
      ack,
    });
    if (this.transactions.length > 100) this.transactions.shift();
    if (!ack) return false;
    if (!bytes.length) return true;
    return (matches[0][1] as Ds3231).write(address, bytes);
  }
  /** @brief Read from the selected RTC using its current register pointer. */
  i2cRead(address: number, count: number) {
    for (const [id, m] of this.models)
      if (
        m instanceof Ds3231 &&
        m.address === address &&
        this.powered.has(id) &&
        this.connected(id, "SDA", boardI2cPins(this.target).sda) &&
        this.connected(id, "SCL", boardI2cPins(this.target).scl)
      ) {
        const bytes = m.read(address, count);
        this.transactions.push({
          timeUs: this.time,
          address,
          direction: "read",
          bytes,
          ack: true,
        });
        if (this.transactions.length > 100) this.transactions.shift();
        return bytes;
      }
    return [];
  }
  /** @brief Inspect a resolved terminal voltage; null means floating or conflicting drivers. */
  pinVoltage(componentId: string, pinId: string) {
    return this.pins[componentId]?.[pinId] ?? null;
  }
  /** @brief Absolute time already consumed by this host. */
  get timeMicros() {
    return this.time;
  }
  /** @brief Resolve wired MCU inputs, including contact/multiplexer/RTC paths. Null denotes floating/ambiguous. */
  inputLevels(): Record<string, 0 | 1 | null> {
    const board = this.project.components.find((c) => isMcuKind(c.kind));
    if (!board) return {};
    const result: Record<string, 0 | 1 | null> = {},
      threshold = board.kind !== "yd-esp32-s3" ? 3 : 2;
    for (const pin of catalog[board.kind].pins) {
      const gpio =
        board.kind !== "yd-esp32-s3"
          ? /^(D\d+|A\d+)$/.test(pin.id) &&
            pin.electricalType !== "adc-only-unimplemented"
            ? pin.id
            : null
          : ydBoard.pins.find((p) => p.id === pin.id)?.gpio;
      if (gpio === null || gpio === undefined) continue;
      if (
        !this.project.wires.some((w) =>
          [w.from, w.to].some(
            (e) => e.componentId === board.id && e.pinId === pin.id,
          ),
        )
      )
        continue;
      const v = this.pinVoltage(board.id, pin.id);
      result[board.kind !== "yd-esp32-s3" ? String(gpio) : `GPIO${gpio}`] =
        v === null ? null : v <= 0.8 ? 0 : v >= threshold ? 1 : null;
    }
    return result;
  }
  /** @brief Apply an external switch state without replacing device instances or their clock state. */
  setButton(id: string, pressed: boolean) {
    const c = this.project.components.find(
      (c) =>
        c.id === id && (c.kind === "switch" || c.kind === "tactile-switch"),
    );
    if (c) c.properties = { ...c.properties, pressed };
  }
  /** @brief LED evaluation includes powered driver/contact paths resolved by the component host. */
  ledStates() {
    return Object.fromEntries(
      this.project.components
        .filter((c) => c.kind === "led")
        .map((c) => {
          const a = this.pinVoltage(c.id, "A"),
            k = this.pinVoltage(c.id, "K");
          return [c.id, a === null || k === null ? null : a - k > 1.5];
        }),
    );
  }
  /** @brief Return closed behavioral contacts as additional explicit wires for LED projection. */
  contactWires() {
    return Object.entries(this.states).flatMap(([id, s]) =>
      s.contacts.map(([a, b], i) => ({
        id: `model-${id}-${i}`,
        from: { componentId: id, pinId: a },
        to: { componentId: id, pinId: b },
        color: "#000000",
        label: "",
      })),
    );
  }
}
