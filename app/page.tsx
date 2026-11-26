import { Aperture, Focus, Images, ScanLine } from "lucide-react";
import { BrandBar } from "../src/ui/brand";
import { ProofPlate } from "../src/ui/proof-plate";
import "./darkroom.css";

export default function Home() {
  return <div className="darkroom-home">
    <BrandBar><a className="header-link" href="#instruments">Tools</a><a className="nav-launch" href="/studio/">Open studio</a></BrandBar>
    <main id="main">
      <section className="frontispiece">
        <div className="front-inner">
          <div className="front-copy">
            <div className="lab-kicker"><span aria-hidden="true" /> Browser-based image lab</div>
            <h1>Digital<br /><em>darkroom.</em></h1>
            <p>Enlarge, grade, and proof your images. A private workbench for a single frame or an entire folder.</p>
            <div className="launch-actions"><a className="launch-main" href="/studio/"><Aperture size={20} /> Open image studio</a>
              <a className="launch-sample" href="/studio/?sample=nebula">Try the sample</a></div>
            <div className="format-strip" aria-label="Supported formats"><span>Accepts</span> JPG <i /> PNG <i /> WEBP <i /> AVIF</div>
          </div>
          <ProofPlate />
        </div>
      </section>
      <section className="instruments" id="instruments" aria-labelledby="instrument-title">
        <div className="instrument-intro"><p className="micro">Inside the studio</p><h2 id="instrument-title">Tools of the trade.</h2></div>
        <div className="instrument-list">
          <article><Focus /><div><h3>Frame &amp; enlarge</h3><p>Crop a series to one ratio, preserve pixel-art edges, or enlarge photographs with Real-ESRGAN.</p></div></article>
          <article><ScanLine /><div><h3>Grade &amp; proof</h3><p>Balance exposure and color, inspect the histogram, and compare the encoded image against its source.</p></div></article>
          <article><Images /><div><h3>Batch &amp; deliver</h3><p>Save a recipe, keep your folder structure, and download your exports with a file-by-file report.</p></div></article>
        </div>
      </section>
    </main>
    <footer className="lab-footer"><strong>PixelForge Studio</strong><span>Local image processing</span><a href="https://github.com/PRABHMANNAT/Pixel-Studio-Image-upscaler">GitHub</a></footer>
  </div>;
}
