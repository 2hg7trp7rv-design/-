import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Gamepad2, Trophy, Settings } from 'lucide-react';
import { t } from '../lib/i18n';
import { useGameStore } from '../store/gameStore';

const tabs = [
  { path: '/game', key: 'play' as const, icon: Gamepad2 },
  { path: '/ranking', key: 'ranking' as const, icon: Trophy },
  { path: '/settings', key: 'settings' as const, icon: Settings },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const language = useGameStore((state) => state.language);

  return (
    <nav
      aria-label={t(language, 'primaryNavigation')}
      className="shrink-0 h-16 safe-bottom bg-bg-cream/95 backdrop-blur-sm border-t-2 border-grass-light/30 z-50 flex items-center justify-around select-none"
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        const label = t(language, tab.key);

        return (
          <button
            key={tab.path}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
            onClick={() => navigate(tab.path)}
            className="relative flex h-full w-20 flex-col items-center justify-center gap-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-pink/40"
          >
            {isActive && (
              <motion.div
                layoutId="activeTab"
                className="absolute top-0 h-[3px] w-10 rounded-b-full bg-accent-pink"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Icon
              size={24}
              className={isActive ? 'text-accent-pink' : 'text-[#BCAAA4]'}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span
              className={`font-body text-[11px] font-semibold ${
                isActive ? 'text-accent-pink' : 'text-[#BCAAA4]'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
