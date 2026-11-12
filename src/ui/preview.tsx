/* eslint-disable @next/next/no-img-element -- Local object URLs are never sent to an image optimization server. */
import { ImageIcon, ScanLine, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useRef, useState, type PointerEvent } from "react";
import { bytes } from "../core/display";
import type { Entry } from "../core/queue";
import { Button } from "./button";

export function Preview({ entry }: { entry?: Entry }) {
  const [split, setSplit] = useState(50);
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
  return <section className="panel preview" aria-label="Image preview">
    <div className="panel-heading"><ScanLine size={18} /><h2>Preview</h2>
      {entry?.input && <div className="preview-tools">
        <Button variant="ghost" size="icon" aria-label="Zoom out" disabled={zoom === 1} onClick={() => zoomTo(Math.max(1, zoom - 0.25))}><ZoomOut size={16} /></Button>
        <span>{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" aria-label="Zoom in" disabled={zoom === 3} onClick={() => zoomTo(Math.min(3, zoom + 0.25))}><ZoomIn size={16} /></Button>
        <Button variant="ghost" size="icon" aria-label="Reset preview" onClick={() => { zoomTo(1); setSplit(50); }}><RotateCcw size={15} /></Button>
      </div>}
    </div>
    {!entry?.input ? <div className="preview-empty">
      <div className="preview-mark"><ImageIcon size={29} strokeWidth={1.4} /></div>
      <strong>No image selected</strong><p>Import an image to preview it here.</p>
    </div> : <>
      <div className={"preview-surface" + (zoom > 1 ? " panning" : "")}
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
          <img draggable={false} src={entry.input.preview} alt="Original preview" />
        </div>
        {entry.output && <>
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
    </>}
  </section>;
}
