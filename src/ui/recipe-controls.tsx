import { useState } from "react";
import { defaults, restoreSettings, type Settings } from "../core/settings";

const recipes: Record<string, Partial<Settings>> = {
  "Web delivery": { preset: "custom", width: 1600, height: 1600, allowDownscale: true, format: "image/webp", quality: 0.82 },
  "Monochrome print": { preset: "original", saturation: -100, format: "image/png" },
  "Pixel art 4×": { preset: "4x", sampler: "nearest", format: "image/png" },
};
const storageKey = "pixelforge:personal-recipe:v1";

export function RecipeControls({ settings, change }: { settings: Settings; change: (value: Settings) => void }) {
  const [message, setMessage] = useState("");
  function apply(name: string) {
    if (name === "saved") {
      try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) { setMessage("Save your current settings to create a personal recipe."); return; }
        change(restoreSettings(saved));
      } catch { setMessage("Your browser could not read the saved recipe."); return; }
    } else {
      change({ ...defaults, ...recipes[name] });
    }
    setMessage(name === "saved" ? "Applied your saved recipe." : "Applied " + name + ".");
  }
  function save() {
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); setMessage("Saved your current settings on this device."); }
    catch { setMessage("Your browser could not save this recipe."); }
  }
  return <div className="recipes">
    <label className="field">Processing recipe<select value="" onChange={e => apply(e.target.value)}>
      <option value="" disabled>Choose a recipe…</option>
      {Object.keys(recipes).map(name => <option key={name}>{name}</option>)}
      <option value="saved">My saved recipe</option><option value="default">Studio defaults</option>
    </select></label>
    <button type="button" className="text-control" onClick={save}>Save current recipe</button>
    {message && <p role="status" className="field-note">{message}</p>}
  </div>;
}
