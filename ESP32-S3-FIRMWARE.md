# ESP32-S3 firmware preparation and reference

## Verified reference

The supplied `public/firmware/esp32s3-reference.bin` is the official MicroPython1.29.0 generic S3 Octal-SPIRAM merged image, originally named `ESP32_GENERIC_S3-SPIRAM_OCT-20260824-v1.29.0.bin`. Source/download: [MicroPython S3 downloads](https://micropython.org/download/ESP32_GENERIC_S3/). SHA256: `ab24eadfe3ef0e6ee38834d730e648def7cd82f3fa51ee0bbc59c29a6e1bd176`. The acquisition hash is locally recorded, not a vendor signature. Its license is supplied with the assets; review upstream ESP-IDF/dependency notices before commercial redistribution.

This is an actual ESP-IDF-based ESP32-S3 firmware image, not an application binary compiled during this task. It boots from the emulated mask ROM into MicroPython. Example Pin/Timer programs are UART input to the guest interpreter running on the real Xtensa emulator. SimuLab JS sends bytes and observes GPIO/UART; it does not recognize Python/Arduino functions to synthesize outputs.

## Run in SimuLab

1. Open the **YD GPIO4 example** (or keep exactly one YD board in your circuit).
2. Click **Load ESP32-S3 reference**, then **Start simulation**.
3. Open **Serial monitor** and wait for the MicroPython prompt.
4. **Send GPIO4 blink program** runs a guest Timer callback that toggles GPIO4 about every250ms of simulation time. The LED is wired through R1 to physicalP1.4/ GPIO4, with GND return.
5. **Send GPIO5 button monitor** runs guest input polling. Hold SW1; guest UART reports BUTTON=0, then BUTTON=1 after release. The button is wired to physicalP1.5/GPIO5 and GND.
6. The UART input accepts other compatible guest commands. A C/Arduino application may implement another serial protocol; MicroPython examples require MicroPython firmware.

GPIO states shows observed output-enable/level snapshots, with inputs explicitly markedHi-Z/input. Circuit edits unload firmware; upload/reload after changing topology or properties. Runtime/flash/UART state is not stored in circuit JSON.

## Build an ESP-IDF merged image

Use an ESP-IDF environment compatible with the chosen project. For ESP-IDF6.0.2 (documented upstream):

```powershell
idf.py set-target esp32s3
idf.py build
idf.py merge-bin -o simulab-esp32s3.bin -f raw
```

`merge-bin` combines the bootloader, partition table, app and configured extra partitions. See [Espressif idf.py documentation](https://docs.espressif.com/projects/esp-idf/en/v6.0.2/esp32s3/api-guides/tools/idf-py.html). Verify actual generated offsets against this adapter's standard0/0x8000/0x10000 profile. Select flash/PSRAM settings matching both your hardware and emulator capabilities. Full N16R8 browser flash capacity is not validated; the reference reports4MiB.

These custom ESP-IDF compilation commands were documented but not executed here; the prebuilt reference was executed. For PlatformIO/Arduino IDE, use the toolchain-generated flashing manifest and all required bootloader/table/app/extra images with esptool merge-bin. An app-only `.bin` is not sufficient. Their arbitrary sketch compatibility remains unverified; do not assume menu choices or pin aliases match the YD board.

## Reproduce engine evidence

From simulab-engine: `node esp32/setup-assets.mjs`, `npm.cmd run test:esp32`, `npm.cmd run test:esp32:firmware`. The setup script acquires pinned assets into ignored local cache and validates hashes. No ESP-IDF toolchain/native compiler is required for the checked-in browser reference.
