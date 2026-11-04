/** Idle logout after 60 minutes without pointer/keyboard activity. */
export const SESSION_IDLE_TIMEOUT_MS = 60 * 60 * 1000;

export const SESSION_IDLE_STORAGE_KEY = 'campusops.lastActivityAt';

export function touchSessionActivity(at: number = Date.now()): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.setItem(SESSION_IDLE_STORAGE_KEY, String(at));
}

export function getLastSessionActivityAt(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(SESSION_IDLE_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clearSessionActivity(): void {
  if (typeof window === 'undefined') {
    return;
  }
  sessionStorage.removeItem(SESSION_IDLE_STORAGE_KEY);
}
