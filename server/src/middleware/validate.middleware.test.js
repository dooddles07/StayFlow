import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import { validateBody } from './validate.middleware.js'

const schema = z.object({ name: z.string().min(1) })

describe('validateBody', () => {
  it('calls next and replaces req.body with the parsed data on success', () => {
    const req = { body: { name: 'Isabelle', extra: 'dropped only if schema says so' } }
    const next = vi.fn()
    validateBody(schema)(req, {}, next)
    expect(next).toHaveBeenCalledWith()
    expect(req.body).toEqual({ name: 'Isabelle' })
  })

  it('throws a 400 ApiError on invalid input instead of calling next', () => {
    const req = { body: { name: '' } }
    const next = vi.fn()
    expect(() => validateBody(schema)(req, {}, next)).toThrowError(expect.objectContaining({ statusCode: 400 }))
    expect(next).not.toHaveBeenCalled()
  })

  it('throws when a required field is missing entirely', () => {
    const req = { body: {} }
    expect(() => validateBody(schema)(req, {}, vi.fn())).toThrowError(expect.objectContaining({ statusCode: 400 }))
  })
})
