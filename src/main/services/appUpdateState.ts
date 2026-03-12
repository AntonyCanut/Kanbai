/**
 * Shared state for the app update lifecycle.
 * Extracted to its own module to avoid circular imports between
 * index.ts (before-quit handler) and appUpdate.ts (install handler).
 */
let installing = false

/** Signal that quitAndInstall is imminent (called from appUpdate handler). */
export function setAppUpdateInstalling(): void {
  installing = true
}

/** Check if an app update install is in progress. */
export function isAppUpdateInstalling(): boolean {
  return installing
}
