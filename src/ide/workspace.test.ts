import { expect, it } from "vitest";
import {
  newWorkspace,
  parseWorkspace,
  serializeWorkspace,
  debugCapabilities,
} from "./workspace";
import { createSampleProject } from "../circuit/project";
it("roundtrips circuit, source files, cursor, breakpoints and active tab", () => {
  const w = newWorkspace(createSampleProject());
  w.files[0].content = "void setup(){}";
  w.files.push({ name: "helper.h", content: "#pragma once" });
  w.activeTab = "code";
  w.breakpoints = { "sketch.ino": [4] };
  const loaded = parseWorkspace(serializeWorkspace(w));
  expect(loaded).toEqual(w);
  expect(() =>
    parseWorkspace(
      JSON.stringify({ ...w, files: [{ name: "../bad.ino", content: "" }] }),
    ),
  ).toThrow();
});
it("never claims unavailable source stepping or original ESP32 execution", () => {
  expect(debugCapabilities("uno").instructionStep).toBe(true);
  expect(debugCapabilities("uno").sourceStep).toBe(false);
  expect(debugCapabilities("esp32s3").instructionStep).toBe(false);
  expect(debugCapabilities("esp32").execution).toBe(false);
});
