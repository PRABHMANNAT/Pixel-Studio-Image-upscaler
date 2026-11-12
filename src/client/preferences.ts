import { defaults, restoreSettings, type Settings } from "../core/settings";

export type Theme = "light" | "dark" | "system";
const settingsKey = "pixelforge:settings:v1";
const themeKey = "pixelforge:theme";

export function readSettings() {
  try { return restoreSettings(localStorage.getItem(settingsKey)); } catch { return defaults; }
}
export function saveSettings(settings: Settings) {
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { /* Storage can be disabled. */ }
}
export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(themeKey);
    if (value === "light" || value === "dark") return value;
  } catch { /* Use system preference. */ }
  return "system";
}
export function setTheme(theme: Theme) {
  try { localStorage.setItem(themeKey, theme); } catch { /* The session theme still applies. */ }
  document.documentElement.dataset.theme = theme;
}
