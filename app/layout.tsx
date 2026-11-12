import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PixelForge Studio", template: "%s | PixelForge Studio" },
  description: "Resize, convert and upscale batches of images privately, right in your browser.",
  icons: { icon: "/mark.svg" },
};

const theme = "try{let t=localStorage.getItem('pixelforge:theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch{}";

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: theme }} /></head>
    <body><a className="skip-link" href="#main">Skip to main content</a>{children}</body></html>;
}
