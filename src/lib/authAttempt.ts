import { getCurrentHost } from './firebase';

export const AUTH_ATTEMPT_KEY = 'mogumogu-auth-attempt';
export const AUTH_ATTEMPT_TTL_MS = 120_000;

export interface PendingAuthAttempt {
  method: 'popup' | 'redirect';
  startedAt: number;
  host: string;
}

export function readPendingAttempt(): PendingAuthAttempt | null {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(AUTH_ATTEMPT_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as Partial<PendingAuthAttempt>;
    if (data.method !== 'popup' && data.method !== 'redirect') return null;
    if (typeof data.startedAt !== 'number') return null;

    return {
      method: data.method,
      startedAt: data.startedAt,
      host: typeof data.host === 'string' ? data.host : '',
    };
  } catch {
    return null;
  }
}

export function writePendingAttempt(method: PendingAuthAttempt['method']): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(
      AUTH_ATTEMPT_KEY,
      JSON.stringify({
        method,
        startedAt: Date.now(),
        host: getCurrentHost(),
      } satisfies PendingAuthAttempt),
    );
  } catch {
    // Session storage can be unavailable in private browsing. Auth still gets a chance to continue.
  }
}

export function clearPendingAttempt(): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.removeItem(AUTH_ATTEMPT_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function isFreshPendingAttempt(): boolean {
  const pending = readPendingAttempt();
  if (!pending) return false;

  return Date.now() - pending.startedAt < AUTH_ATTEMPT_TTL_MS;
}
