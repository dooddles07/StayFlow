import { createHash } from 'node:crypto'
import { env } from '../config/env.js'
import { ApiError } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Photos used to be read as base64 data URIs and stored in a Postgres column,
// which put multi-megabyte blobs in the request body, in the row, and in every
// list response that selected the column. The browser now uploads straight to
// Cloudinary and only the resulting URL reaches this API. The account secret
// stays here: the client gets a signature valid for one upload, not the key.
const SIGNED_PARAM_KEYS = ['folder', 'timestamp']

// Cloudinary's scheme: the signed parameters sorted by key, joined as a query
// string, with the API secret appended, hashed with SHA-1.
const sign = (params, apiSecret) => {
  const payload = SIGNED_PARAM_KEYS.filter((key) => params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex')
}

export const createUploadSignature = asyncHandler(async (req, res) => {
  const { cloudName, apiKey, apiSecret, folder } = env.cloudinary
  if (!cloudName || !apiKey || !apiSecret) {
    // Not an error state in development: the admin UI falls back to pasting an
    // image URL when signing is unavailable.
    throw ApiError.serviceUnavailable('Photo uploads are not configured.')
  }

  const params = { folder, timestamp: Math.floor(Date.now() / 1000) }
  res.json({
    cloudName,
    apiKey,
    folder: params.folder,
    timestamp: params.timestamp,
    signature: sign(params, apiSecret),
  })
})
