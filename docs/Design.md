# StayFlow — Design

> Implementation stack: [Architecture.md](Architecture.md). Copy/tone rules: see "Friendly copy" below.

## Visual direction

Dark, premium "concierge" theme — navy/indigo canvas with gold accent, glassmorphism top bar, soft fade-in motion. Not a generic admin-dashboard look.

## Design tokens (`src/styles.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--color-canvas` | `#0a0a1a` | App background |
| `--color-surface` | `#141432` | Card / panel background |
| `--color-surface-hover` | `#1c1c46` | Hover state |
| `--color-accent-indigo` | `#4f46e5` | Primary actions, focus ring |
| `--color-accent-indigo-soft` | `#6366f1` | Secondary indigo accent |
| `--color-accent-gold` | `#c9a84c` | Highlight / premium accent |
| `--color-accent-gold-soft` | `#ddc178` | Muted gold accent |
| `--color-muted-text` | `#94a3b8` | Secondary text |
| `--destructive` | `#ef4444` | Errors, destructive actions |
| `--chart-1..5` | indigo, gold, cyan, pink, green | Recharts series colors |
| `--radius` | `1rem` | Base corner radius (`sm`/`md`/`lg`/`xl` derive from it) |
| Font | `Poppins` | `--font-sans`, applied globally |

`html { color-scheme: dark }` — app is dark-mode only, no light theme toggle currently.

## Component primitives

- **shadcn/Radix kit** (`src/components/ui/`) — button, dialog, table, calendar, and other accessible primitives. Don't hand-roll a component shadcn already provides.
- **App components** (`src/components/stayflow/`) — `app-shell`, `sidebar`, `top-bar`, `mobile-bottom-nav`, `kpi-card`, `facility-card`, `event-card`, `notice-card`, `reservation-row`, `qr-code`, `global-search`, `notification-bell`, `status-pill`, `page-header`, `section-header`, `login-form`, `password-input`, `avatar-initials`/`user-avatar`, `empty-state`, `quick-action-card`.
- **Motion:** `.animate-fade-in` + staggered `-delay-1/2/3` variants (480ms cubic-bezier ease-out, 14px translateY). Respects `prefers-reduced-motion`.
- **Glass top bar:** `.glass-topbar` — `backdrop-filter: blur(16px) saturate(140%)` over semi-transparent surface.
- **Stat tiles / `.reveal` / `.ambient-wash`:** newer primitives added in the 2026-07-15 UI pass for KPI/analytics surfaces.
- **Hero imagery (`public/images/hero/`):** full-bleed photographic backgrounds on the landing page, all three login screens, and the member dashboard welcome banner. Pattern: absolutely-positioned `<img>` filling the container (`object-cover`), a semi-transparent `bg-canvas/NN` (or `bg-surface/NN`) scrim on top for text legibility, then the existing radial-gradient/accent-line decoration layered above that. Shared images are reused where the visual system matches (verify-email/reset-password/forgot-password all reuse the member-login image). Assets generated externally and dropped in — not generated at build time.

## Layout patterns

- Three portal shells (`member`, `staff`, `management`) share `app-shell` + `sidebar` + `top-bar`, differing only in `nav-config.ts` entries per role.
- Mobile: bottom nav (`mobile-bottom-nav`) replaces sidebar below breakpoint.
- Tables that can overflow (booking/reservation history, directories) wrap in `overflow-x-auto` rather than shrinking columns.

## Content / copy rules

All user-facing text must be plain-language, not techy — residents are not assumed to be technical. Avoid jargon like "409 conflict" or "race condition" in UI copy; say what happened and what to do next in plain terms.

## Accessibility

- Skip link on every page.
- Touch targets sized for mobile tap (front desk staff often on tablet).
- Password visibility toggle on all password fields.
- Structured guest arrival-time picker (not raw text input) for a11y + validation.

## Working process

When touching UI/UX, apply the project's design skills (frontend-design, ui-styling, ui-ux-pro-max, design-system) rather than ad hoc styling, and verify visually in a real browser (Playwright) before calling a UI change done — type-checking alone doesn't confirm the feature looks or works right.
