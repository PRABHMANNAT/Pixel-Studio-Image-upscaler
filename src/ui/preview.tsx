/* eslint-disable @next/next/no-img-element -- Local object URLs are never sent to an image optimization server. */
import { Histogram } from "./histogram";
import { sample } from "../client/sample";
import { ScanLine, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { bytes } from "../core/display";
import type { Entry } from "../core/queue";
import { Button } from "./button";

export function Preview({ entry, addSample }: { entry?: Entry; addSample: () => Promise<void> }) {
  const [loadingSample, setLoadingSample] = useState(false);
  const [split, setSplit] = useState(50);
  const [view, setView] = useState("split");
  const [ground, setGround] = useState("checker");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const zoomTo = (value: number) => { setZoom(value); if (value === 1) setPan({ x: 0, y: 0 }); };
  function panTo(surface: HTMLElement, x: number, y: number) {
    const maxX = surface.clientWidth * zoom / 2;
    const maxY = surface.clientHeight * zoom / 2;
    setPan({ x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) });
  }
  function begin(event: PointerEvent<HTMLDivElement>) {
    if (zoom === 1 || (event.target as HTMLElement).closest("input")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
  }
  return <section id="light-table" className="panel preview" aria-label="Image preview">
    <div className="panel-heading"><ScanLine size={18} /><h2>Light table</h2>
      {entry?.input && <div className="preview-tools">
        <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={zoom === 1} onClick={() => zoomTo(Math.max(1, zoom - 0.25))}><ZoomOut size={16} /></Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={zoom === 3} onClick={() => zoomTo(Math.min(3, zoom + 0.25))}><ZoomIn size={16} /></Button>
        <Button variant="ghost" size="icon" aria-label="Reset preview" onClick={() => { zoomTo(1); setSplit(50); }}><RotateCcw size={15} /></Button>
      </div>}
    </div>
    {!entry?.input ? <div className="preview-empty">
      <img className="sample-frame" src={sample.url} alt="The orange wings and blue core of the Butterfly Nebula" />
      <div className="sample-caption"><span className="micro">Sample image · {sample.catalog}</span>
        <strong>{sample.title}</strong>
        <Button disabled={loadingSample} onClick={async () => { setLoadingSample(true); try { await addSample(); } finally { setLoadingSample(false); } }}>{loadingSample ? "Loading sample…" : "Use sample image"}</Button>
        <a href={sample.source}>{sample.credit}</a>
      </div>
    </div> : <>
      <div className="proof-controls">
        {entry.output && <label>View <select aria-label="Comparison view" value={view} onChange={e => setView(e.target.value)}>
          <option value="split">Split comparison</option><option value="original">Original only</option><option value="output">Output only</option>
        </select></label>}
        <label>Backdrop <select aria-label="Preview backdrop" value={ground} onChange={e => setGround(e.target.value)}>
          <option value="checker">Checkerboard</option><option value="light">White</option><option value="dark">Black</option>
        </select></label>
      </div>
      <div data-ground={ground} className={"preview-surface" + (zoom > 1 ? " panning" : "")}
        tabIndex={zoom > 1 ? 0 : undefined} role="group"
        aria-label={zoom > 1 ? "Zoomed image. Use the arrow keys to pan." : "Image comparison"}
        onKeyDown={event => {
          if (zoom === 1 || event.target !== event.currentTarget) return;
          const step = event.shiftKey ? 64 : 16;
          const delta = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key];
          if (!delta) return;
          event.preventDefault();
          panTo(event.currentTarget, pan.x + delta[0], pan.y + delta[1]);
        }}
        onPointerDown={begin}
        onPointerMove={event => {
          if (!drag.current) return;
          panTo(event.currentTarget, event.clientX - drag.current.x, event.clientY - drag.current.y);
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <div className="preview-layer" style={{ transform: "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")" }}>
          <img draggable={false} src={view === "output" && entry.output ? entry.output.preview : entry.input.preview} alt={view === "output" && entry.output ? "Processed preview" : "Original preview"} />
        </div>
        {entry.output && view === "split" && <>
          <div className="preview-mask" style={{ clipPath: "inset(0 0 0 " + split + "%)" }}>
            <div className="preview-layer" style={{ transform: "translate(" + pan.x + "px," + pan.y + "px) scale(" + zoom + ")" }}>
              <img draggable={false} src={entry.output.preview} alt="Processed preview" />
            </div>
          </div>
          <span className="divider" style={{ left: split + "%" }} aria-hidden="true"><b>‹ ›</b></span>
          <input className="compare-range" type="range" min={0} max={100} value={split} aria-label="Before and after comparison" onChange={event => setSplit(Number(event.target.value))} />
          <span className="preview-tag before">Original</span><span className="preview-tag after">Output</span>
        </>}
      </div>
      <div className="preview-meta">
        <span>Original: {entry.input.width} × {entry.input.height} · {bytes(entry.file.size)}</span>
        {entry.output && <span>Output: {entry.output.width} × {entry.output.height} · {bytes(entry.output.blob.size)}</span>}
      </div>
      <Histogram source={entry.input.preview} output={entry.output?.preview} />
    </>}
  </section>;
}
