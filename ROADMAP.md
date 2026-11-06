# Roadmap

| Phase | Deliverable | Exit gate |
| --- | --- | --- |
| 1 — Foundation | Editor, explicit pins/wires/junctions, checks, JSON projects | Build/start, placement, correct connections, independent crossings, persistence and tests verified |
| 2 — AVR | Genuine ATmega328P execution, GPIO/netlist bridge, UART | Compiled firmware runs in verified emulator; results checked against hardware expectations |
| 3 — ESP32-S3 | Compatible firmware and supported peripherals | Correct firmware executes; peripherals independently verified |
| 4 — Automatic gate | Motor/driver, sensors and deterministic mechanics | Motion derives from engine signals; limits, obstruction, stop and reversal tested |
| 5 — SaaS backend | Accounts, authorized projects, compilation orchestration | Isolation, quotas, timeouts, access control and audit tests pass |
| 6 — Commercial | Subscriptions, teams, 3D, more MCU families | Commercial, security, operational and licensing requirements reviewed |

Arduino Mega requires independent ATmega2560 mappings and firmware tests. Uno results do not verify Mega. AVR execution cannot substitute for ESP32-S3.

Future editor work includes manual movable wire segments, richer net labels, comprehensive electrical rules, more component models and large-project routing/performance. Preserve coordinate-independent connectivity.

Next task: evaluate real AVR emulator licenses, firmware formats, execution environments, GPIO/UART hooks and deterministic stepping; run compiled firmware before connecting LED visualization.

## Phase 2 status

Browser AVR integration implemented and tested with compiled fixtures. Hardware comparison remains pending. Timer0/2, PWM, advanced buses/ADC and live circuit inputs need their own compatibility tests before support claims. Phase3 ESP32-S3 investigation has not started. Backend and commercial milestones remain untouched.

## S3 milestone update

YD board graphics/metadata and genuine S3 ROM/firmware boot, GPIO output, wired input and UART are implemented and tested. ExactV1.3 physical confirmation/fullN16R8 sizing, WS2812 waveform integration and externalI2C/DS1307 remain open gates. They are not claimed complete by the board appearing in the editor. Backend/commercial phases remain untouched.
