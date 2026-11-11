/** @file Version 1 portable circuit contract; coordinates never imply connectivity. */
export type ComponentKind =
  | "uno"
  | "yd-esp32-s3"
  | "led"
  | "resistor"
  | "switch"
  | "junction"
  | "ds3231"
  | "mux4067"
  | "dc-motor"
  | "ws2812"
  | "relay"
  | "h-bridge"
  | "nano"
  | "mega2560"
  | "voltmeter"
  | "ammeter"
  | "hx711"
  | "dht22"
  | "stepper"
  | "stepper-driver"
  | "servo"
  | "tactile-switch"
  | "electromagnetic-switch"
  | "arm-6dof"
  | "universal-arm"
  | "dobot-magician"
  | "uarm-metal"
  | "conveyor"
  | "robotic-car"
  | "ir-emitter"
  | "ir-detector";
export interface Point {
  x: number;
  y: number;
}
export interface CircuitComponent {
  id: string;
  kind: ComponentKind;
  label: string;
  position: Point;
  rotation: number;
  properties: Record<string, string | number | boolean>;
}
export interface Endpoint {
  componentId: string;
  pinId: string;
}
export interface Wire {
  id: string;
  from: Endpoint;
  to: Endpoint;
  color: string;
  label: string;
}
export interface CircuitProject {
  schemaVersion: "1.0.0" | "1.1.0" | "1.2.0" | "1.3.0";
  name: string;
  components: CircuitComponent[];
  wires: Wire[];
}
export interface ComponentDefinition {
  name: string;
  description: string;
  pins: { id: string; label: string; electricalType: string }[];
  defaultProperties: Record<string, string | number | boolean>;
}
