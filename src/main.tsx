import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';

// Register Service Worker for offline PWA capability
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore SW registration error in restricted environments
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

