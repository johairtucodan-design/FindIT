import { preparePhoto } from "./photo.ts";

export type ItemPhotoBucket = {
  upload(path: string, body: Buffer, options: { contentType: string; upsert: boolean }): Promise<{ error: unknown }>;
  createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
  remove(paths: string[]): Promise<{ error: unknown }>;
};

export async function uploadReportPhoto(bucket: ItemPhotoBucket, reporterId: string, file: File) {
  const bytes = await preparePhoto(file);
  const path = `${reporterId}/${crypto.randomUUID()}.webp`;
  const { error } = await bucket.upload(path, bytes, { contentType: "image/webp", upsert: false });
  if (error) throw new Error("Photo upload failed. Please try again. Your report has not been saved.");
  return path;
}

export async function signReportPhoto(bucket: ItemPhotoBucket, path: string) {
  const { data, error } = await bucket.createSignedUrl(path, 300);
  return error ? null : data?.signedUrl ?? null;
}

export async function removeReportPhoto(bucket: ItemPhotoBucket, path: string) {
  const { error } = await bucket.remove([path]);
  return !error;
}
