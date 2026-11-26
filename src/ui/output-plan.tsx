import { cropRect, rotatedSize } from "../core/framing";
import { targetSize, type Dimensions, type Settings } from "../core/settings";

export function OutputPlan({ input, settings }: { input?: Dimensions; settings: Settings }) {
  if (!input) return null;
  const frame = rotatedSize(cropRect(input, settings.crop), settings.rotation);
  let summary: string;
  try {
    const size = targetSize(frame, settings);
    summary = size.width + " × " + size.height + " px";
    if (settings.mode === "ai" && size.width <= frame.width && size.height <= frame.height) summary = "Choose a larger size for AI Upscale.";
    else if (settings.mode === "ai" && frame.width * frame.height > 3_000_000) summary = "AI source exceeds 3 megapixels.";
  } catch (error) { summary = error instanceof Error ? error.message : "Check output dimensions."; }
  return <div className="plan-readout" aria-live="polite"><span>Planned output</span><strong>{summary}</strong></div>;
}
