import { Pencil, Trash2 } from 'lucide-react'
import { AnimatedTableRow } from '#/components/stayflow/animated-table-row'
import { StatusPill } from '#/components/stayflow/status-pill'
import { Button } from '#/components/ui/button'
import type { Facility } from '#/lib/domain/types'

interface FacilityTableProps {
  facilities: Facility[]
  onEdit: (facility: Facility) => void
  onDelete: (facility: Facility) => void
}

// Two renderings of the same rows (cards below sm, a table above) rather than one
// table squeezed into a phone width — the desktop columns don't have anywhere to
// go on a narrow screen.
export function FacilityTable({
  facilities,
  onEdit,
  onDelete,
}: FacilityTableProps) {
  return (
    <>
      <div className="space-y-3 sm:hidden">
        {facilities.map((f) => (
          <div
            key={f.id}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">{f.name}</p>
                <p className="text-xs text-muted-text">
                  {f.category} · Capacity {f.capacity}
                </p>
              </div>
              <StatusPill status={f.status} />
            </div>
            <div className="mt-3 flex justify-end gap-1.5">
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${f.name}`}
                className="size-7 text-muted-text hover:text-foreground"
                onClick={() => onEdit(f)}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${f.name}`}
                className="size-7 text-rose-400 hover:bg-rose-500/10"
                onClick={() => onDelete(f)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-border sm:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-hover text-xs uppercase tracking-wide text-muted-text">
            <tr>
              <th className="px-4 py-3 font-medium">Facility</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Capacity</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {facilities.map((f, i) => (
              <AnimatedTableRow key={f.id} index={i}>
                <td className="px-4 py-3 font-medium text-foreground">
                  {f.name}
                </td>
                <td className="px-4 py-3 text-muted-text">{f.category}</td>
                <td className="px-4 py-3 text-muted-text">{f.capacity}</td>
                <td className="px-4 py-3">
                  <StatusPill status={f.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-muted-text hover:text-foreground"
                      onClick={() => onEdit(f)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-rose-400 hover:bg-rose-500/10"
                      onClick={() => onDelete(f)}
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
