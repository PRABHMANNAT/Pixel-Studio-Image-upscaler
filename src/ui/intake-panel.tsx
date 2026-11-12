"use client";

import { FolderOpen, ImagePlus, Upload } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { captureDrop, picked, type IntakeFile } from "../client/intake";
import { Button } from "./button";

export function IntakePanel({ add, notify }: { add: (files: IntakeFile[]) => void; notify: (text: string) => void }) {
  const files = useRef<HTMLInputElement>(null);
  const folder = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [hover, setHover] = useState(false);
  async function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const collect = captureDrop(event.dataTransfer);
    depth.current = 0;
    setHover(false);
    try {
      const result = await collect();
      add(result.files);
      if (result.limited) notify("Only the first supported batch of entries was added. Add smaller folders in batches.");
      else if (result.errors) notify(result.errors + " dropped entries could not be read.");
      else if (!result.files.length) notify("No files found. Use Select Folder if folder drop is unavailable.");
    } catch { notify("These dropped files could not be read."); }
  }
  return <section className="panel intake" aria-label="Import images">
    <div className={"dropzone" + (hover ? " dropzone-hover" : "")}
      onDragEnter={event => { event.preventDefault(); depth.current++; if (event.dataTransfer.types.includes("Files")) setHover(true); }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={event => { event.preventDefault(); if (--depth.current <= 0) { depth.current = 0; setHover(false); } }}
      onDrop={drop}>
      <div className="drop-icon"><ImagePlus size={26} aria-hidden="true" /></div>
      <h2>Drop images or folders here</h2>
      <p>JPG, PNG, WebP or AVIF · up to 48 MiB per image</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="primary" onClick={() => files.current?.click()}><Upload size={16} /> Select images</Button>
        <Button onClick={() => folder.current?.click()}><FolderOpen size={17} /> Select Folder</Button>
      </div>
      <input ref={files} data-testid="file-input" aria-label="Select image files" type="file" accept=".jpg,.jpeg,.png,.webp,.avif" multiple hidden
        onChange={event => { if (event.target.files) add(picked(event.target.files)); event.target.value = ""; }} />
      <input ref={folder} data-testid="folder-input" aria-label="Select an image folder" type="file" multiple hidden {...{ webkitdirectory: "" }}
        onChange={event => { if (event.target.files) add(picked(event.target.files)); event.target.value = ""; }} />
    </div>
  </section>;
}
