import { supabase } from "@/lib/supabase";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export function validateImage(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return `"${file.name}" isn't a supported image type (use JPEG, PNG, WebP or AVIF).`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `"${file.name}" is larger than 8 MB — please use a smaller image.`;
  }
  return null;
}

async function compressImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode-failed"));
    image.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  return await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/jpeg", JPEG_QUALITY);
  });
}

export async function uploadPropertyImage(
  file: File,
  ownerId: string,
  propertyId: string,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const validationError = validateImage(file);
  if (validationError) throw new Error(validationError);

  const blob = await compressImage(file);
  const path = `${ownerId}/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabase.storage
    .from("property-images")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });

  if (error) throw new Error(error.message);

  onProgress?.(1);

  const { data: publicUrlData } = supabase.storage.from("property-images").getPublicUrl(path);
  return publicUrlData.publicUrl;
}

export async function deletePropertyImage(path: string): Promise<void> {
  const clean = path.replace(/^\/+/, "").replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/public\/property-images\//, "");
  const { error } = await supabase.storage.from("property-images").remove([clean]);
  if (error) console.error("Failed to delete image:", error.message);
}

export function storagePathFromPublicUrl(url: string): string {
  const marker = "/property-images/";
  const idx = url.indexOf(marker);
  return idx >= 0 ? url.slice(idx + marker.length) : url;
}