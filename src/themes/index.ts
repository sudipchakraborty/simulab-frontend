/** @brief Stable appearance IDs persisted by the host account service. */
export type ThemeId =
  | "corporate-navy"
  | "midnight"
  | "graphite"
  | "corporate-light"
  | "pearl"
  | "sand";
export type ColorScheme = "dark" | "light";
/** @brief Profiles contain appearance metadata only; no account authority. */
export const themeProfiles: readonly {
  id: ThemeId;
  label: string;
  scheme: ColorScheme;
}[] = [
  { id: "corporate-navy", label: "Corporate navy", scheme: "dark" },
  { id: "midnight", label: "Midnight", scheme: "dark" },
  { id: "graphite", label: "Graphite", scheme: "dark" },
  { id: "corporate-light", label: "Corporate light", scheme: "light" },
  { id: "pearl", label: "Pearl", scheme: "light" },
  { id: "sand", label: "Sand", scheme: "light" },
];
/** @brief Validate appearance data at external persistence boundaries. */
export function isThemeId(value: unknown): value is ThemeId {
  return themeProfiles.some((profile) => profile.id === value);
}
/** @brief Apply a profile and notify independently mounted editors.
 * @param id Valid profile identifier; untrusted invalid values fall back to navy.
 * @returns Applied profile identifier.
 */
export function applyTheme(id: ThemeId): ThemeId {
  const theme = isThemeId(id) ? id : "corporate-navy";
  const scheme = themeProfiles.find((profile) => profile.id === theme)!.scheme;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorScheme = scheme;
    document.documentElement.style.colorScheme = scheme;
    window.dispatchEvent(
      new CustomEvent("simulab-theme-change", { detail: { theme, scheme } }),
    );
  }
  return theme;
}
const cacheKey = "simulab.appearance.theme";
/** @brief Read an optional fast-start appearance mirror; account preference wins. */
export function readThemeCache(): ThemeId {
  try {
    const value = localStorage.getItem(cacheKey);
    return isThemeId(value) ? value : "corporate-navy";
  } catch {
    return "corporate-navy";
  }
}
/** @brief Mirror appearance only. Storage failure must not block theme changes. */
export function writeThemeCache(id: ThemeId): void {
  try {
    if (isThemeId(id)) localStorage.setItem(cacheKey, id);
  } catch {
    /* Storage may be blocked by browser policy. */
  }
}
export { ThemeSelector } from "./ThemeSelector";
