import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectionHeader } from './section-header'

describe('SectionHeader', () => {
  it('renders the title and description', () => {
    render(<SectionHeader title="Dining Revenue" description="Last six months" />)
    expect(screen.getByText('Dining Revenue')).toBeTruthy()
    expect(screen.getByText('Last six months')).toBeTruthy()
  })

  it('shows a "Demo data" badge when demo is set', () => {
    render(<SectionHeader title="Dining Revenue" demo />)
    expect(screen.getByText('Demo data')).toBeTruthy()
  })

  it('omits the badge when demo is not set', () => {
    render(<SectionHeader title="Peak Booking Hours" />)
    expect(screen.queryByText('Demo data')).toBeNull()
  })
})
