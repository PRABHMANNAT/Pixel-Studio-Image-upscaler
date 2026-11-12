import type { Metadata } from "next";
import { StudioApp } from "../../src/ui/studio-app";

export const metadata: Metadata = { title: "Image workspace" };
export default function StudioPage() { return <StudioApp />; }
