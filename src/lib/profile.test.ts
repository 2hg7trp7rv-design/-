import { describe, expect, it, vi } from 'vitest';
import { createPublicId, normalizeNickname, validateNickname } from './profile';

describe('public profile helpers', () => {
  it('normalizes nickname whitespace', () => {
    expect(normalizeNickname('  もぐ   太郎  ')).toBe('もぐ 太郎');
  });

  it('accepts normal nicknames', () => {
    expect(validateNickname('もぐ太郎').errors).toEqual([]);
    expect(validateNickname('Mogu_7').errors).toEqual([]);
  });

  it('rejects email-like, url-like, and official-looking names', () => {
    expect(validateNickname('a@b.com').errors.length).toBeGreaterThan(0);
    expect(validateNickname('https://example.com').errors.length).toBeGreaterThan(0);
    expect(validateNickname('Google公式').errors.length).toBeGreaterThan(0);
  });

  it('allows reserved official-looking nicknames only when owner mode is enabled', () => {
    expect(validateNickname('運営者').errors.length).toBeGreaterThan(0);

    const ownerValidation = validateNickname('運営者', { allowReservedWords: true });
    expect(ownerValidation.errors).toEqual([]);
    expect(ownerValidation.reservedWordUsed).toBe(true);
  });

  it('creates a public id that does not reveal auth uid', () => {
    vi.spyOn(crypto, 'getRandomValues').mockImplementation((array) => {
      const typed = array as Uint8Array;
      typed.fill(7);
      return array;
    });

    expect(createPublicId()).toMatch(/^mogu_[a-z0-9]+$/);
    expect(createPublicId()).not.toContain('uid');

    vi.restoreAllMocks();
  });
});
