import { afterEach, expect, it } from "vitest";
import {
  applyTheme,
  readThemeCache,
  themeProfiles,
  writeThemeCache,
  type ThemeId,
} from "./index";
afterEach(() => {
  localStorage.clear();
  applyTheme("corporate-navy");
});
it("notifies independent editors with the applied scheme for every profile", () => {
  const events: unknown[] = [];
  const listener = (event: Event) => events.push((event as CustomEvent).detail);
  window.addEventListener("simulab-theme-change", listener);
  try {
    for (const profile of themeProfiles) {
      applyTheme(profile.id);
      expect(document.documentElement.dataset.theme).toBe(profile.id);
      expect(document.documentElement.dataset.colorScheme).toBe(profile.scheme);
      expect(document.documentElement.style.colorScheme).toBe(profile.scheme);
      expect(events.at(-1)).toEqual({
        theme: profile.id,
        scheme: profile.scheme,
      });
    }
  } finally {
    window.removeEventListener("simulab-theme-change", listener);
  }
});
it("restores only a valid cached appearance and rejects corrupt external preferences", () => {
  writeThemeCache("pearl");
  expect(readThemeCache()).toBe("pearl");
  localStorage.setItem("simulab.appearance.theme", "{invalid}");
  expect(readThemeCache()).toBe("corporate-navy");
  expect(applyTheme("invalid" as ThemeId)).toBe("corporate-navy");
  expect(localStorage.length).toBe(1);
});
