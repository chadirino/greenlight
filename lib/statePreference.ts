// Persisted "which state is the user studying" preference. Separate key
// from ProgressStore (lib/progress.ts) so it's untouched by that store's
// import/export/merge logic.
const STATE_KEY = "greenlight:selectedState";

export function getSelectedState(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STATE_KEY);
}

export function setSelectedState(state: string): void {
  localStorage.setItem(STATE_KEY, state);
}
