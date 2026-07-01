export const PROFILE_VERSION = 'profile-v1';
export const PUBLIC_ID_PREFIX = 'mogu_';
export const MIN_NICKNAME_LENGTH = 2;
export const MAX_NICKNAME_LENGTH = 12;

export interface PublicProfile {
  publicId: string;
  nickname: string;
  profileVersion: typeof PROFILE_VERSION;
}

export interface NicknameValidationOptions {
  allowReservedWords?: boolean;
}

export interface NicknameValidationResult {
  nickname: string;
  errors: string[];
  reservedWordUsed: boolean;
}

export const RESERVED_NICKNAME_WORDS = [
  'admin',
  'administrator',
  'moderator',
  'staff',
  'official',
  'firebase',
  'google',
  '運営',
  '公式',
  '管理者',
] as const;

export function normalizeNickname(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

function characterLength(value: string): number {
  return Array.from(value).length;
}

export function usesReservedNicknameWord(input: string): boolean {
  const nickname = normalizeNickname(input);
  const lower = nickname.toLowerCase();

  return RESERVED_NICKNAME_WORDS.some((word) => lower.includes(word.toLowerCase()));
}

export function validateNickname(
  input: string,
  options: NicknameValidationOptions = {},
): NicknameValidationResult {
  const nickname = normalizeNickname(input);
  const errors: string[] = [];
  const length = characterLength(nickname);
  const reservedWordUsed = usesReservedNicknameWord(nickname);

  if (length < MIN_NICKNAME_LENGTH) {
    errors.push(`ニックネームは${MIN_NICKNAME_LENGTH}文字以上にしてください。`);
  }

  if (length > MAX_NICKNAME_LENGTH) {
    errors.push(`ニックネームは${MAX_NICKNAME_LENGTH}文字以内にしてください。`);
  }

  if (
    Array.from(nickname).some((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    errors.push('制御文字は使えません。');
  }

  if (/\S+@\S+\.\S+/.test(nickname) || nickname.includes('@')) {
    errors.push('メールアドレスのような文字は使えません。');
  }

  if (/(https?:\/\/|www\.|\.com|\.jp|\.net|\.org|\.io|\/)/i.test(nickname)) {
    errors.push('URLのような文字は使えません。');
  }

  if (reservedWordUsed && !options.allowReservedWords) {
    errors.push('運営者や外部サービスと誤解される名前は使えません。');
  }

  return { nickname, errors, reservedWordUsed };
}

export function createPublicId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const random = Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
    return `${PUBLIC_ID_PREFIX}${random.slice(0, 18)}`;
  }

  return `${PUBLIC_ID_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function isSafePublicProfile(
  value: unknown,
  options: NicknameValidationOptions = {},
): value is PublicProfile {
  if (!value || typeof value !== 'object') return false;

  const data = value as Partial<PublicProfile>;
  const nicknameValidation = validateNickname(data.nickname ?? '', options);

  return (
    typeof data.publicId === 'string' &&
    data.publicId.startsWith(PUBLIC_ID_PREFIX) &&
    data.publicId.length >= 10 &&
    data.publicId.length <= 32 &&
    typeof data.nickname === 'string' &&
    nicknameValidation.errors.length === 0 &&
    data.profileVersion === PROFILE_VERSION
  );
}
