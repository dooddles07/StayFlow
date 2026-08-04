# StayFlow Premium Redesign — Foundation & KpiCard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize the display-font system (Playfair Display) and add a motion library, then use both to upgrade `KpiCard` — the two most self-contained, independently testable slices of the premium redesign spec.

**Architecture:** Task 1 fixes existing design debt (Playfair Display is already loaded on 4 auth pages via duplicated per-route `<link>` tags and applied via inline `style`, but was never promoted to a design token or used anywhere else) and adds `framer-motion` as a dependency. Task 2 rebuilds `KpiCard` with an optional embedded sparkline (recharts, already a dependency) and the new display font, without breaking its existing prop contract.

**Tech Stack:** React 19, TanStack Start/Router, Tailwind CSS v4, recharts (existing dep), framer-motion (new dep), vitest + @testing-library/react.

## Global Constraints

- Dark-mode only app (`color-scheme: dark`) — no light-mode variants needed.
- No new color palette — reuse existing tokens (`--color-accent-indigo`, `--color-accent-indigo-soft`, `--color-accent-gold`, `--color-surface`, etc.) from `src/styles.css`.
- Respect `prefers-reduced-motion` for any new animation.
- No external libraries unless necessary — `framer-motion` is justified per the approved design spec (`docs/superpowers/specs/2026-08-04-premium-redesign-design.md`); do not add anything else.
- `KpiCard`'s existing public prop contract (`icon`, `label`, `value`, `delta`, `hint`, `className`) must stay backward-compatible — it's consumed by `src/routes/management/index.tsx` and `src/routes/staff/index.tsx` with no `trend` data today.
- Follow existing project conventions: `cn()` from `#/lib/utils`, Tailwind token classes (not raw hex), `.test.tsx` co-located with the component (see `status-pill.test.tsx`).

---

### Task 1: Centralize display font + add motion library

**Files:**

- Modify: `src/styles.css`
- Modify: `src/routes/__root.tsx`
- Modify: `src/routes/forgot-password.tsx:9-18`
- Modify: `src/routes/verify-email.tsx:12-20`
- Modify: `src/routes/reset-password.tsx:16-24`
- Modify: `src/routes/login/member.tsx:6-14`
- Modify: `package.json`

**Interfaces:**

- Produces: Tailwind utility `font-display` (via `--font-display` CSS variable), usable in any `className` from this point on. Produces `--color-surface-2` token for layered card depth. Produces `framer-motion` as an installed, importable package (`import { motion } from 'framer-motion'`).

- [ ] **Step 1: Add `--font-display` and `--color-surface-2` tokens**

In `src/styles.css`, add to the `:root` block (after line 15, `--color-muted-text: #94a3b8;`):

```css
--color-surface-2: #1a1a3d;
```

Add to the `@theme inline` block (after line 61, `--color-muted-text: var(--color-muted-text);`):

```css
--font-display: 'Playfair Display', 'Poppins', ui-serif, serif;
--color-surface-2: var(--color-surface-2);
```

- [ ] **Step 2: Load Playfair Display globally**

In `src/routes/__root.tsx`, add a new entry to the `links` array right after the existing Poppins stylesheet link (after line 47, the `},` closing the Poppins link object):

```typescript
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
```

- [ ] **Step 3: Remove the now-duplicate per-route font links**

In each of these 4 files, delete the `links` array entry loading Playfair Display (now loaded globally by Task 1 Step 2). The route's `head()` should keep its `meta` but drop the `links` key entirely if that link was the only entry.

`src/routes/forgot-password.tsx` — replace:

```typescript
  head: () => ({
    meta: [{ title: 'Reset your password — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
```

with:

```typescript
  head: () => ({
    meta: [{ title: 'Reset your password — StayFlow' }],
  }),
```

`src/routes/verify-email.tsx` — replace:

```typescript
  head: () => ({
    meta: [{ title: 'Confirm your new email — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
```

with:

```typescript
  head: () => ({
    meta: [{ title: 'Confirm your new email — StayFlow' }],
  }),
```

`src/routes/reset-password.tsx` — replace:

```typescript
  head: () => ({
    meta: [{ title: 'Set a new password — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
```

with:

```typescript
  head: () => ({
    meta: [{ title: 'Set a new password — StayFlow' }],
  }),
```

`src/routes/login/member.tsx` — replace:

```typescript
  head: () => ({
    meta: [{ title: 'Member Sign In — StayFlow' }],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&display=swap',
      },
    ],
  }),
```

with:

```typescript
  head: () => ({
    meta: [{ title: 'Member Sign In — StayFlow' }],
  }),
```

- [ ] **Step 4: Swap inline `style` for the `font-display` utility**

In each of the same 4 files, find the `<h1>` with `style={{ fontFamily: "'Playfair Display', serif" }}` and replace both the `className` and `style` props:

Before (identical in all 4 files):

```typescript
          <h1
            className="mt-2 text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
```

After:

```typescript
          <h1
            className="mt-2 font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl"
          >
```

Apply this to: `src/routes/forgot-password.tsx:86-88`, `src/routes/verify-email.tsx:87-89`, `src/routes/reset-password.tsx:105-107`, `src/routes/login/member.tsx:51-53`.

- [ ] **Step 5: Install framer-motion**

Run: `npm install framer-motion`

Expected: `package.json` `dependencies` gains a `"framer-motion"` entry; `package-lock.json` updates.

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0, no errors.

Run: `npm run dev` and open `/login/member`, `/forgot-password`, `/verify-email`, `/reset-password` in a browser (Playwright or manual). Expected: each `<h1>` still renders in Playfair Display (visually distinct serif vs. the Poppins body text), no console errors, no FOUC beyond what existed before.

- [ ] **Step 7: Commit**

```bash
git add src/styles.css src/routes/__root.tsx src/routes/forgot-password.tsx src/routes/verify-email.tsx src/routes/reset-password.tsx src/routes/login/member.tsx package.json package-lock.json
git commit -m "feat(design): centralize display font token, add framer-motion"
```

---

### Task 2: KpiCard — embedded sparkline + display font

**Files:**

- Modify: `src/components/stayflow/kpi-card.tsx`
- Test: `src/components/stayflow/kpi-card.test.tsx` (new)

**Interfaces:**

- Consumes: `--font-display` Tailwind utility and `recharts` (`Area`, `AreaChart`, `ResponsiveContainer`) — both already available (Task 1 Step 1 for the former, existing `recharts` dependency for the latter).
- Produces: `KpiCard` gains an optional `trend?: number[]` prop. All other props (`icon`, `label`, `value`, `delta`, `hint`, `className`) keep their existing types — `src/routes/management/index.tsx` and `src/routes/staff/index.tsx` require zero changes.

- [ ] **Step 1: Write the failing tests**

Create `src/components/stayflow/kpi-card.test.tsx`:

```typescript
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
      <KpiCard icon={Users} label="Total members" value="128" delta={{ value: '+4%', positive: true }} />,
    )
    expect(container.querySelector('.bg-emerald-500\\/15')).toBeTruthy()
  })

  it('does not render a sparkline when trend is omitted', () => {
    render(<KpiCard icon={Users} label="Total members" value="128" />)
    expect(screen.queryByTestId('kpi-sparkline')).toBeNull()
  })

  it('renders a sparkline when trend has at least 2 points', () => {
    render(<KpiCard icon={Users} label="Total members" value="128" trend={[10, 14, 12, 18]} />)
    expect(screen.getByTestId('kpi-sparkline')).toBeTruthy()
  })

  it('does not render a sparkline when trend has fewer than 2 points', () => {
    render(<KpiCard icon={Users} label="Total members" value="128" trend={[10]} />)
    expect(screen.queryByTestId('kpi-sparkline')).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/stayflow/kpi-card.test.tsx`
Expected: the two `trend`-related tests fail with a TypeScript/prop error or `toBeNull()`/`toBeTruthy()` mismatch, since `trend` doesn't exist yet and there's no `data-testid="kpi-sparkline"` in the component.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/stayflow/kpi-card.tsx`:

```typescript
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

export function KpiCard({ icon: Icon, label, value, delta, hint, trend, className }: KpiCardProps) {
  const trendData = trend && trend.length > 1 ? trend.map((v, i) => ({ i, v })) : null

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
            <AreaChart data={trendData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="kpi-sparkline-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent-indigo-soft)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-accent-indigo-soft)" stopOpacity={0} />
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
              delta.positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
            )}
          >
            {delta.positive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {delta.value}
          </span>
        )}
      </div>
      <p className="relative mt-4 font-display text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="relative mt-1 text-xs text-muted-text">{label}</p>
      {hint && <p className="relative mt-2 text-[11px] text-muted-text/70">{hint}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/stayflow/kpi-card.test.tsx`
Expected: all 5 tests PASS.

- [ ] **Step 5: Verify existing consumers still typecheck**

Run: `npm run typecheck`
Expected: exit 0 — `src/routes/management/index.tsx` and `src/routes/staff/index.tsx` call `KpiCard` without `trend`, which stays valid since the prop is optional.

- [ ] **Step 6: Full test suite + lint**

Run: `npm run test && npm run lint`
Expected: all existing tests still pass (no regressions in other components), lint clean.

- [ ] **Step 7: Manual browser verification**

Run: `npm run dev`, open `/management` and `/staff` dashboards. Expected: KPI cards render exactly as before (no sparkline, since neither route passes `trend` yet), value text now in Playfair Display, no console errors. This confirms the change is purely additive before any route is updated to pass real `trend` data (out of scope for this plan).

- [ ] **Step 8: Commit**

```bash
git add src/components/stayflow/kpi-card.tsx src/components/stayflow/kpi-card.test.tsx
git commit -m "feat(kpi-card): add optional sparkline trend and display font"
```

---

## What's deliberately not in this plan

Per the approved spec (`docs/superpowers/specs/2026-08-04-premium-redesign-design.md`), the remaining slices — hero/login imagery (Classy Hero), sidebar nav (Animated Sidebar), data tables (Sortable Table), calendar/date picker (Calendar With Presets), and wiring real `trend` data into the two `KpiCard` consumers — are each their own follow-up plan, written after this one lands, since:

- Sidebar/table/calendar adaptations depend on reading their current call sites in full (not yet done) to avoid breaking existing behavior.
- Classy Hero uses Next.js-only APIs (`next/link`, `next/image`) that need a real rewrite against TanStack Router/plain `<img>`, not a drop-in port — worth its own scoped plan.
