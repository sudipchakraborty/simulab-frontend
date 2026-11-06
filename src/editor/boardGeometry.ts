/** @file Manufacturer-family metric geometry at10 drawing units/mm; pixels are presentation units, never electrical identity. */
export const BOARD_DRAWING_WIDTH = 279.4;
export const BOARD_DRAWING_HEIGHT = 633.9;
export type QuarterTurn = 0 | 90 | 180 | 270;
export type BoardDirection = "left" | "right" | "top" | "bottom";
export interface BoardPoint {
  x: number;
  y: number;
}
export interface HeaderAttachment extends BoardPoint {
  id: string;
  header: "P1" | "P2";
  headerIndex: number;
  direction: BoardDirection;
}
/** @brief Validate quarter-turn orientation without silently coercing malformed projects. */
function assertRotation(rotation: number): asserts rotation is QuarterTurn {
  if (![0, 90, 180, 270].includes(rotation))
    throw new Error("Board rotation must be0,90,180 or270 degrees.");
}
/** @brief Rotate a base-layout point clockwise while translating it into positive bounds. */
export function rotateBoardPoint(
  point: BoardPoint,
  rotation: number,
): BoardPoint {
  assertRotation(rotation);
  switch (rotation) {
    case 90:
      return {
        x: Number((BOARD_DRAWING_HEIGHT - point.y).toFixed(3)),
        y: point.x,
      };
    case 180:
      return {
        x: Number((BOARD_DRAWING_WIDTH - point.x).toFixed(3)),
        y: Number((BOARD_DRAWING_HEIGHT - point.y).toFixed(3)),
      };
    case 270:
      return {
        x: point.y,
        y: Number((BOARD_DRAWING_WIDTH - point.x).toFixed(3)),
      };
    default:
      return { ...point };
  }
}
/** @brief Rotate outward terminal direction with its physical pad. */
export function rotateHeaderSide(
  side: "left" | "right",
  rotation: number,
): BoardDirection {
  assertRotation(rotation);
  const directions: BoardDirection[] = ["left", "top", "right", "bottom"];
  return directions[(directions.indexOf(side) + rotation / 90) % 4];
}
/** @brief SVG matrix equivalent to the point transform used for electrical attachment positions. */
export function boardSvgTransform(rotation: number): string {
  assertRotation(rotation);
  switch (rotation) {
    case 90:
      return `translate(${BOARD_DRAWING_HEIGHT} 0) rotate(90)`;
    case 180:
      return `translate(${BOARD_DRAWING_WIDTH} ${BOARD_DRAWING_HEIGHT}) rotate(180)`;
    case 270:
      return `translate(0 ${BOARD_DRAWING_WIDTH}) rotate(270)`;
    default:
      return "";
  }
}
/** @brief Generate44 stable physical terminals, preserving IDs through all supported rotations. */
export function getBoardGeometry(rotation: number): {
  width: number;
  height: number;
  pins: HeaderAttachment[];
} {
  assertRotation(rotation);
  const pins: HeaderAttachment[] = [];
  for (const header of ["P1", "P2"] as const) {
    const side = header === "P1" ? "left" : "right";
    for (let headerIndex = 1; headerIndex <= 22; headerIndex++) {
      pins.push({
        id: `${header}.${headerIndex}`,
        header,
        headerIndex,
        ...rotateBoardPoint(
          {
            x: side === "left" ? 12.7 : 266.7,
            y: Number((81.5 + (headerIndex - 1) * 25.4).toFixed(3)),
          },
          rotation,
        ),
        direction: rotateHeaderSide(side, rotation),
      });
    }
  }
  return {
    width: rotation % 180 === 0 ? BOARD_DRAWING_WIDTH : BOARD_DRAWING_HEIGHT,
    height: rotation % 180 === 0 ? BOARD_DRAWING_HEIGHT : BOARD_DRAWING_WIDTH,
    pins,
  };
}
