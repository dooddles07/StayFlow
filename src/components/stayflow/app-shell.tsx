import * as React from 'react'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import { MobileBottomNav } from './mobile-bottom-nav'
import { Sheet, SheetContent, SheetTitle } from '#/components/ui/sheet'
import type { Portal } from '#/lib/hooks/use-portal-preference'

interface AppShellProps {
  portal: Portal
  identityName: string
  identitySubtitle: string
  identityLoading?: boolean
  avatarSeed?: string
  avatarStyle?: string | null
  children: React.ReactNode
}

export function AppShell({ portal, identityName, identitySubtitle, identityLoading, avatarSeed, avatarStyle, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar
        portal={portal}
        identityName={identityName}
        identitySubtitle={identitySubtitle}
        identityLoading={identityLoading}
        avatarSeed={avatarSeed}
        avatarStyle={avatarStyle}
        className="hidden lg:flex"
      />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 border-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar
            portal={portal}
            identityName={identityName}
            identitySubtitle={identitySubtitle}
            identityLoading={identityLoading}
            avatarSeed={avatarSeed}
            avatarStyle={avatarStyle}
            onNavigate={() => setMobileNavOpen(false)}
            className="flex w-full"
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          identityName={identityName}
          identitySubtitle={identitySubtitle}
          identityLoading={identityLoading}
          avatarSeed={avatarSeed}
          avatarStyle={avatarStyle}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <MobileBottomNav portal={portal} />
    </div>
  )
}
