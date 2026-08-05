import { useId } from 'react'
import { cn } from '#/lib/utils'

// Standalone sparkline so KPI cards stop pulling recharts in.
//
// kpi-card is rendered on every dashboard, and importing recharts there put the
// whole ~284 kB charting chunk on the critical path of the member, staff and
// management landing pages — to draw a decorative line behind a number.
// Recharts still backs the real charts on /management/analytics, where its cost
// buys axes, tooltips and legends.
//
// The curve is the same one recharts drew before (<Area type="natural">, i.e.
// d3's curveNatural): a natural cubic spline, second derivative zero at both
// ends. The control-point solver below is that algorithm, so the rendered path
// is identical rather than merely similar.

// Solves the tridiagonal system for one axis, returning [firstControlPoints,
// secondControlPoints]. Ported from d3-shape's curveNatural.
function controlPoints(values: number[]): [number[], number[]] {
  const n = values.length - 1
  const a = new Array<number>(n)
  const b = new Array<number>(n)
  const r = new Array<number>(n)

  a[0] = 0
  b[0] = 2
  r[0] = values[0] + 2 * values[1]
  for (let i = 1; i < n - 1; i += 1) {
    a[i] = 1
    b[i] = 4
    r[i] = 4 * values[i] + 2 * values[i + 1]
  }
  a[n - 1] = 2
  b[n - 1] = 7
  r[n - 1] = 8 * values[n - 1] + values[n]

  for (let i = 1; i < n; i += 1) {
    const m = a[i] / b[i - 1]
    b[i] -= m
    r[i] -= m * r[i - 1]
  }

  a[n - 1] = r[n - 1] / b[n - 1]
  for (let i = n - 2; i >= 0; i -= 1) {
    a[i] = (r[i] - a[i + 1]) / b[i]
  }

  b[n - 1] = (values[n] + a[n - 1]) / 2
  for (let i = 0; i < n - 1; i += 1) {
    b[i] = 2 * values[i + 1] - a[i + 1]
  }

  return [a, b]
}

function naturalPath(xs: number[], ys: number[]): string {
  if (xs.length < 2) return ''
  if (xs.length === 2) return `M${xs[0]},${ys[0]}L${xs[1]},${ys[1]}`

  const [px0, px1] = controlPoints(xs)
  const [py0, py1] = controlPoints(ys)

  let d = `M${xs[0]},${ys[0]}`
  for (let i = 0; i < px0.length; i += 1) {
    d += `C${px0[i]},${py0[i]},${px1[i]},${py1[i]},${xs[i + 1]},${ys[i + 1]}`
  }
  return d
}

// Drawn in an arbitrary coordinate space and stretched to fit by the viewBox.
// Safe for this curve: the spline is built independently per axis and is linear
// in the coordinates, so a non-uniform scale maps the curve exactly.
const VIEW_W = 100
const VIEW_H = 40

export function Sparkline({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  const gradientId = useId()
  if (values.length < 2) return null

  // Matches recharts' default numeric Y domain of [0, max] — the baseline is
  // zero, not the smallest value, so a flat-ish series stays visually flat
  // instead of being stretched to fill the box.
  const max = Math.max(...values, 0)
  const span = max > 0 ? max : 1

  const xs = values.map((_, i) => (i / (values.length - 1)) * VIEW_W)
  const ys = values.map((v) => VIEW_H - (v / span) * VIEW_H)

  const line = naturalPath(xs, ys)
  // Close the same path down to the baseline for the gradient fill.
  const area = `${line}L${xs[xs.length - 1]},${VIEW_H}L${xs[0]},${VIEW_H}Z`

  return (
    <svg
      className={cn('size-full', className)}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--color-accent-indigo-soft)"
            stopOpacity={0.35}
          />
          <stop
            offset="100%"
            stopColor="var(--color-accent-indigo-soft)"
            stopOpacity={0}
          />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="var(--color-accent-indigo-soft)"
        strokeWidth={1.5}
        // Without this the non-uniform viewBox scale would stretch the stroke
        // width along with the geometry.
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
