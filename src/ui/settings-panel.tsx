import { Cpu, SlidersHorizontal, Sparkles, Zap } from "lucide-react";
import { formatName } from "../core/display";
import { formats, MAX_SIDE, type Format, type Preset, type Settings } from "../core/settings";

const options: Record<Preset, string> = {
  original: "Original size", "2x": "2× source", "4x": "4× source", "2k": "2K · 2560 × 1440",
  "4k": "4K UHD · 3840 × 2160", "4096": "4096 px long edge", custom: "Custom dimensions",
};
const order: Preset[] = ["original", "2x", "4x", "2k", "4k", "4096", "custom"];

export function SettingsPanel({ settings, change, capabilities, locked }: {
  settings: Settings; change: (value: Settings) => void; capabilities?: { formats: Format[]; gpu: boolean } | null; locked: boolean;
}) {
  const patch = (values: Partial<Settings>) => change({ ...settings, ...values });
  return <aside className="panel settings">
    <div className="panel-heading"><SlidersHorizontal size={17} /><h2>Processing settings</h2></div>
    <fieldset disabled={locked}>
      <legend className="sr-only">Processing settings</legend>
      <span className="field-label" id="engine-label">Processing mode</span>
      <div className="modes" role="radiogroup" aria-labelledby="engine-label">
        <label className="mode"><input type="radio" name="mode" value="resize" checked={settings.mode === "resize"} onChange={() => patch({ mode: "resize" })} /><Zap size={16} /> Fast Resize</label>
        <label className="mode"><input type="radio" name="mode" value="ai" checked={settings.mode === "ai"} onChange={() => patch({ mode: "ai", ...(settings.preset === "original" ? { preset: "2x" } : {}) })} /><Sparkles size={16} /> AI Upscale</label>
      </div>
      <p className="field-note">{settings.mode === "resize" ? "Lanczos resampling for resizing and format conversion." : "Real-ESRGAN 2× inference. The first run downloads a 64 MiB model. AI supports sources up to 3 megapixels and may be slow on CPU."}</p>
      <label className="field">Target size
        <select value={settings.preset} onChange={event => patch({ preset: event.target.value as Preset })}>
          {order.map(preset => <option key={preset} value={preset} disabled={preset === "original" && settings.mode === "ai"}>{options[preset]}</option>)}
        </select>
      </label>
      {settings.preset === "custom" && <>
        <div className="grid grid-cols-2 gap-2">
          <label className="field">Width<input type="number" min={1} max={MAX_SIDE} value={settings.width || ""} onChange={e => patch({ width: Number(e.target.value) })} /></label>
          <label className="field">Height<input type="number" min={1} max={MAX_SIDE} value={settings.height || ""} onChange={e => patch({ height: Number(e.target.value) })} /></label>
        </div>
        <label className="check"><input type="checkbox" checked={settings.lock} onChange={e => patch({ lock: e.target.checked })} /> Keep aspect ratio</label>
      </>}
      <label className="check"><input type="checkbox" checked={settings.allowDownscale} onChange={e => patch({ allowDownscale: e.target.checked })} /> Allow downscaling</label>
      <label className="field">Output format
        <select value={settings.format} onChange={event => patch({ format: event.target.value as Settings["format"] })}>
          <option value="original">Same as source</option>
          {formats.map(format => <option key={format} value={format} disabled={!capabilities?.formats.includes(format)}>{formatName(format)}{capabilities && !capabilities.formats.includes(format) ? " · unavailable" : ""}</option>)}
        </select>
      </label>
      <label className="field">
        <span className="flex justify-between gap-2">Output quality <output>{Math.round(settings.quality * 100)}%</output></span>
        <input type="range" min="0.1" max="1" step="0.01" value={settings.quality} disabled={settings.format === "image/png"} onChange={e => patch({ quality: Number(e.target.value) })} />
      </label>
      <p className="field-note">Quality applies to lossy formats. PNG stays lossless.</p>
      <label className="check"><input type="checkbox" checked={settings.sharpen} onChange={e => patch({ sharpen: e.target.checked })} /> Sharpen opaque details</label>
      <label className="check"><input type="checkbox" checked={settings.jpegMatte} onChange={e => patch({ jpegMatte: e.target.checked })} /> Allow white background for JPG</label>
    </fieldset>
    <div className="capability"><Cpu size={16} /><span>{capabilities === null ? "Browser capability check failed" : capabilities ? capabilities.gpu ? "WebGPU detected · WASM fallback" : "CPU inference via WebAssembly" : "Checking browser capabilities…"}</span></div>
  </aside>;
}
