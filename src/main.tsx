import { createRoot } from 'react-dom/client';
import AppRoot from './components/AppRoot';
import './index.css';
import { registerAppServiceWorker } from './lib/serviceWorker';

createRoot(document.getElementById('root')!).render(<AppRoot />);

registerAppServiceWorker();
