# YD-ESP32-S3-2022-V1.3 board

## Hardware sources and confidence

The machine-readable source is `src/boards/yd-esp32-s3.json`, validated at runtime and in tests. Manufacturer reference: [VCC-GND Studio](https://github.com/vcc-gnd/YD-ESP32-S3), pinned commit `b4ac4d60d1845a554bbbc7c97806ccb97cf08941`.

There are44 individually addressable terminals: P1.1..P1.22 on the left, P2.1..P2.22 on the right, viewed with the antenna at the top and USB at the bottom. Physical ordinal1..44 is SimuLab's top-view enumeration, not a GPIO number or an alternate schematic pad number. HeaderIndex records the manufacturer's per-header numbering. Repeated3V3 and GND terminals join through explicitly declared internal nets; crossed drawing wires do not connect.

Manufacturer family documentation establishes ESP32-S3-WROOM-1, dual-core Xtensa LX7 hardware, GPIO48 WS2812, active-low BOOT GPIO0, EN/RST, nativeUSB GPIO19/20, and CH343P UART TX43/RX44. Do not substitute GPIO38 for the RGB connection.

The publicly available schematic is V1.4. Exact2022-V1.3 revision equivalence, the user's installed module/flash/PSRAM marking remains **requiring confirmation**. The manufacturer metric drawing was rendered and visually inspected:27.94mm width,63.39mm overall height,57.15mm PCB height,2.54mm header pitch,53.34mm row span and25.40mm column spacing. SVG and handles use the same10unit/mm scale. This is a family drawing, not an exactV1.3 footprint certification.

## Pin metadata and restrictions

Each terminal records physical/header identity, label, nativeGPIO, Arduino-ESP32 generic numeric alias, electrical type, functions, ADC unit/channel, LEDC/I2C/SPI/UART hardware capability and restrictions. GPIO0/3/45/46 are strapping pins. GPIO19/20 also serve USB; GPIO39..42 serve JTAG. GPIO35/36/37 are unavailable externally on octal-memory variants such as N16R8. GPIO26..34 are not header terminals here.

Arduino generic S3 numeric GPIO references are distinguished from named board aliases and AVR digital pins. No S3 pin is mapped to an AVR register. Named aliases/menu variants have not been compiled/tested in this task. GPIO46 metadata follows the pinned official ESP-IDF S3 capability mask and manufacturer's I/O table; legacy/secondary input-only assumptions are not imported from other chips. Physical silicon/revision parity remains untested.

N16R8 is offered as a physical memory profile:16MB flash/8MB octalPSRAM, requiring module-label confirmation. Choosing it does not resize the browser emulator. The validated reference firmware reports4MiB flash and about8.3MB free guest heap; full16MB flash behavior is unavailable/unverified in the present browser API.

## Editor behavior

The board reuses the existing palette, circuit graph, history, JSON and XYFlow canvas. Stable physical pin IDs survive rotation, movement and reimport. Artwork and44 handle centers/directions rotate together at0/90/180/270 degrees. Tooltips/highlighting identify physical pins and nativeGPIO. RGB remains neutral until a real signal interface can be validated.

RST invokes the engine's reset-to-original-image operation when firmware is loaded. BOOT drives GPIO0 as a digital input while running; BOOT+RST download-mode strapping and an externally wired EN reset net are not validated. Power/analog circuitry and USB host/device traffic are not simulated.

Circuit schema1.1.0 introduces this board. Existing1.0.0 Uno projects remain valid and retain their version.1.0 readers cannot load1.1 YD documents; new readers reject YD pins falsely labeled as1.0 rather than silently remap them.
