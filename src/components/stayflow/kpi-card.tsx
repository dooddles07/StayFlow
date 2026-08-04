import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { cn } from '#/lib/utils'

interface KpiCardProps {
  icon: LucideIcon
  label: string
  value: string
  delta?: { value: string; positive: boolean }
  hint?: string
  trend?: number[]
  className?: string
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  trend,
  className,
}: KpiCardProps) {
  const trendData =
    trend && trend.length > 1 ? trend.map((v, i) => ({ i, v })) : null

  return (
    <div
      className={cn(
        'animate-fade-in relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-indigo/30',
        className,
      )}
    >
      {trendData && (
        <div
          data-testid="kpi-sparkline"
          className="pointer-events-none absolute inset-y-0 right-0 w-2/5 opacity-70"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={trendData}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id="kpi-sparkline-fill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
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
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--color-accent-indigo-soft)"
                strokeWidth={1.5}
                fill="url(#kpi-sparkline-fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="relative flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent-indigo/15 text-accent-gold">
          <Icon className="size-[18px]" />
        </span>
        {delta && (
          <span
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              delta.positive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400',
            )}
          >
            {delta.positive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>
      <p className="relative mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="relative mt-1 text-xs text-muted-text">{label}</p>
      {hint && (
        <p className="relative mt-2 text-[11px] text-muted-text/70">{hint}</p>
      )}
    </div>
  )
}
