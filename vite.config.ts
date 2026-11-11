import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": process.env.SIMULAB_ACCOUNT_API || "http://127.0.0.1:4320",
    },
  },
  preview: {
    proxy: {
      "/api": process.env.SIMULAB_ACCOUNT_API || "http://127.0.0.1:4320",
    },
  },
  optimizeDeps: {
    include: ["@simulab/engine", "@simulab/engine/esp32", "avr8js"],
  },
  test: { environment: "jsdom", include: ["src/**/*.test.{ts,tsx}"] },
});
