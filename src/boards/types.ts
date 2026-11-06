/** @file Manufacturer-derived physical board metadata, independent of any CPU emulator. */
export interface BoardPin {
  id: string;
  physicalNumber: number;
  header: "P1" | "P2";
  headerIndex: number;
  side: "left" | "right";
  label: string;
  gpio: number | null;
  arduinoPin: number | null;
  electricalType: "power" | "ground" | "input" | "bidirectional";
  functions: string[];
  restrictions: string[];
  adc: { unit: 1 | 2; channel: number } | null;
  ledc: boolean;
  i2c: boolean;
  spi: boolean;
  uart: { tx: boolean; rx: boolean };
}
export interface BoardDefinition {
  schemaVersion: "1.0.0";
  id: string;
  name: string;
  manufacturer: string;
  revision: string;
  mcu: "ESP32-S3";
  cpu: string;
  physicalPins: 44;
  numberingConvention: string;
  dimensionsMm: { width: number; height: number } | null;
  dimensionStatus: "requires-confirmation" | "manufacturer-drawing-verified";
  verification: {
    pinout: "manufacturer-family-verified";
    exactRevision: "requires-confirmation";
    note: string;
  };
  memory: {
    defaultVariant: "unconfirmed";
    profiles: {
      N16R8: {
        flashMB: 16;
        psramMB: 8;
        psramMode: "octal";
        reservedGpio: number[];
        verification: "module-marking-required";
      };
    };
  };
  onboard: {
    rgb: { gpio: 48; type: "WS2812"; verification: "manufacturer-family" };
    boot: { gpio: 0; activeLow: true };
    reset: { signal: "EN"; activeLow: true };
    usb: (
      | { type: "USB-C"; role: "native"; gpioDm: 19; gpioDp: 20 }
      | {
          type: "USB-C";
          role: "usb-to-uart";
          bridge: "CH343P";
          uartTx: 43;
          uartRx: 44;
        }
    )[];
  };
  internalNets: { name: string; pinIds: string[] }[];
  sources: { url: string; revision: string; purpose: string }[];
  pins: BoardPin[];
}
