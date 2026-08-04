import type { ResidentProfile } from '#/lib/api/resident'

// 'active' gets no badge at all — keeping visual noise low on the common case once
// most residents have logins.
export function LoginStatusBadge({
  status,
}: {
  status: ResidentProfile['loginStatus']
}) {
  if (status === 'none')
    return <span className="text-xs text-muted-text">No login</span>
  if (status === 'pending') {
    return (
      <span className="rounded-full bg-accent-gold/10 px-2 py-0.5 text-[11px] font-medium text-accent-gold">
        Pending
      </span>
    )
  }
  return null
}
