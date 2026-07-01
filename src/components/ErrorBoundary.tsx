import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Home, RotateCcw } from 'lucide-react';
import { GrassTuft } from './assets';
import { translations, type Language } from '../lib/i18n';
import { GAME_IMAGE_ASSETS } from '../lib/gameImageAssets';

interface ErrorBoundaryProps {
  children: ReactNode;
  language?: Language;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Keep the app resilient without exposing implementation details to users.
    console.error('MoguMogu app error', error, info);
  }

  private goHome = () => {
    window.location.hash = '#/';
    this.setState({ hasError: false });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const language = this.props.language ?? 'en';
    const copy = translations[language];

    return (
      <div
        className="h-[100dvh] relative overflow-hidden flex flex-col items-center justify-center px-6 text-center"
        style={{
          background:
            'linear-gradient(180deg, #4FC3F7 0%, #81D4FA 50%, #81D4FA 70%, #66BB6A 70%, #43A047 100%)',
        }}
      >
        <div className="w-32 h-32 mb-4 animate-float">
          <img
            src={GAME_IMAGE_ASSETS.moles.normal}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain drop-shadow-xl"
            draggable={false}
            decoding="async"
            loading="eager"
          />
        </div>
        <h1
          className="font-display text-3xl text-accent-yellow"
          style={{ textShadow: '0 3px 0 #5D4037, 0 4px 10px rgba(0,0,0,0.3)' }}
        >
          {copy.appCrashedTitle}
        </h1>
        <p className="mt-3 max-w-[300px] rounded-2xl bg-white/60 px-4 py-3 text-sm font-bold text-text-dark backdrop-blur-sm">
          {copy.appCrashedDesc}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            className="h-12 rounded-full bg-white px-5 font-bold text-text-dark shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
            onClick={this.goHome}
          >
            <span className="flex items-center gap-2">
              <Home size={16} />
              {copy.home}
            </span>
          </button>
          <button
            type="button"
            className="h-12 rounded-full bg-accent-pink px-5 font-bold text-white shadow-btn-pink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
            onClick={this.reload}
          >
            <span className="flex items-center gap-2">
              <RotateCcw size={16} />
              {copy.reload}
            </span>
          </button>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0">
          <div className="flex items-end justify-between px-2">
            <GrassTuft className="h-8 w-16 opacity-80" />
            <GrassTuft className="-mb-1 h-10 w-20 opacity-90" />
            <GrassTuft className="h-7 w-14 opacity-70" />
            <GrassTuft className="h-9 w-18 opacity-80" />
          </div>
        </div>
      </div>
    );
  }
}
