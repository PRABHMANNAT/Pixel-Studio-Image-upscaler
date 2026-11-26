import type { Settings } from "../core/settings";

export type ControlProps = { settings: Settings; patch: (value: Partial<Settings>) => void };

export function FramingControls({ settings, patch }: ControlProps) {
  return <details className="inspector-fold">
    <summary>Crop &amp; framing</summary>
    <div className="fold-body">
      <label className="field">Center crop
        <select value={settings.crop} onChange={e => patch({ crop: e.target.value as Settings["crop"] })}>
          <option value="source">Full frame</option>
          {(["1:1", "4:5", "3:2", "16:9"] as const).map(ratio => <option key={ratio}>{ratio}</option>)}
        </select>
      </label>
      <label className="field">Rotate clockwise
        <select value={settings.rotation} onChange={e => patch({ rotation: Number(e.target.value) as Settings["rotation"] })}>
          {[0, 90, 180, 270].map(angle => <option key={angle} value={angle}>{angle}°</option>)}
        </select>
      </label>
      <label className="check"><input type="checkbox" checked={settings.mirror} onChange={e => patch({ mirror: e.target.checked })} /> Mirror horizontally</label>
    </div>
  </details>;
}
