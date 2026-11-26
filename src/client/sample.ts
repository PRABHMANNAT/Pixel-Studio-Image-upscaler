export const sample = {
  url: "/samples/butterfly-nebula.jpg",
  title: "Butterfly Nebula",
  catalog: "NGC 6302",
  credit: "NASA, ESA and the Hubble SM4 ERO Team",
  source: "https://esahubble.org/images/heic0910h/",
} as const;

export async function sampleFile() {
  const response = await fetch(sample.url);
  if (!response.ok) throw new Error("The sample could not be loaded. Try again or add your own image.");
  const file = new File([await response.blob()], "butterfly-nebula.jpg", { type: "image/jpeg" });
  return { file, path: file.name };
}
