import type { StateStorage } from 'zustand/middleware';

const RECOVERY_FLAG = 'mogumogu-storage-recovered';

function markRecovered(): void {
  try {
    sessionStorage.setItem(RECOVERY_FLAG, '1');
  } catch {
    // Ignore storage failures. The important part is that the app stays usable.
  }
}

function quarantineBrokenValue(name: string, value: string): void {
  try {
    const key = `${name}.corrupt.${Date.now()}`;
    localStorage.setItem(key, value);
    localStorage.removeItem(name);
    markRecovered();
  } catch {
    try {
      localStorage.removeItem(name);
      markRecovered();
    } catch {
      // Ignore.
    }
  }
}

export function consumeStorageRecoveryFlag(): boolean {
  try {
    const hadRecovery = sessionStorage.getItem(RECOVERY_FLAG) === '1';
    if (hadRecovery) {
      sessionStorage.removeItem(RECOVERY_FLAG);
    }

    return hadRecovery;
  } catch {
    return false;
  }
}

export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;

    try {
      const value = localStorage.getItem(name);
      if (typeof value !== 'string') return value;

      try {
        JSON.parse(value);
        return value;
      } catch {
        quarantineBrokenValue(name, value);
        return null;
      }
    } catch {
      return null;
    }
  },

  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // Saving should never crash gameplay.
    }
  },

  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // Ignore.
    }
  },
};
