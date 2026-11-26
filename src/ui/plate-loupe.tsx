"use client";

import { animate } from "motion/mini";
import { ScanSearch } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { createLoupe } from "./loupe-renderer";

type Renderer = ReturnType<typeof createLoupe>;
const diameter = 126;

export function PlateLoupe({ children }: { children: ReactNode }) {
  const frame = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const position = useRef({ x: 0.52, y: 0.48 });
  const repaint = useRef<() => void>(() => {});

  useEffect(() => {
    const host = frame.current, lens = glass.current, output = canvas.current;
    const image = host?.querySelector("img");
    if (!open || !host || !lens || !image || !output) return;
    let active = true;
    let gpu: Renderer | undefined;
    const draw = () => {
      if (!image.naturalWidth || !host.clientWidth) return;
      const scale = Math.max(host.clientWidth / image.naturalWidth, host.clientHeight / image.naturalHeight);
      const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
      const x = Math.max(diameter / 2, Math.min(host.clientWidth - diameter / 2, host.clientWidth * position.current.x));
      const y = Math.max(diameter / 2, Math.min(host.clientHeight - diameter / 2, host.clientHeight * position.current.y));
      const left = 2 * (x + (w - host.clientWidth) * 0.5) - diameter / 2;
      const top = 2 * (y + (h - host.clientHeight) * 0.47) - diameter / 2;
      lens.style.left = x + "px";
      lens.style.top = y + "px";
      lens.style.backgroundImage = 'url("' + image.src + '")';
      lens.style.backgroundSize = (2 * w) + "px " + (2 * h) + "px";
      lens.style.backgroundPosition = -left + "px " + -top + "px";
      gpu?.render(left, top, 2 * w, 2 * h);
    };
    repaint.current = draw;
    const observer = new ResizeObserver(draw);
    observer.observe(host);
    const motion = matchMedia("(prefers-reduced-motion: reduce)").matches ? undefined :
      animate(lens, { opacity: [0, 1] }, { duration: 0.16 });
    void Promise.all([image.decode(), import("./loupe-renderer")]).then(([, module]) => {
      if (!active) return;
      gpu = module.createLoupe(output, image, diameter);
      draw();
      output.hidden = false;
    }).catch(() => { if (active) draw(); });
    function lost(event: Event) { event.preventDefault(); if (output) output.hidden = true; }
    output.addEventListener("webglcontextlost", lost);
    draw();
    return () => {
      active = false;
      observer.disconnect();
      motion?.stop();
      output.removeEventListener("webglcontextlost", lost);
      gpu?.dispose();
      repaint.current = () => {};
    };
  }, [open]);

  return <div className="plate-image" ref={frame} onPointerMove={e => {
    if (!open || e.pointerType === "touch") return;
    const bounds = e.currentTarget.getBoundingClientRect();
    position.current = { x: (e.clientX - bounds.left) / bounds.width, y: (e.clientY - bounds.top) / bounds.height };
    repaint.current();
  }} onPointerDown={e => {
    if (!open || (e.target as Element).closest("button")) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    position.current = { x: (e.clientX - bounds.left) / bounds.width, y: (e.clientY - bounds.top) / bounds.height };
    repaint.current();
  }}>
    {children}
    {open && <div className="optical-glass" ref={glass} aria-hidden="true" style={{ width: diameter, height: diameter }}>
      <canvas ref={canvas} hidden /><span>2×</span>
    </div>}
    <button type="button" className="loupe-switch" aria-pressed={open} aria-label="Inspect with 2× loupe"
      aria-describedby={open ? "loupe-help" : undefined} onClick={() => setOpen(!open)} onKeyDown={e => {
        if (!open) return;
        if (e.key === "Escape") { setOpen(false); return; }
        const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (!delta) return;
        e.preventDefault();
        const p = position.current;
        p.x = Math.max(0, Math.min(1, p.x + delta[0] * 0.08));
        p.y = Math.max(0, Math.min(1, p.y + delta[1] * 0.08));
        repaint.current();
      }}><ScanSearch size={16} />{open ? "Close loupe" : "2× loupe"}</button>
    {open && <span className="sr-only" id="loupe-help">Move the pointer, tap the image, or use the arrow keys to inspect. Escape closes the loupe.</span>}
  </div>;
}
