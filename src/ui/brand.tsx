import Link from "next/link";
import { Aperture, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function BrandBar({ children }: { children?: ReactNode }) {
  return <header className="topbar">
    <div className="bar-inner">
      <Link href="/" className="brand"><span className="brand-icon"><Aperture size={21} strokeWidth={2.1} /></span><span>PixelForge <small>Studio</small></span></Link>
      <div className="bar-actions"><span className="local-badge"><ShieldCheck size={15} /> Local processing</span>{children}</div>
    </div>
  </header>;
}
