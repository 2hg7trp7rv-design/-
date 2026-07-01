import type { PublicProfile } from './profile';

export interface AuthUser {
  uid: string;
}

export type AuthStatus = 'idle' | 'loading' | 'ready';
export type ProfileStatus = 'idle' | 'loading' | 'ready' | 'missing' | 'error';

export interface AuthProfileState {
  user: AuthUser | null;
  profile: PublicProfile | null;
  profileStatus: ProfileStatus;
}
