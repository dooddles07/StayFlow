import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const cloudinary = {
  cloudName: 'test-cloud',
  apiKey: 'test-key',
  apiSecret: 'test-secret',
  folder: 'stayflow',
}

vi.mock('../config/env.js', () => ({
  env: {
    get cloudinary() {
      return cloudinary
    },
    isProd: false,
  },
}))

const { createUploadSignature } = await import('./upload.controller.js')

// asyncHandler forwards rejections to next() rather than throwing, so the test
// captures whatever the handler produced through these stand-ins.
const invoke = async () => {
  let body = null
  let failure = null
  const res = { json: (payload) => (body = payload) }
  await createUploadSignature({}, res, (err) => (failure = err))
  return { body, failure }
}

describe('createUploadSignature', () => {
  beforeEach(() => {
    Object.assign(cloudinary, {
      cloudName: 'test-cloud',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      folder: 'stayflow',
    })
  })

  it('returns a signature Cloudinary will accept for the signed params', async () => {
    const { body, failure } = await invoke()

    expect(failure).toBeNull()
    // Cloudinary recomputes this exact string server-side; if the joining or the
    // ordering drifts, every upload is rejected with "Invalid Signature".
    const expected = createHash('sha1')
      .update(
        `allowed_formats=${body.allowedFormats}` +
          `&folder=${body.folder}` +
          `&public_id=${body.publicId}` +
          `&timestamp=${body.timestamp}` +
          cloudinary.apiSecret,
      )
      .digest('hex')
    expect(body.signature).toBe(expected)
  })

  it('binds the signature to an image format allowlist', async () => {
    const { body } = await invoke()
    expect(body.allowedFormats).toBe('jpg,jpeg,png,webp')
  })

  it('issues a fresh public_id per signature so a replay cannot flood the folder', async () => {
    const first = await invoke()
    const second = await invoke()

    expect(first.body.publicId).toBeTruthy()
    expect(second.body.publicId).not.toBe(first.body.publicId)
  })

  it('never returns the API secret', async () => {
    const { body } = await invoke()
    expect(JSON.stringify(body)).not.toContain(cloudinary.apiSecret)
  })

  it('issues a timestamp in seconds, not milliseconds', async () => {
    const { body } = await invoke()
    // Cloudinary rejects a signature whose timestamp is more than an hour off;
    // a millisecond value would be ~55,000 years in the future.
    expect(Math.abs(body.timestamp - Date.now() / 1000)).toBeLessThan(5)
  })

  it('fails with 503 rather than an unsigned upload when unconfigured', async () => {
    cloudinary.apiSecret = ''
    const { body, failure } = await invoke()

    expect(body).toBeNull()
    expect(failure?.statusCode).toBe(503)
  })
})
