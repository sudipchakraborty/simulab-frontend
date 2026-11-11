import type { CircuitProject } from "../circuit/types";
import {isMcuKind,boardTarget} from '../circuit/boardRegistry';
/** @brief Resolve an explicit single MCU; firmware never falls back across chips. */
export function simulationTarget(project:CircuitProject):'uno'|'nano'|'mega2560'|'esp32s3'|'none'|'multiple'{const boards=project.components.filter(c=>isMcuKind(c.kind));return boards.length>1?'multiple':boards.length===0?'none':boardTarget(boards[0].kind)!;}
