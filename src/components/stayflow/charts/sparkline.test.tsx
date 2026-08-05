import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { curveNatural, line as d3Line } from 'd3-shape'
import { Sparkline } from './sparkline'

// The sparkline replaced <Area type="natural"> from recharts. These tests pin
// the replacement to the curve recharts actually drew, by generating the same
// path with d3-shape (which is what recharts uses underneath) and comparing.
// Without this, "looks about right" is the only guarantee the swap is faithful.

const VIEW_W = 100
const VIEW_H = 40

function expectedLinePath(values: number[]) {
  const max = Math.max(...values, 0)
  const span = max > 0 ? max : 1
  const points: Array<[number, number]> = values.map((v, i) => [
    (i / (values.length - 1)) * VIEW_W,
    VIEW_H - (v / span) * VIEW_H,
  ])
  return d3Line<[number, number]>()
    .x((p) => p[0])
    .y((p) => p[1])
    .curve(curveNatural)(points)
}

function renderedPaths(values: number[]) {
  const { container } = render(<Sparkline values={values} />)
  return Array.from(container.querySelectorAll('path')).map(
    (p) => p.getAttribute('d') ?? '',
  )
}

// Path strings are formatted differently by the two generators, so compare the
// numeric sequence rather than the text.
const numbersIn = (d: string) =>
  (d.match(/-?\d+\.?\d*(e-?\d+)?/g) ?? []).map(Number)

// d3-path rounds its output to 3 decimals, so 3 is the most precision d3 can
// express — a tighter tolerance would be comparing against digits d3 never
// emitted, not against a more accurate curve.
const expectClose = (actual: number[], expected: number[]) => {
  expect(actual).toHaveLength(expected.length)
  actual.forEach((n, i) => expect(n).toBeCloseTo(expected[i], 3))
}

describe('Sparkline', () => {
  it.each([
    [[10, 14, 12, 18]],
    [[0, 5, 3, 9, 2, 7, 4]],
    [[3, 3, 3, 3]],
    [[1, 100]],
    [[0, 0, 0]],
  ])('draws the same natural cubic spline recharts did for %j', (values) => {
    const [, linePath] = renderedPaths(values)
    expectClose(numbersIn(linePath), numbersIn(expectedLinePath(values) ?? ''))
  })

  it('closes the fill path down to the zero baseline', () => {
    const [areaPath] = renderedPaths([10, 14, 12, 18])
    expect(areaPath.endsWith(`L${VIEW_W},${VIEW_H}L0,${VIEW_H}Z`)).toBe(true)
  })

  it('renders nothing below two points', () => {
    expect(renderedPaths([7])).toHaveLength(0)
    expect(renderedPaths([])).toHaveLength(0)
  })

  it('keeps stroke width constant under the non-uniform viewBox scale', () => {
    const { container } = render(<Sparkline values={[1, 4, 2]} />)
    const stroked = container.querySelector('path[stroke]:not([stroke="none"])')
    expect(stroked?.getAttribute('vector-effect')).toBe('non-scaling-stroke')
  })

  it('is hidden from assistive technology', () => {
    const { container } = render(<Sparkline values={[1, 4, 2]} />)
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })
})
