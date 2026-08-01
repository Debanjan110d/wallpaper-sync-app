export function imageKitLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  if (src && src.includes("imagekit.io")) {
    const cleanSrc = src.split("?")[0]; // remove any default query params
    return `${cleanSrc}?tr=w-${width},q-${quality || 75},f-auto`;
  }
  return src;
}
