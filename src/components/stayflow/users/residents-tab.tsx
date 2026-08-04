import { KeyRound, Pencil, Trash2 } from 'lucide-react'
import { AvatarInitials } from '#/components/stayflow/avatar-initials'
import { Button } from '#/components/ui/button'
import { tierLabel } from '#/lib/api/resident'
import type { ResidentProfile } from '#/lib/api/resident'
import { LoginStatusBadge } from './login-status-badge'

export function ResidentsTab({
  residents,
  isManagement,
  onCreateLogin,
  onEdit,
  onDelete,
}: {
  residents: ResidentProfile[]
  isManagement: boolean
  onCreateLogin: (id: string, name: string) => void
  onEdit: (resident: ResidentProfile) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {residents.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <AvatarInitials seed={r.name} className="size-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {r.name}
                </p>
                <p className="truncate text-xs text-muted-text">
                  {r.unit} · {tierLabel(r.tier)}
                </p>
                <LoginStatusBadge status={r.loginStatus} />
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {isManagement && r.loginStatus === 'none' && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-accent-gold hover:bg-accent-gold/10"
                  aria-label={`Create login for ${r.name}`}
                  onClick={() => onCreateLogin(r.id, r.name)}
                >
                  <KeyRound className="size-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-text hover:text-foreground"
                aria-label={`Edit ${r.name}`}
                onClick={() => onEdit(r)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-rose-400 hover:bg-rose-500/10"
                aria-label={`Remove ${r.name}`}
                onClick={() => onDelete(r.id, r.name)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
            <tr>
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Unit</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Login</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {residents.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AvatarInitials seed={r.name} className="size-8" />
                    <span className="font-medium text-foreground">
                      {r.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-text">{r.unit}</td>
                <td className="px-4 py-3 text-muted-text">
                  {tierLabel(r.tier)}
                </td>
                <td className="px-4 py-3 text-muted-text">{r.email}</td>
                <td className="px-4 py-3">
                  <LoginStatusBadge status={r.loginStatus} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {isManagement && r.loginStatus === 'none' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 text-accent-gold hover:bg-accent-gold/10"
                        aria-label={`Create login for ${r.name}`}
                        onClick={() => onCreateLogin(r.id, r.name)}
                      >
                        <KeyRound className="size-3.5" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-text hover:text-foreground"
                      aria-label={`Edit ${r.name}`}
                      onClick={() => onEdit(r)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-rose-400 hover:bg-rose-500/10"
                      aria-label={`Remove ${r.name}`}
                      onClick={() => onDelete(r.id, r.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
