import { Palette } from "lucide-react";
import { themeProfiles, type ThemeId } from "./index";
/** @brief Controlled, reusable profile picker; host owns persistence and authority. */
export function ThemeSelector({
  value,
  onChange,
  disabled = false,
}: {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
  disabled?: boolean;
}) {
  return (
    <label className="theme-selector" title="Colour profile">
      <Palette size={15} aria-hidden="true" />
      <select
        aria-label="Colour profile"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ThemeId)}
      >
        {themeProfiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.label}
          </option>
        ))}
      </select>
    </label>
  );
}
