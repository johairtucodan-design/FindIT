import sharp from "sharp";

// Leave space for multipart fields under Vercel's 4.5 MB request limit.
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function preparePhoto(file: File) {
  if (file.size > MAX_PHOTO_BYTES) throw new Error("Photo must be 4 MiB or smaller.");
  if (!PHOTO_TYPES.includes(file.type)) throw new Error("Choose a JPEG, PNG or WebP image.");
  try {
    const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 25_000_000 });
    const metadata = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(metadata.format ?? "")) throw new Error("Unsupported image");
    return await image.rotate().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new Error("This image could not be read. Choose a valid JPEG, PNG or WebP under 25 megapixels.");
  }
}
