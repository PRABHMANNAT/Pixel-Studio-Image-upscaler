import { useEffect, useState } from "react";
import { luminanceBins } from "../core/histogram";

function Plot({ url }: { url: string }) {
  const [bins, setBins] = useState<number[]>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    const image = new Image();
    image.src = url;
    image.decode().then(() => {
      if (!current) return;
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, 256 / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error();
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      setBins(luminanceBins(ctx.getImageData(0, 0, canvas.width, canvas.height).data));
    }).catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [url]);
  if (!bins) return <p>{failed ? "Histogram unavailable for this proof." : "Reading proof…"}</p>;
  const peak = Math.max(1, ...bins);
  return <div className="histogram-plot" role="img" aria-label="32 luminance bins, from shadows on the left to highlights on the right">
    {bins.map((count, index) => <i key={index} style={{ height: (100 * count / peak) + "%" }} />)}
  </div>;
}

export function Histogram({ source, output }: { source: string; output?: string }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState("source");
  const url = channel === "output" && output ? output : source;
  return <details className="scope" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary>Luminance histogram</summary>{open && <div>
      <label>Sampled proof <select aria-label="Histogram image" value={channel} onChange={e => setChannel(e.target.value)}>
        <option value="source">Original</option>{output && <option value="output">Output</option>}
      </select></label>
      <Plot key={url} url={url} /><div className="scope-axis"><span>Shadows</span><span>Highlights</span></div>
    </div>}
  </details>;
}
