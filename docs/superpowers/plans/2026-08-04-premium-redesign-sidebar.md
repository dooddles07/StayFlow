# StayFlow Premium Redesign — Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade `Sidebar` (shared by all 3 portals via `app-shell`) with a framer-motion spring hover highlight and an animated active-route indicator, per the "Sidebar nav" slot in `docs/superpowers/specs/2026-08-04-premium-redesign-design.md`.

**Architecture:** `Sidebar` (`src/components/stayflow/sidebar.tsx`) currently renders a flat list from `navConfig[portal]` with static Tailwind classes for hover/active state (instant background swap, static left border). This task replaces the static active border with a `layoutId`-based framer-motion element that smoothly slides between nav items on route change, and adds a hover "pill" background that follows the mouse with a spring transition. `navConfig`'s data shape and the component's public props are untouched — this is a rendering-only change. Framer-motion is already installed (prior plan). No collapsible groups or drag-to-resize (the 21st.dev reference component has both) — StayFlow's nav is a flat single-level list with a fixed 256px width; those features don't apply and adding them would be scope creep against the plan's own Non-goals.

**Tech Stack:** React 19, TanStack Router (`Link`, `useLocation`), framer-motion (`motion`, `useReducedMotion`), Tailwind CSS v4.

## Global Constraints

- Dark-mode only app — no light-mode variants needed.
- No new color palette — reuse existing tokens (`--color-accent-gold`, `--color-accent-indigo`, `--color-surface-hover`, etc.).
- Respect `prefers-reduced-motion` — gate the spring transition via framer-motion's `useReducedMotion()` hook, falling back to `{ duration: 0 }`.
- `navConfig`'s per-role data shape (`src/components/stayflow/nav-config.ts`) must not change — only `sidebar.tsx`'s rendering.
- `Sidebar`'s existing public props (`portal`, `identityName`, `identitySubtitle`, `identityLoading`, `avatarSeed`, `avatarStyle`, `navBadges`, `onNavigate`, `className`) must stay unchanged — it's consumed by `app-shell.tsx` with a fixed prop set.
- No test file convention exists for router-dependent StayFlow components (`top-bar.tsx`, `app-shell.tsx` have none) — this task follows that existing convention rather than inventing a new router-mocking test harness. Verification is typecheck/lint + manual browser check instead.

---

### Task 1: Animated hover highlight + active indicator in Sidebar

**Files:**

- Modify: `src/components/stayflow/sidebar.tsx`

**Interfaces:**

- Consumes: `framer-motion`'s `motion` and `useReducedMotion` (already installed). No new interfaces produced — this task only changes internal rendering of an existing component.

- [ ] **Step 1: Add imports and hover state**

In `src/components/stayflow/sidebar.tsx`, replace the import block (lines 1-8):

```typescript
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { navConfig, portalLabels } from './nav-config'
import { UserAvatar } from './user-avatar'
import { clearStoredPortal } from '#/lib/hooks/use-portal-preference'
import type { Portal } from '#/lib/hooks/use-portal-preference'
import { useAuthStore } from '#/lib/store/auth-store'
import { cn } from '#/lib/utils'
```

- [ ] **Step 2: Add hover tracking + reduced-motion transition inside the component**

Replace lines 22-27 (the component body's opening, before the `return`):

```typescript
export function Sidebar({ portal, identityName, identitySubtitle, identityLoading, avatarSeed, avatarStyle, navBadges, onNavigate, className }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const items = navConfig[portal]
  const rootPath = items[0].to
  const [hovered, setHovered] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  const springTransition = reducedMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 500, damping: 35 }
```

- [ ] **Step 3: Replace the nav list rendering**

Replace the `<nav>` block (lines 41-63):

```typescript
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" onMouseLeave={() => setHovered(null)}>
        {items.map((item) => {
          const isActive = item.to === rootPath ? location.pathname === item.to : location.pathname.startsWith(item.to)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              onMouseEnter={() => setHovered(item.to)}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive ? 'bg-accent-indigo/15 text-foreground' : 'text-muted-text hover:text-foreground',
              )}
            >
              {!isActive && hovered === item.to && (
                <motion.span
                  layoutId="sidebar-hover-highlight"
                  className="absolute inset-0 rounded-xl bg-surface-hover"
                  transition={springTransition}
                />
              )}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-accent-gold"
                  transition={springTransition}
                />
              )}
              <Icon className={cn('relative size-[18px]', isActive ? 'text-accent-gold' : 'text-muted-text group-hover:text-foreground')} />
              <span className="relative">{item.label}</span>
              {navBadges?.[item.to] && <span className="relative ml-auto size-1.5 shrink-0 rounded-full bg-accent-gold" />}
            </Link>
          )
        })}
      </nav>
```

Note: this removes the old `border-l-2 border-transparent` / `border-accent-gold` classes entirely (replaced by the animated `motion.span` indicator) and the old `hover:bg-surface-hover` class (replaced by the animated hover pill).

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both exit 0, no errors.

Run: `npm run dev`, open `/staff`, `/management`, and `/member` (or any route within each portal — the sidebar renders on all authenticated routes via `app-shell`). Expected:

- Hovering a non-active nav item shows a smooth pill background that follows the cursor between items (spring motion, not instant).
- The active route's item shows a thin gold indicator bar on its left edge; navigating to a different route smoothly slides that bar to the new active item instead of popping instantly.
- No visual change to identity card, logout button, or badges.
- No console errors.
- With OS-level "reduce motion" enabled (or by checking `prefers-reduced-motion` in devtools), the hover/active transitions become instant (no spring) rather than disabled entirely — confirm no console warnings either way.

- [ ] **Step 5: Commit**

```bash
git add src/components/stayflow/sidebar.tsx
git commit -m "feat(sidebar): animated hover highlight and active-route indicator"
```
