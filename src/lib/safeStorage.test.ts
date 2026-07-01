import { beforeEach, describe, expect, it } from 'vitest';
import { consumeStorageRecoveryFlag, safeLocalStorage } from './safeStorage';

describe('safeLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('quarantines broken JSON instead of throwing during persisted-state hydration', () => {
    localStorage.setItem('mogumogu-storage', '{broken-json');

    expect(safeLocalStorage.getItem('mogumogu-storage')).toBeNull();
    expect(localStorage.getItem('mogumogu-storage')).toBeNull();
    expect(
      Object.keys(localStorage).some((key) => key.startsWith('mogumogu-storage.corrupt.')),
    ).toBe(true);
    expect(consumeStorageRecoveryFlag()).toBe(true);
    expect(consumeStorageRecoveryFlag()).toBe(false);
  });
});
