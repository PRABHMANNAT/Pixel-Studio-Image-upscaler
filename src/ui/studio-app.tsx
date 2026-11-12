"use client";

import { Archive, CircleAlert, CircleHelp, Moon, Pause, Play, RotateCcw, Square, Sun, Trash2, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { saveZip } from "../client/download";
import { readSettings, readTheme, saveSettings, setTheme, type Theme } from "../client/preferences";
import { Studio } from "../client/studio";
import { duration } from "../core/display";
import { defaults, type Settings } from "../core/settings";
import { BrandBar } from "./brand";
import { Button } from "./button";
import { IntakePanel } from "./intake-panel";
import { Preview } from "./preview";
import { QueuePanel } from "./queue-panel";
import { SettingsPanel } from "./settings-panel";

export function StudioApp() {
  const [studio] = useState(() => new Studio());
  const state = useSyncExternalStore(studio.subscribe, studio.snapshot, studio.serverSnapshot);
  const [settings, changeSettings] = useState(defaults);
  const [theme, changeTheme] = useState<Theme>("system");
  const [exporting, setExporting] = useState(false);

  useEffect(() => studio.connect(), [studio]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      changeSettings(readSettings());
      changeTheme(readTheme());
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!state.notice) return;
    const timer = setTimeout(studio.dismiss, 6500);
    return () => clearTimeout(timer);
  }, [state.notice, studio]);

  function preferences(value: Settings) {
    changeSettings(value);
    saveSettings(value);
  }
  function toggleTheme() {
    const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    const next = dark ? "light" : "dark";
    changeTheme(next);
    setTheme(next);
  }
  const ready = state.entries.filter(item => item.status === "ready").length;
  const errors = state.entries.filter(item => item.status === "failed" || item.status === "cancelled").length;
  const completed = state.entries.flatMap(item => item.output ? [{ path: item.output.path, blob: item.output.blob }] : []);
  const selected = state.entries.find(item => item.id === state.selected);
  const active = state.run !== "idle";
  async function zip() {
    setExporting(true);
    try { if (await saveZip(completed)) studio.notify("ZIP export is ready."); }
    catch (error) { studio.notify(error instanceof Error ? error.message : "The ZIP could not be saved."); }
    finally { setExporting(false); }
  }

  return <>
    <BrandBar><Button size="icon" variant="ghost" onClick={toggleTheme} aria-label="Toggle color theme">{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</Button></BrandBar>
    <main className="studio-wrap" id="main">
      <div className="workspace-heading">
        <div><p className="eyebrow"><span /> IMAGE WORKSPACE</p><h1>Image studio</h1>
          <p>Resize, enhance, and convert a whole batch in your browser.</p></div>
        <a className="help-link" href="#privacy"><CircleHelp size={16} /> Privacy &amp; compatibility</a>
      </div>
      <div className="workspace">
        <div className="workspace-main">
          <IntakePanel add={files => studio.add(files)} notify={message => studio.notify(message)} />
          <Preview key={selected?.id} entry={selected} />
          <QueuePanel entries={state.entries} selected={state.selected} select={id => studio.select(id)} remove={id => studio.remove(id)} />
        </div>
        <div className="workspace-side">
          <SettingsPanel settings={settings} change={preferences} capabilities={state.capabilities} locked={active} />
          <section className="panel batch" aria-label="Batch actions">
            <div className="panel-heading"><Archive size={17} /><h2>Batch &amp; export</h2></div>
            <div className="batch-body">
              <div className="batch-info" aria-live="polite">
                <span>{ready} ready · {completed.length} complete</span>
                {state.run === "paused" ? <span>Paused after current file</span> : state.remaining !== null && state.remaining > 0 ? <span>~{duration(state.remaining)} left</span> : null}
              </div>
              {!active && <Button variant="primary" disabled={!ready} onClick={() => studio.start(settings)}><Play size={16} /> Start batch</Button>}
              {state.run === "running" && <Button onClick={() => studio.pause()}><Pause size={16} /> Pause after this file</Button>}
              {state.run === "paused" && <Button variant="primary" onClick={() => studio.resume()}><Play size={16} /> Resume</Button>}
              {active && <Button onClick={() => studio.cancel()}><Square size={15} /> Cancel batch</Button>}
              <Button disabled={!completed.length || exporting} onClick={zip}><Archive size={16} /> {exporting ? "Preparing ZIP…" : "Download all as ZIP"}</Button>
              <div className="batch-secondary">
                <Button size="small" variant="ghost" disabled={!errors || active} onClick={() => studio.retry()}><RotateCcw size={14} /> Retry failed</Button>
                <Button size="small" variant="ghost" disabled={!completed.length || exporting} onClick={() => studio.clearCompleted()}><Trash2 size={14} /> Clear completed</Button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <details id="privacy" className="privacy panel">
        <summary><CircleAlert size={17} /> Privacy and compatibility</summary>
        <p>Images and exports stay in this tab. Only your settings and the verified AI model are saved locally; reloading clears the queue. AI mode downloads the model from Hugging Face, which receives a normal download request and no image data.</p>
        <p>Use a recent browser with workers and OffscreenCanvas. AVIF export appears only when an encoder is detected. Animated images and HEIC/HEIF are unsupported. Working limits depend on pixel count, format, and available memory.</p>
      </details>
    </main>
    {state.notice && <div className="toast" role="status"><span>{state.notice.text}</span><Button size="icon" variant="ghost" aria-label="Dismiss message" onClick={studio.dismiss}><X size={16} /></Button></div>}
  </>;
}
