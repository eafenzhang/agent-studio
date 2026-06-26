import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { initLegacyBridge } from './lib/bridge';
import './styles/main.css';
import './styles/original-ui.css';
import './i18n';

const queryClient = new QueryClient();

// Initialize legacy JS ↔ React bridge
initLegacyBridge();

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </HashRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
}
