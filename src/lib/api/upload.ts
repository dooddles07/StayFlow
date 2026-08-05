import { api } from './client'

interface UploadSignature {
  cloudName: string
  apiKey: string
  allowedFormats: string
  folder: string
  publicId: string
  timestamp: number
  signature: string
}

export class UploadUnavailableError extends Error {}

// Cloudinary enforces the format list server-side through the signature; this
// check exists only so an obviously wrong file fails instantly with a sentence
// the user understands instead of a provider error round-trip.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Photos go browser -> Cloudinary directly. The API only signs the upload, so a
// multi-megabyte file never travels through our request body or lands in a
// Postgres column. Returns the hosted URL to store in the resource's `image`.
export async function uploadPhoto(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Please choose a JPG, PNG or WebP image.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is over 5 MB. Please choose a smaller one.')
  }

  let signed: UploadSignature
  try {
    signed = await api.post<UploadSignature>('/uploads/signature', {})
  } catch (err) {
    // 503 means the deployment has no Cloudinary credentials configured; the
    // caller falls back to asking for a URL rather than failing the edit.
    if (err instanceof Error && 'status' in err && err.status === 503) {
      throw new UploadUnavailableError('Photo uploads are not configured.')
    }
    throw err
  }

  // Every field here except `file` and `api_key` is part of the signed string,
  // so the names and values must match what the server signed exactly or
  // Cloudinary answers "Invalid Signature".
  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signed.apiKey)
  form.append('allowed_formats', signed.allowedFormats)
  form.append('folder', signed.folder)
  form.append('public_id', signed.publicId)
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: 'POST', body: form },
  )

  const body = (await res.json().catch(() => ({}))) as {
    secure_url?: string
    error?: { message?: string }
  }

  if (!res.ok || !body.secure_url) {
    // Cloudinary says exactly what is wrong ("Invalid Signature", "Unknown API
    // key", a permissions refusal). Showing the user a flat "try again" and
    // dropping that on the floor makes an operator error indistinguishable from
    // a corrupt file, so the reason goes to the console while the toast stays
    // in plain language. The message is provider text — it carries no secret.
    const reason = body.error?.message ?? `HTTP ${res.status}`
    if (import.meta.env.DEV) console.error(`[cloudinary] rejected: ${reason}`)
    throw new Error(reason)
  }

  return body.secure_url
}
