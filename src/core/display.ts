export function bytes(value: number) {
  if (value < 1024) return value + " B";
  if (value < 1024 ** 2) return (value / 1024).toFixed(1) + " KB";
  return (value / 1024 ** 2).toFixed(1) + " MB";
}
export function formatName(value: string) {
  return value === "image/jpeg" ? "JPG" : value.replace("image/", "").toUpperCase();
}
export function duration(value: number) {
  return value >= 60 ? Math.floor(value / 60) + "m " + value % 60 + "s" : value + "s";
}
