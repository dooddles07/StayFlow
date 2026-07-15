import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './chart-tooltip'

interface AreaTrendProps {
  data: Record<string, string | number>[]
  xKey: string
  yKey: string
  yLabel: string
  summary: string
  color?: 'gold' | 'indigo'
  height?: number
  valueFormatter?: (value: number) => string
}

export function AreaTrend({ data, xKey, yKey, yLabel, summary, color = 'gold', height = 260, valueFormatter }: AreaTrendProps) {
  const stroke = color === 'gold' ? 'var(--color-accent-gold)' : 'var(--color-accent-indigo-soft)'
  const gradientId = `areaFill-${color}-${yKey}`

  return (
    <div role="img" aria-label={summary} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: 'var(--color-muted-text)', fontSize: 11 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
          <YAxis
            tick={{ fill: 'var(--color-muted-text)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={valueFormatter ? 52 : 34}
            tickFormatter={valueFormatter}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke, strokeWidth: 1 }} />
          <Area type="monotone" dataKey={yKey} name={yLabel} stroke={stroke} strokeWidth={2.5} fill={`url(#${gradientId})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
