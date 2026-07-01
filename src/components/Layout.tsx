import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';

export default function Layout() {
  const location = useLocation();
  const shouldHideNavbar = location.pathname === '/game';

  return (
    <div className="h-[100dvh] flex flex-col bg-bg-cream overflow-hidden">
      <main className="flex-1 min-h-0 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="h-full min-h-0"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {!shouldHideNavbar && <Navbar />}
    </div>
  );
}
