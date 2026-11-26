import type { ControlProps } from "./framing-controls";

const controls = [
  { key: "exposure", label: "Exposure", min: -2, max: 2, step: 0.1, unit: " EV" },
  { key: "contrast", label: "Contrast", min: -100, max: 100, step: 1, unit: "%" },
  { key: "saturation", label: "Saturation", min: -100, max: 100, step: 1, unit: "%" },
] as const;

export function ToneControls({ settings, patch }: ControlProps) {
  return <details className="inspector-fold"><summary>Tone &amp; color</summary><div className="fold-body">
    {controls.map(({ key, label, min, max, step, unit }) => <label key={key} className="field">
      <span className="flex justify-between">{label}<output>{settings[key]}{unit}</output></span>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={settings[key]} onChange={e => patch({ [key]: Number(e.target.value) })} />
    </label>)}
    <button type="button" className="text-control" onClick={() => patch({ exposure: 0, contrast: 0, saturation: 0 })}>Reset tone</button>
  </div></details>;
}
