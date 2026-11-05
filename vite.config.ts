import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { include: ["@simulab/engine", "avr8js"] },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
