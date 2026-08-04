import { ApiError } from '#/lib/api/client'
import type { ResidentProfile } from '#/lib/api/resident'

export const errText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Something went wrong. Try again.'

export const PHONE_RE = /^[+()\-\s\d]{7,}$/
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isBlank = (s: string) => s.trim() === ''
export const phoneError = (v: string) =>
  isBlank(v)
    ? 'Phone is required'
    : !PHONE_RE.test(v)
      ? 'Enter a valid phone number'
      : ''

export function computeErrors(f: ResidentProfile) {
  const c2 = f.emergencyContact2
  const hasSecondary =
    !isBlank(c2.name) || !isBlank(c2.relation) || !isBlank(c2.phone)
  return {
    name: isBlank(f.name) ? 'Name is required' : '',
    phone: phoneError(f.phone),
    emName: isBlank(f.emergencyContact.name) ? 'Contact name is required' : '',
    emRelation: isBlank(f.emergencyContact.relation)
      ? 'Relation is required'
      : '',
    emPhone: phoneError(f.emergencyContact.phone),
    // Secondary contact is optional, but if any field is filled the name + phone are required.
    em2Name: hasSecondary && isBlank(c2.name) ? 'Contact name is required' : '',
    em2Phone: hasSecondary ? phoneError(c2.phone) : '',
  }
}

export const monthYear = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500">{msg}</p>
}

// Single-row tab that never compresses its label (scrolls on narrow screens) and
// keeps a ≥44px touch target. Active state layers three cues (not colour alone):
// gold-tinted surface + gold text + hairline gold ring.
export const tabTrigger =
  'min-h-11 shrink-0 gap-1.5 px-3 data-[state=active]:bg-accent-gold/10 data-[state=active]:font-semibold data-[state=active]:text-accent-gold data-[state=active]:ring-1 data-[state=active]:ring-inset data-[state=active]:ring-accent-gold/30'
