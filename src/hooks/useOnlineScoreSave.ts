import { useCallback, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { playGameSound } from '../lib/audio';
import { t, type Language } from '../lib/i18n';
import { submitOnlineScore, validateScoreSubmission } from '../lib/leaderboard';
import type { AuthUser } from '../lib/authTypes';
import type { PublicProfile } from '../lib/profile';
import type { Difficulty } from '../store/gameStore';

export type OnlineSaveUiStatus = 'idle' | 'saving' | 'saved' | 'not_improved' | 'error';

interface UseOnlineScoreSaveArgs {
  authUser: AuthUser | null;
  authProfile: PublicProfile | null;
  badHits: number;
  difficulty: Difficulty;
  goodHits: number;
  isFirebaseConfigured: boolean;
  language: Language;
  maxCombo: number;
  missedFriendly: number;
  navigate: NavigateFunction;
  score: number;
  soundEnabled: boolean;
}

export function useOnlineScoreSave({
  authUser,
  authProfile,
  badHits,
  difficulty,
  goodHits,
  isFirebaseConfigured,
  language,
  maxCombo,
  missedFriendly,
  navigate,
  score,
  soundEnabled,
}: UseOnlineScoreSaveArgs) {
  const [status, setStatus] = useState<OnlineSaveUiStatus>('idle');
  const [message, setMessage] = useState('');

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
  }, []);

  const save = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setStatus('error');
      setMessage(t(language, 'firebaseNotConfigured'));
      return;
    }

    if (!authUser) {
      playGameSound(soundEnabled, 'menu');
      navigate('/login');
      return;
    }

    if (!authProfile) {
      playGameSound(soundEnabled, 'menu');
      navigate('/nickname');
      return;
    }

    const submission = {
      user: authUser,
      profile: authProfile,
      difficulty,
      score,
      maxCombo,
      goodHits,
      badHits,
      missedFriendly,
    };

    const validationErrors = validateScoreSubmission(submission);
    if (validationErrors.length > 0) {
      setStatus('error');
      setMessage(t(language, 'antiCheatRejected'));
      return;
    }

    setStatus('saving');
    setMessage('');

    try {
      const result = await submitOnlineScore(submission);

      if (result.status === 'not_improved') {
        setStatus('not_improved');
        setMessage(t(language, 'onlineNotImproved'));
        return;
      }

      setStatus('saved');
      setMessage(
        result.status === 'updated' ? t(language, 'updatedOnlineBest') : t(language, 'savedOnline'),
      );
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : t(language, 'onlineRankingUnavailable'));
    }
  }, [
    authUser,
    authProfile,
    badHits,
    difficulty,
    goodHits,
    isFirebaseConfigured,
    language,
    maxCombo,
    missedFriendly,
    navigate,
    score,
    soundEnabled,
  ]);

  return {
    onlineSaveStatus: status,
    onlineSaveMessage: message,
    handleSaveOnline: save,
    resetOnlineSave: reset,
  };
}
