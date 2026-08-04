import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusPill, statusToTone } from './status-pill'

describe('statusToTone', () => {
  it('maps known statuses to their tone', () => {
    expect(statusToTone('confirmed')).toBe('success')
    expect(statusToTone('pending')).toBe('warning')
    expect(statusToTone('cancelled')).toBe('danger')
    expect(statusToTone('available')).toBe('info')
  })

  it('falls back to neutral for an unknown status', () => {
    expect(statusToTone('some-unmapped-status')).toBe('neutral')
  })
})

describe('StatusPill', () => {
  it('renders the status label', () => {
    render(<StatusPill status="confirmed" />)
    expect(screen.getByText('confirmed')).toBeTruthy()
  })

  it('lets an explicit tone override the status-derived one', () => {
    const { container } = render(<StatusPill status="confirmed" tone="danger" />)
    expect(container.querySelector('span')?.className).toContain('rose')
  })
})
