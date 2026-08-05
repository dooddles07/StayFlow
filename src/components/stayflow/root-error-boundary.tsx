import * as React from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  error: Error | null
}

/**
 * Catches a throw from the providers that wrap every route.
 *
 * The router's own error component only covers what happens inside a route.
 * TooltipProvider, GlobalSearch and ToastViewport sit outside all of them, so a
 * throw there had nothing above it and left a white page with no way back.
 *
 * A class is the only way to implement this — React has no hook equivalent of
 * componentDidCatch. It stays independent of Link and the router for the same
 * reason the route fallbacks do: it has to render when routing is what broke.
 */
export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) console.error(error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
        <AlertTriangle className="size-8 text-red-500" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          StayFlow hit a snag
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-text">
          Something went wrong while loading the app. Reloading usually clears
          it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-xl bg-accent-indigo px-4 py-2 text-sm font-medium text-white hover:bg-accent-indigo-soft"
        >
          Reload StayFlow
        </button>
      </div>
    )
  }
}
