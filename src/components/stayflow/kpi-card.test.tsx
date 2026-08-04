import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { KpiCard } from './kpi-card'

describe('KpiCard', () => {
  it('renders label and value', () => {
    render(<KpiCard icon={Users} label="Total members" value="128" />)
    expect(screen.getByText('Total members')).toBeTruthy()
    expect(screen.getByText('128')).toBeTruthy()
  })

  it('renders a positive delta with the emerald tone', () => {
    const { container } = render(
      <KpiCard
        icon={Users}
        label="Total members"
        value="128"
        delta={{ value: '+4%', positive: true }}
      />,
    )
    expect(container.querySelector('.bg-emerald-500\\/15')).toBeTruthy()
  })

  it('does not render a sparkline when trend is omitted', () => {
    render(<KpiCard icon={Users} label="Total members" value="128" />)
    expect(screen.queryByTestId('kpi-sparkline')).toBeNull()
  })

  it('renders a sparkline when trend has at least 2 points', () => {
    render(
      <KpiCard
        icon={Users}
        label="Total members"
        value="128"
        trend={[10, 14, 12, 18]}
      />,
    )
    expect(screen.getByTestId('kpi-sparkline')).toBeTruthy()
  })

  it('does not render a sparkline when trend has fewer than 2 points', () => {
    render(
      <KpiCard icon={Users} label="Total members" value="128" trend={[10]} />,
    )
    expect(screen.queryByTestId('kpi-sparkline')).toBeNull()
  })
})
