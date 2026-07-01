import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export default function AuthBootstrap() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  return null;
}
