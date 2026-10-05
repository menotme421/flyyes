// WHY: Local image handling keeps everything offline + $0.
// URL images must be https; uploads are compressed via canvas so IndexedDB stays under 5MB.
// SVG rejected in V1 (script-in-image XSS risk).

const MAX_IMAGE_BYTES = 1_500_000;
const MAX_DIMENSION = 1600;

export interface CompressedImage {
  dataUrl: string;
  // WHY: True pixel size feeds aspect-correct DOCX sizing (1px = 0.75pt).
  naturalWidth: number;
  naturalHeight: number;
}

export async function fileToCompressedDataUrl(file: File): Promise<CompressedImage> {
  if (!/^image\/(png|jpeg|jpg|gif|webp)$/i.test(file.type)) {
    throw new Error("Only PNG, JPG, GIF, or WebP images are allowed.");
  }
  if (file.size > 8_000_000) throw new Error("Image is larger than 8MB.");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not process image in this browser.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WHY: Re-encode (strips EXIF/location) + JPEG for photos keeps bytes small.
  let dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  if (dataUrl.length > MAX_IMAGE_BYTES) {
    dataUrl = canvas.toDataURL("image/jpeg", 0.65);
  }
  if (dataUrl.length > 4_000_000) {
    throw new Error("Image is still too large after compression. Use a smaller image.");
  }
  return { dataUrl, naturalWidth: width, naturalHeight: height };
}
