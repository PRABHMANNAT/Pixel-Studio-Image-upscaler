import { Mesh, MeshBasicMaterial, OrthographicCamera, PlaneGeometry, Scene, SRGBColorSpace, Texture, WebGLRenderer } from "three";

export function createLoupe(canvas: HTMLCanvasElement, image: HTMLImageElement, diameter: number) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(diameter, diameter, false);
  const texture = new Texture(image);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  const geometry = new PlaneGeometry(2, 2);
  const material = new MeshBasicMaterial({ map: texture, toneMapped: false });
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2);
  camera.position.z = 1;
  return {
    render(x: number, y: number, width: number, height: number) {
      texture.repeat.set(diameter / width, diameter / height);
      texture.offset.set(x / width, 1 - (y + diameter) / height);
      renderer.render(scene, camera);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
