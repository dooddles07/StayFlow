import * as React from 'react'

// Minimal toast store built on useSyncExternalStore (React's own primitive for
// external mutable state + SSR) instead of sonner: sonner's Toaster never receives
// its mount effect in this app's SSR setup (confirmed via direct instrumentation —
// its internal subscribe() never registers, in both the 1.x and 2.x implementations),
// so every toast() call silently no-ops. This store sidesteps that class of bug
// entirely — useSyncExternalStore is the React-blessed hook for exactly this case.
export type ToastVariant = 'success' | 'error' | 'info'
export interface ToastItem {
  id: number
  variant: ToastVariant
  message: string
  description?: string
}
export interface ToastOptions {
  description?: string
}

const DURATION_MS = 4000
const EMPTY: ToastItem[] = []

let toasts: ToastItem[] = EMPTY
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return toasts
}

function getServerSnapshot() {
  return EMPTY
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function push(variant: ToastVariant, message: string, options?: ToastOptions) {
  const id = nextId++
  toasts = [
    ...toasts,
    { id, variant, message, description: options?.description },
  ]
  emit()
  setTimeout(() => dismissToast(id), DURATION_MS)
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    push('success', message, options),
  error: (message: string, options?: ToastOptions) =>
    push('error', message, options),
  info: (message: string, options?: ToastOptions) =>
    push('info', message, options),
}

export function useToasts() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
