/** @file Version 1 portable circuit contract; coordinates never imply connectivity. */
export type ComponentKind = "uno" | "led" | "resistor" | "switch" | "junction";
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
  schemaVersion: "1.0.0";
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
