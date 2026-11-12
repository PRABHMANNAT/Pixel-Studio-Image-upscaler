import Link from "next/link";
import { ArrowRight, Cpu, FolderTree, ImageIcon, ShieldCheck } from "lucide-react";
import { BrandBar } from "../src/ui/brand";

export default function Home() {
  return <>
    <BrandBar><Link className="header-link" href="/studio/">Open studio <ArrowRight size={15} /></Link></BrandBar>
    <main className="landing" id="main">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow"><span /> PRIVATE BY DESIGN</p>
          <h1>Better images.<br /><em>Still yours.</em></h1>
          <p>Resize, convert, and upscale entire folders of images. Everything runs in your browser, and your files stay on your device.</p>
          <Link className="button button-primary button-default hero-action" href="/studio/">Open image studio <ArrowRight size={18} /></Link>
          <small>Free to use · No account required</small>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-art-top"><span><i /><i /><i /></span><span>PIXELFORGE / LOCAL</span></div>
          <div className="hero-grid">
            <div className="art-tile art-back" /><div className="art-tile art-front"><ImageIcon size={56} strokeWidth={1} /></div>
            <span className="art-label art-label-top">SOURCE / 01</span><span className="art-label art-label-bottom">OUTPUT / 02</span>
          </div>
          <div className="hero-art-bottom"><span>IMAGE PROCESSOR</span><span><i /> READY</span></div>
        </div>
      </section>
      <section className="features" aria-label="Studio features">
        <article><FolderTree size={22} /><h2>Whole folders, intact</h2><p>Keep nested folders organized when you download the batch as a ZIP.</p></article>
        <article><Cpu size={22} /><h2>Two ways to upscale</h2><p>Use Lanczos for fast resizing, or try Real-ESRGAN for AI enhancement.</p></article>
        <article><ShieldCheck size={22} /><h2>No image uploads</h2><p>Your files are processed on your device and originals stay untouched.</p></article>
      </section>
    </main>
    <footer className="landing-foot">PixelForge Studio <span>Image processing on your device</span></footer>
  </>;
}
