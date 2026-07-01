export function getAuthErrorCode(error: unknown): string {
  return typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
}

export function toAuthErrorMessage(error: unknown): string {
  const fallback = 'ログイン処理に失敗しました。もう一度お試しください。';
  const code = getAuthErrorCode(error);
  const message = error instanceof Error ? error.message : fallback;

  if (code.includes('unauthorized-domain')) {
    return 'このドメインはFirebaseで許可されていません。承認済みドメインを確認してください。';
  }
  if (code.includes('popup-blocked')) {
    return 'ポップアップがブロックされました。リダイレクトログインに切り替えてください。';
  }
  if (code.includes('popup-closed') || code.includes('cancelled')) {
    return 'Googleログインの画面が閉じられました。もう一度お試しください。';
  }
  if (code.includes('network') || code.includes('unavailable')) {
    return 'ネットワークに接続できません。通信状態を確認してください。';
  }
  if (code.includes('permission-denied')) {
    return 'Firestoreの権限が不足しています。Rulesが公開済みか確認してください。';
  }
  if (code.includes('web-storage-unsupported')) {
    return 'このブラウザではログイン情報を保存できません。Safariのプライベートブラウズを解除してください。';
  }

  return message || fallback;
}

export function shouldFallbackToRedirect(error: unknown): boolean {
  const code = getAuthErrorCode(error);

  return (
    code.includes('popup-blocked') ||
    code.includes('popup-closed') ||
    code.includes('cancelled-popup-request') ||
    code.includes('operation-not-supported') ||
    code.includes('auth/internal-error') ||
    code.includes('timeout')
  );
}
