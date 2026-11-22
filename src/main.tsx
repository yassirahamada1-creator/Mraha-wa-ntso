import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { applyPlatformAttributes, detectPlatform } from './utils/platform';

applyPlatformAttributes(detectPlatform());
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(<App />);
