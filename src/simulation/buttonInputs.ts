import {boardPins,isMcuKind} from '../circuit/boardRegistry';
﻿import { ydBoard } from "../boards/yd-esp32-s3";
import { buildNets } from "../circuit/netlist";
import type { CircuitProject } from "../circuit/types";
/** @brief Ideal pull-up button inputs; only nets explicitly wired to switch contacts are driven. */
export function buttonInputs(project: CircuitProject): Record<string, boolean> {
  const board = project.components.find((c) => isMcuKind(c.kind));
  if (!board) return {};
  const switches = project.components.filter((c) => ["switch","tactile-switch"].includes(c.kind));
  const permanent=switches.filter(c=>c.kind==='tactile-switch').flatMap(c=>[['1A','1B'],['2A','2B']].map(([a,b],i)=>({id:`pair-${c.id}-${i}`,from:{componentId:c.id,pinId:a},to:{componentId:c.id,pinId:b},color:'#000000',label:''})));
  const open = buildNets({...project,wires:[...project.wires,...permanent]});
  const closed = buildNets({
    ...project,
    wires: [
      ...project.wires,...permanent,
      ...switches
        .filter((c) => c.properties.pressed === true)
        .map((c) => ({
          id: `contact-${c.id}`,
          from: { componentId: c.id, pinId: c.kind==='tactile-switch'?'1A':'1' },
          to: { componentId: c.id, pinId: c.kind==='tactile-switch'?'2A':'2' },
          color: "#000000",
          label: "",
        })),
    ],
  });
  const result: Record<string, boolean> = {};
  const avr=board.kind!=='yd-esp32-s3';
  const pins=avr?boardPins(board.kind).filter(p=>p.digital).map(p=>({...p,gpio:0})):ydBoard.pins;
  for (const pin of pins) {
    if (pin.gpio === null || (!avr&&[35,36,37].includes(pin.gpio))) continue;
    const wired = open.find((n) =>
      n.endpoints.some((e) => e.componentId === board.id && e.pinId === pin.id),
    );
    if (
      !wired?.endpoints.some((e) =>
        switches.some((c) => c.id === e.componentId),
      )
    )
      continue;
    const net = closed.find((n) =>
      n.endpoints.some((e) => e.componentId === board.id && e.pinId === pin.id),
    );
    const low = net?.endpoints.some(
      (e) =>
        e.componentId === board.id &&
        (avr?e.pinId==='GND':ydBoard.pins.find((p) => p.id === e.pinId)?.electricalType === "ground"),
    );
    result[avr?pin.id:`GPIO${pin.gpio}`] = !low;
  }
  return result;
}
