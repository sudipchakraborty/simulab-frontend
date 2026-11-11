# MCU compatibility

| Capability | Arduino Uno / ATmega328P | YD ESP32-S3 / Xtensa LX7 |
| --- | --- | --- |
| Engine | AVR8js0.21.1 | Official Espressif ESP Emulator0.51.0 WASM |
| Actual firmware | AVR-GCC HEX fixtures | Official MicroPython1.29 and actual Arduino CLI (ESP32 core3.3.8) merged examples |
| GPIO output/net LED | Verified D13/D12, explicit nets | Verified GPIO4 through physical header/resistor/net |
| GPIO input | Engine API fixture D2->D11 | Engine and browser wired GPIO5 button/guest UART |
| UART TX | Verified | Verified |
| UART RX | Compiled USART echo verified | Verified guest REPL bytes |
| Timers/interrupts | Timer1 CTC, Timer0 PWM period and Timer2 CTC verified | Guest MicroPython timer approximately250ms verified |
| Reset/pause/resume/stop | Verified; original UnoRuntime retained | Verified core lifecycle; original-image reload semantics |
| RGB/WS2812 | Timed GRB model/chain integrated with cycle GPIO | GPIO48 family mapping, no exposed waveform model |
| External I2C/SPI devices | DS3231 on real AVR TWI; SPI unsupported | Unsupported by exported browser device API |
| Flash/PSRAM |32KiB flash/2KiB SRAM profile | Reference reports4MiB flash/~8.3MB free heap; fullN16R8 not verified |
| Physical hardware comparison | Not performed | Not performed |

One MCU per session. Multiple boards or wrong firmware target/format fail explicitly. S3 GPIO numbers never become AVR register numbers. Physical board definitions and electrical topology are independent of the engine. Hardware ADC/LEDC/I2C/SPI capability metadata does not constitute emulator integration.

Current circuit schema1.1 adds the YD kind;1.0 Uno projects still reopen without changing their stored version. Engine package0.3.0 adds an explicit standard facade while preserving existing UnoRuntime. Worker protocol1.1 adds target-specific binary/UART/contact commands and explicit errors.

The S3 board/emulator/peripheral gates are separate: rendering alone is not firmware support, and boot/GPIO do not prove RTC/RGB. See ESP32-S3-BOARD.md, ESP32-S3-EMULATOR.md, ESP32-S3-FIRMWARE.md and ESP32-S3-TEST-REPORT.md for sources, commands and limits.

## Integrated IDE and components (2026-11-06)

Five behavioral device models and a powered ideal H-bridge are available in schema1.2. Uno input feedback resolves component voltages at real PIN-register reads and GPIO changes; I2C device time resolves before TWI operations. S3 external devices use sampled GPIO only: no timing-critical bus or WS2812 claims. Original ESP32 is build/upload-only. See docs/COMPONENT_DEVELOPMENT.md and docs/INTEGRATED_IDE.md for approximations and unsupported debugger/hardware features.

## Native Nano and Mega2560 (0.5)
Nano classic uses the ATmega328P CPU/native D0..13/A0..5 map; A6/A7 are ADC-only and unsupported. Mega2560 uses explicit 256 KiB flash/8 KiB SRAM, native D0..53/A0..15, Mega vectors, Timer0..5 configuration, USART0 and D20/D21 TWI. Genuine GCC and Arduino AVR1.8.6 firmware prove high-register GPIO, timer interrupts, millis, input and USART0 TX/RX. Mega timers2..5 are configured but not independently parity-validated. USART1..3/ADC/SPI/EEPROM and physical comparisons remain unsupported. Engine0.5/schema1.3 retain old project parsing and UnoRuntime compatibility. Robotic artwork never implies vendor firmware/protocol support.
