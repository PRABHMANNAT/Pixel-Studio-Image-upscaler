/* eslint-disable @next/next/no-img-element -- Thumbnails use browser-local object URLs. */
import { Download, Images, List, X } from "lucide-react";
import { bytes, formatName } from "../core/display";
import { leaf } from "../core/paths";
import type { Entry, Status } from "../core/queue";
import { download } from "../client/download";
import { Button } from "./button";

const statusNames: Record<Status, string> = {
  inspecting: "Reading", ready: "Ready", working: "Processing", done: "Completed", failed: "Failed", cancelled: "Cancelled",
};

export function QueuePanel({ entries, selected, select, remove }: {
  entries: Entry[]; selected?: string; select: (id: string) => void; remove: (id: string) => void;
}) {
  return <section className="panel queue" aria-label="Image queue">
    <div className="panel-heading"><List size={18} /><h2>Image queue</h2><span className="count">{entries.length}</span></div>
    {entries.length ? <ul className="queue-list">
      {entries.map(entry => <li key={entry.id} className={entry.id === selected ? "queue-row queue-selected" : "queue-row"}>
        <button type="button" className="queue-select" onClick={() => select(entry.id)} aria-pressed={selected === entry.id}>
          <span className="thumbnail">{entry.input ? <img src={entry.input.thumbnail} alt="" /> : <Images size={18} />}</span>
          <span className="queue-name"><strong title={entry.path}>{leaf(entry.path)}</strong>
            <span>{entry.input ? formatName(entry.input.format) + " · " + entry.input.width + " × " + entry.input.height + " · " : ""}{bytes(entry.file.size)}</span>
            {entry.path.includes("/") && <small title={entry.path}>{entry.path}</small>}
          </span>
        </button>
        <span className={"status status-" + entry.status}>{statusNames[entry.status]}{entry.status === "working" ? " " + Math.round(entry.progress * 100) + "%" : ""}</span>
        <span className="row-actions">
          {entry.output && <Button variant="ghost" size="icon" aria-label={"Download " + leaf(entry.output.path)} onClick={() => download(entry.output!.blob, leaf(entry.output!.path))}><Download size={16} /></Button>}
          <Button variant="ghost" size="icon" aria-label={"Remove " + leaf(entry.path)} disabled={entry.status === "working"} onClick={() => remove(entry.id)}><X size={16} /></Button>
        </span>
        {(entry.phase || entry.error || entry.output?.provider) && <span className={entry.error ? "row-message error-text" : "row-message"}>{entry.error || entry.phase || "Real-ESRGAN · " + entry.output?.provider?.toUpperCase()}</span>}
        {entry.status === "working" && <progress className="row-progress" aria-label={"Processing " + leaf(entry.path)} max={1} value={entry.progress} />}
      </li>)}
    </ul> : <div className="queue-empty"><Images size={21} /><p>Your queue is empty. Add images to get started.</p></div>}
  </section>;
}
