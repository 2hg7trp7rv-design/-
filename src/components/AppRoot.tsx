import { HashRouter } from 'react-router-dom';
import ErrorBoundary from './ErrorBoundary';
import AppChrome from './AppChrome';
import AuthBootstrap from './AuthBootstrap';
import { useGameStore } from '../store/gameStore';

function normalizeBrowserPathToHashRoute() {
  if (typeof window === 'undefined') return;

  const { pathname, search, hash } = window.location;
  if (pathname === '/' || hash.startsWith('#/')) return;

  window.history.replaceState(null, '', `/#${pathname}${search}`);
}

export default function AppRoot() {
  normalizeBrowserPathToHashRoute();
  const language = useGameStore((state) => state.language);

  return (
    <ErrorBoundary language={language}>
      <HashRouter>
        <AuthBootstrap />
        <AppChrome />
      </HashRouter>
    </ErrorBoundary>
  );
}
