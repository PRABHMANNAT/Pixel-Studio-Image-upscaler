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
    </div>
  </details>;
}
