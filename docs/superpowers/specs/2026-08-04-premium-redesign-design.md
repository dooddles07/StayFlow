# StayFlow Premium Visual Redesign — Design

## Goal

Elevate StayFlow's UI across all three portals (member, staff, management) to read as a premium, high-value product — without abandoning the existing "dark navy/indigo + gold concierge" (Meander) brand direction already established in [DESIGN.md](../../DESIGN.md) and the Figma brand system. "Overhaul" here means execution quality (typography, motion, component craft, layered depth), not a new color/brand direction.

## Non-goals

- No new color palette or brand identity — keep `--color-canvas` / `--color-accent-indigo` / `--color-accent-gold` etc. as-is.
- No backend/API/schema changes.
- No light-mode support (app stays dark-mode only per existing `color-scheme: dark`).
- No wholesale replacement of shadcn/Radix primitives (`src/components/ui/`) — only the StayFlow-specific composed components (`src/components/stayflow/`) are in scope.

## 1. Visual foundation

Changes to `src/styles.css`:

- **Typography**: add Playfair Display as a second font, exposed as `--font-display` / Tailwind `font-display`, for page titles, hero headlines, and large stat numbers. Body/UI text stays Poppins (`--font-sans`). Loaded via Google Fonts `@import` alongside the existing Poppins import.
- **Depth token**: add `--color-surface-2` (one step lighter than `--color-surface`) so layered/glass cards have a place to sit above the base surface without hand-picking opacities per component.
- **Motion**: add `framer-motion` as a dependency. Existing `.animate-fade-in` CSS keyframes stay for simple cases; framer-motion is used where 21st.dev-sourced components need spring physics, hover choreography, or layout animation that CSS keyframes can't express cleanly.

## 2. Component sourcing plan

Discovery via 21st.dev `search` (free) already run; candidates shortlisted below. For each slot: fetch one candidate's source via `get_component` (rate-limited/paid on free tier — spend deliberately, one fetch per slot, not per option), then hand-adapt it into the existing target file rather than running the `npx shadcn add` CLI against the repo — this keeps the code on StayFlow's existing tokens/conventions (`cva`, `#/lib/utils`, existing prop shapes) instead of importing a second, inconsistent styling convention.

| Slot                 | Candidate                             | Target file                                            | Notes                                                                                                                                                                              |
| -------------------- | ------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero/login imagery   | Classy Hero                           | `src/routes/index.tsx`, `src/routes/login/*.tsx`       | Adapt motion/typography only; existing hero photography assets stay (already documented pattern in DESIGN.md)                                                                      |
| KPI/stat cards       | Progress Metric Card / Advanced Stats | `src/components/stayflow/kpi-card.tsx`                 | Must stay a single shared component — DESIGN.md already flags `analytics.tsx`/`reports.tsx` as inconsistent bespoke-card offenders; fix that adoption gap while touching this file |
| Sidebar nav          | Animated Sidebar                      | `src/components/stayflow/sidebar.tsx`                  | Spring hover + active-route indicator; must preserve existing `nav-config.ts`-driven per-role entries                                                                              |
| Data tables          | Sortable Table                        | staff/management directory & booking list routes       | Row-level animation only; keep existing `overflow-x-auto` wrapping pattern for small screens                                                                                       |
| Calendar/date picker | Calendar With Presets                 | guest arrival picker, booking/dining reservation flows | Must remain a structured picker, not raw text input (existing a11y rule in DESIGN.md)                                                                                              |

## 3. Rollout sequence

1. **Foundation**: styles.css changes + `framer-motion` install. Verify existing pages still render (no visual regression) before touching components.
2. **Shared components**: rebuild the 5 target files above once, matching new tokens/motion. Each is its own atomic change + verification (per superpowers micro-commit convention).
3. **Portal rollout**: apply across all 30 routes by portal (member → staff → management), since all three already consume the same shared components via `app-shell`/`sidebar`/`nav-config.ts` — most routes should pick up the new look for free once shared components are done; only bespoke per-page layouts (hero sections, analytics/reports pages with non-`kpi-card` bespoke cards) need individual touch-up.
4. **Verification**: Playwright walkthrough of at least one representative route per portal (dashboard/index) plus the 3 login pages, checking console for errors and confirming `prefers-reduced-motion` is still respected.

## Testing

- `npm run typecheck` / `npm run lint` after each atomic component change.
- Existing vitest suite (`status-pill.test.tsx`, `section-header.test.tsx`, etc.) must keep passing — no prop/behavior changes to these components' public interface, styling only.
- Manual Playwright pass per DESIGN.md's existing working-process rule ("verify visually in a real browser before calling a UI change done").

## Risks

- 21st.dev free-tier `get_component` retrieval limits — mitigated by fetching once per slot, not browsing multiple options via paid calls.
- `framer-motion` bundle size — acceptable; standard, well-maintained, no dependency baggage.
- Scope (30 routes, whole-app pass) — mitigated by the shared-component leverage in step 3 above; most routes change via the 5 shared files, not individually.
