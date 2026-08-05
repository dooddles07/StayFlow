import { Pencil, Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { VehicleDialog } from './vehicle-dialog'
import { DeleteButton } from './delete-button'
import { removeVehicle } from '#/lib/api/resident'
import type { ResidentProfile } from '#/lib/api/resident'

interface VehicleTabProps {
  profile: ResidentProfile
  onSaved: (profile: ResidentProfile) => void
}

export function VehicleTab({ profile, onSaved }: VehicleTabProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">
          Registered vehicles
        </p>
        <VehicleDialog
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
      {profile.vehicles.length === 0 ? (
        <p className="text-sm text-muted-text">No vehicles registered.</p>
      ) : (
        profile.vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="flex items-center justify-between rounded-xl border border-border bg-canvas px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {vehicle.make} {vehicle.model}
              </p>
              <p className="text-xs text-muted-text">{vehicle.color}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-accent-gold">
                {vehicle.plate}
              </p>
              <VehicleDialog
                initial={vehicle}
                onSaved={onSaved}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-muted-text hover:text-foreground"
                    aria-label={`Edit ${vehicle.make} ${vehicle.model}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                }
              />
              <DeleteButton
                label={`${vehicle.make} ${vehicle.model}`}
                onConfirm={() => removeVehicle(vehicle.id).then(onSaved)}
              />
            </div>
          </div>
        ))
      )}
    </>
  )
}
