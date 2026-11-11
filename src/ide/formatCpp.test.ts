import { expect, it } from "vitest";
import { formatCpp } from "./formatCpp";
it("indents C++ while ignoring braces in comments and strings", () => {
  expect(
    formatCpp(
      'void setup() {\nSerial.println("}"); // {\nif (true) {\nrun();\n}\n}',
    ),
  ).toBe(
    'void setup() {\n  Serial.println("}"); // {\n  if (true) {\n    run();\n  }\n}',
  );
});
it("preserves raw strings, multiline macros and comment text exactly", () => {
  const raw = 'const char* s=R"(\n   literal\n)";';
  expect(formatCpp(raw)).toBe(raw);
  const macro = "#define X \\\n  123";
  expect(formatCpp(macro)).toBe(macro);
});
