// Shown while a portal layout resolves the session. The three portal layouts
// used to return bare null here, which renders a blank white page for as long
// as the auth store takes to hydrate — indistinguishable, to the person looking
// at it, from the app being broken.
//
// Deliberately standalone (no AppShell, no auth dependency): it has to render
// before we know whether there is a user at all.
export function RoutePending({
  label = 'Loading your portal',
}: {
  label?: string
}) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="flex size-12 animate-pulse items-center justify-center rounded-xl bg-accent-indigo/20">
        <img src="/logo.svg?v=3" alt="" className="size-7" />
      </div>
      <p className="text-sm text-muted-text">{label}</p>
    </div>
  )
}
