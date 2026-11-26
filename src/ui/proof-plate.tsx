/* eslint-disable @next/next/no-img-element -- A locally bundled, credited photographic sample. */
import { sample } from "../client/sample";

export function ProofPlate() {
  return <figure className="proof-plate">
    <div className="plate-key"><span><i /> Sample plate</span><span>HST / WFC3</span></div>
    <div className="plate-image">
      <img src={sample.url} width="1400" height="1632" fetchPriority="high" alt="Orange gas filaments radiate from the luminous blue core of the Butterfly Nebula" />
      <div className="plate-corners" aria-hidden="true"><i /><i /><i /><i /></div>
    </div>
    <figcaption><div><span className="micro">{sample.catalog}</span><strong>{sample.title}</strong></div>
      <div className="plate-swatches" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    </figcaption>
    <a className="plate-credit" href={sample.source}>{sample.credit}</a>
  </figure>;
}
