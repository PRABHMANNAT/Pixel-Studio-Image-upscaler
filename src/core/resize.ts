import type { Dimensions } from "./settings";

const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
type Kernel = { start: number; weights: Float32Array };

function kernels(source: number, target: number): Kernel[] {
  const scale = Math.max(1, source / target);
  return Array.from({ length: target }, (_, i) => {
    const center = (i + 0.5) * source / target - 0.5;
    const start = Math.max(0, Math.ceil(center - 3 * scale));
    const end = Math.min(source - 1, Math.floor(center + 3 * scale));
    const weights = new Float32Array(end - start + 1);
    let total = 0;
    for (let j = start; j <= end; j++) {
      const x = (j - center) / scale;
      const w = sinc(x) * sinc(x / 3);
      weights[j - start] = w;
      total += w;
    }
    for (let j = 0; j < weights.length; j++) weights[j] /= total;
    return { start, weights };
  });
}

// Premultiply before filtering so invisible RGB cannot bleed into visible edges.
function pass(data: Uint8ClampedArray, source: Dimensions, target: number, axis: 0 | 1, first: boolean, last: boolean) {
  const { width, height } = source;
  const length = axis === 0 ? width : height;
  const lines = axis === 0 ? height : width;
  const inputStep = axis === 0 ? 4 : width * 4;
  const outputStep = axis === 0 ? 4 : width * 4;
  const inputLine = axis === 0 ? width * 4 : 4;
  const outputLine = axis === 0 ? target * 4 : 4;
  const output = new Uint8ClampedArray(target * lines * 4);
  const taps = kernels(length, target);
  for (let line = 0; line < lines; line++) {
    for (let p = 0; p < target; p++) {
      const { start, weights } = taps[p];
      let r = 0, g = 0, b = 0, a = 0;
      let src = line * inputLine + start * inputStep;
      for (let k = 0; k < weights.length; k++, src += inputStep) {
        const alpha = data[src + 3];
        const w = weights[k] * (first ? alpha / 255 : 1);
        r += w * data[src];
        g += w * data[src + 1];
        b += w * data[src + 2];
        a += weights[k] * alpha;
      }
      const dest = line * outputLine + p * outputStep;
      const factor = last ? (a < 0.5 ? 0 : 255 / Math.min(a, 255)) : 1;
      output[dest] = r * factor;
      output[dest + 1] = g * factor;
      output[dest + 2] = b * factor;
      output[dest + 3] = a;
    }
  }
  return output;
}

export function lanczos(data: Uint8ClampedArray, source: Dimensions, target: Dimensions, onPass?: () => void): Uint8ClampedArray {
  const { width, height } = source;
  if (target.width === width && target.height === height) return data;
  if (target.height === height) return pass(data, source, target.width, 0, true, true);
  if (target.width === width) return pass(data, source, target.height, 1, true, true);
  if (target.width * height <= target.height * width) {
    const intermediate = pass(data, source, target.width, 0, true, false);
    onPass?.();
    return pass(intermediate, { width: target.width, height }, target.height, 1, false, true);
  }
  const intermediate = pass(data, source, target.height, 1, true, false);
  onPass?.();
  return pass(intermediate, { width, height: target.height }, target.width, 0, false, true);
}

export function sharpenPixels(data: Uint8ClampedArray, { width, height }: Dimensions) {
  const result = data.slice();
  const stride = width * 4;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const p = y * stride + 4 * x;
    if ([p, p - 4, p + 4, p - stride, p + stride].some(i => data[i + 3] !== 255)) continue;
    for (let c = p; c < p + 3; c++) {
      result[c] = 1.48 * data[c] - 0.12 * (data[c - 4] + data[c + 4] + data[c - stride] + data[c + stride]);
    }
  }
  return result;
}
