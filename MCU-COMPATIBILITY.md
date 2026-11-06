# MCU compatibility

| Capability | Arduino Uno / ATmega328P | YD ESP32-S3 / Xtensa LX7 |
| --- | --- | --- |
| Engine | AVR8js0.21.1 | Official Espressif ESP Emulator0.51.0 WASM |
| Actual firmware | AVR-GCC HEX fixtures | Official MicroPython1.29 ESP-IDF merged flash |
| GPIO output/net LED | Verified D13/D12, explicit nets | Verified GPIO4 through physical header/resistor/net |
| GPIO input | Engine API fixture D2->D11 | Engine and browser wired GPIO5 button/guest UART |
| UART TX | Verified | Verified |
| UART RX | Unsupported | Verified guest REPL bytes |
| Timers/interrupts | Timer1 CTC verified | Guest MicroPython timer approximately250ms verified |
| Reset/pause/resume/stop | Verified; original UnoRuntime retained | Verified core lifecycle; original-image reload semantics |
| RGB/WS2812 | Not implemented | GPIO48 family mapping, no exposed waveform model |
| External I2C/SPI devices | Not implemented | Unsupported by exported browser device API |
| Flash/PSRAM |32KiB flash/2KiB SRAM profile | Reference reports4MiB flash/~8.3MB free heap; fullN16R8 not verified |
| Physical hardware comparison | Not performed | Not performed |

One MCU per session. Multiple boards or wrong firmware target/format fail explicitly. S3 GPIO numbers never become AVR register numbers. Physical board definitions and electrical topology are independent of the engine. Hardware ADC/LEDC/I2C/SPI capability metadata does not constitute emulator integration.

Current circuit schema1.1 adds the YD kind;1.0 Uno projects still reopen without changing their stored version. Engine package0.3.0 adds an explicit standard facade while preserving existing UnoRuntime. Worker protocol1.1 adds target-specific binary/UART/contact commands and explicit errors.

The S3 board/emulator/peripheral gates are separate: rendering alone is not firmware support, and boot/GPIO do not prove RTC/RGB. See ESP32-S3-BOARD.md, ESP32-S3-EMULATOR.md, ESP32-S3-FIRMWARE.md and ESP32-S3-TEST-REPORT.md for sources, commands and limits.
