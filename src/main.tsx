import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initPerformanceTracking } from './utils/performance.ts';

// Initialize performance tracking for Web Vitals (FCP, LCP)
initPerformanceTracking();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
