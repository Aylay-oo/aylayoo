import type { Context } from 'hono';
import type { z } from 'zod';

// Reads the JSON body and validates it. Returns either { data } or { error: Response }.
export async function readJson<T extends z.ZodType>(c: Context, schema: T) {
  const body = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { error: c.json({ error: 'Invalid data', details: parsed.error.issues }, 400) } as const;
  }
  return { data: parsed.data as z.infer<T> } as const;
}

export function parseId(value: string | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// workers-types declares FormData.get() as `string | null`, but a file part really
// does come back as a File at runtime — hence the cast.
export function getFile(form: FormData, field: string): File | null {
  const value = form.get(field) as unknown as File | string | null;
  if (!value || typeof value === 'string' || value.size === 0) return null;
  return value;
}

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

// Uploads an image File to R2 and returns its public API path, or an error message.
export async function uploadImage(bucket: R2Bucket, file: File, folder: string) {
  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return { error: 'Only JPG, PNG or WEBP images are allowed' } as const;
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Image must be smaller than 5 MB' } as const;

  const key = `${folder}/${crypto.randomUUID()}.${ext}`;
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return { url: `/api/images/${key}` } as const;
}
