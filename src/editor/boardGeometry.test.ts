import { describe, it, expect } from "vitest";
import {
  getBoardGeometry,
  rotateBoardPoint,
  rotateHeaderSide,
  boardSvgTransform,
} from "./boardGeometry";
describe("rotated YD board attachment geometry", () => {
  it("exposes44 distinct physical attachment points in two22-pin headers", () => {
    const board = getBoardGeometry(0);
    expect(board.width).toBe(279.4);
    expect(board.height).toBe(633.9);
    expect(board.pins).toHaveLength(44);
    expect(new Set(board.pins.map((p) => p.id)).size).toBe(44);
    expect(board.pins.filter((p) => p.header === "P1")).toHaveLength(22);
    expect(board.pins.find((p) => p.id === "P1.1")).toMatchObject({
      x: 12.7,
      y: 81.5,
      direction: "left",
    });
    expect(board.pins.find((p) => p.id === "P2.22")).toMatchObject({
      x: 266.7,
      y: 614.9,
      direction: "right",
    });
  });
  it("rotates positions, dimensions and connection direction together", () => {
    expect(getBoardGeometry(90)).toMatchObject({ width: 633.9, height: 279.4 });
    expect(
      getBoardGeometry(90).pins.find((p) => p.id === "P1.1"),
    ).toMatchObject({ x: 552.4, y: 12.7, direction: "top" });
    expect(
      getBoardGeometry(180).pins.find((p) => p.id === "P1.1"),
    ).toMatchObject({ x: 266.7, y: 552.4, direction: "right" });
    expect(
      getBoardGeometry(270).pins.find((p) => p.id === "P1.1"),
    ).toMatchObject({ x: 81.5, y: 266.7, direction: "bottom" });
  });
  it("preserves identities and keeps all terminals inside rotated bounds", () => {
    const original = getBoardGeometry(0).pins.map((p) => p.id);
    for (const rotation of [0, 90, 180, 270]) {
      const geometry = getBoardGeometry(rotation);
      expect(geometry.pins.map((p) => p.id)).toEqual(original);
      for (const pin of geometry.pins) {
        expect(pin.x).toBeGreaterThanOrEqual(0);
        expect(pin.x).toBeLessThanOrEqual(geometry.width);
        expect(pin.y).toBeGreaterThanOrEqual(0);
        expect(pin.y).toBeLessThanOrEqual(geometry.height);
      }
    }
  });
  it("has a reversible quarter-turn coordinate transform", () => {
    const p = { x: 17, y: 125 };
    const a = rotateBoardPoint(p, 90);
    const b = { x: a.y, y: 633.9 - a.x };
    expect(b.x).toBeCloseTo(p.x);
    expect(b.y).toBeCloseTo(p.y);
    expect(rotateHeaderSide("right", 270)).toBe("top");
    expect(boardSvgTransform(90)).toBe("translate(633.9 0) rotate(90)");
  });
  it("rejects unsupported rotations explicitly", () => {
    expect(() => getBoardGeometry(45)).toThrow(/rotation/i);
    expect(() => rotateBoardPoint({ x: 0, y: 0 }, NaN)).toThrow(/rotation/i);
  });
});
