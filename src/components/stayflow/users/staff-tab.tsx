import { Pencil, Trash2 } from 'lucide-react'
import { AnimatedTableRow } from '#/components/stayflow/animated-table-row'
import { AvatarInitials } from '#/components/stayflow/avatar-initials'
import { Button } from '#/components/ui/button'
import type { StaffMemberView } from '#/lib/api/staff'

export function StaffTab({
  staff,
  onEdit,
  onDelete,
}: {
  staff: StaffMemberView[]
  onEdit: (member: StaffMemberView) => void
  onDelete: (id: string, name: string) => void
}) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {staff.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <AvatarInitials seed={s.name} className="size-8 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {s.name}
                </p>
                <p className="truncate text-xs text-muted-text">
                  {s.role} · {s.shift}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-text hover:text-foreground"
                aria-label={`Edit ${s.name}`}
                onClick={() => onEdit(s)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-rose-400 hover:bg-rose-500/10"
                aria-label={`Remove ${s.name}`}
                onClick={() => onDelete(s.id, s.name)}
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
              <th className="px-4 py-3 font-medium">Staff</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Shift</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {staff.map((s, i) => (
              <AnimatedTableRow key={s.id} index={i}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <AvatarInitials seed={s.name} className="size-8" />
                    <span className="font-medium text-foreground">
                      {s.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-text">{s.role}</td>
                <td className="px-4 py-3 text-muted-text">{s.shift}</td>
                <td className="px-4 py-3 text-muted-text">{s.email}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-text hover:text-foreground"
                      aria-label={`Edit ${s.name}`}
                      onClick={() => onEdit(s)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-rose-400 hover:bg-rose-500/10"
                      aria-label={`Remove ${s.name}`}
                      onClick={() => onDelete(s.id, s.name)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </td>
              </AnimatedTableRow>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
