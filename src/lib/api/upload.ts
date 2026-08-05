import { api } from './client'

interface UploadSignature {
  cloudName: string
  apiKey: string
  folder: string
  timestamp: number
  signature: string
}

export class UploadUnavailableError extends Error {}

// Photos go browser -> Cloudinary directly. The API only signs the upload, so a
// multi-megabyte file never travels through our request body or lands in a
// Postgres column. Returns the hosted URL to store in the resource's `image`.
export async function uploadPhoto(file: File): Promise<string> {
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

  const form = new FormData()
  form.append('file', file)
  form.append('api_key', signed.apiKey)
  form.append('folder', signed.folder)
  form.append('timestamp', String(signed.timestamp))
  form.append('signature', signed.signature)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: 'POST', body: form },
  )
  if (!res.ok) throw new Error('Upload failed. Please try again.')

  const body = (await res.json()) as { secure_url?: string }
  if (!body.secure_url) throw new Error('Upload failed. Please try again.')
  return body.secure_url
}
