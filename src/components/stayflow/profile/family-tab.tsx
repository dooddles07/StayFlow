import { Pencil, Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { FamilyDialog } from './family-dialog'
import { DeleteButton } from './delete-button'
import { removeFamilyMember } from '#/lib/api/resident'
import type { ResidentProfile } from '#/lib/api/resident'

interface FamilyTabProps {
  profile: ResidentProfile
  onSaved: (profile: ResidentProfile) => void
}

export function FamilyTab({ profile, onSaved }: FamilyTabProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Family members</p>
        <FamilyDialog
          onSaved={onSaved}
          trigger={
            <Button
              size="sm"
              className="gap-1.5 bg-accent-indigo text-white hover:bg-accent-indigo-soft"
            >
              <Plus className="size-4" /> Add
            </Button>
          }
        />
      </div>
      {profile.family.length === 0 ? (
        <p className="text-sm text-muted-text">No family members added yet.</p>
      ) : (
        profile.family.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {member.name}
              </p>
              <p className="text-xs text-muted-text">
                {member.relation} · Age {member.age}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <FamilyDialog
                initial={member}
                onSaved={onSaved}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-text hover:text-foreground"
                    aria-label={`Edit ${member.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <DeleteButton
                label={member.name}
                onConfirm={() => removeFamilyMember(member.id).then(onSaved)}
              />
            </div>
          </div>
        ))
      )}
    </>
  )
}
