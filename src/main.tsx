import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { initLegacyBridge } from './lib/bridge';
import './styles/main.css';
import './styles/original-ui.css';
import './i18n';
import { useUIStore } from './stores/ui-store';

const queryClient = new QueryClient();

function getResolvedTheme(): 'light' | 'dark' {
  const theme = useUIStore.getState().theme;
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

function createAppTheme() {
  return createTheme({
    palette: {
      mode: getResolvedTheme(),
      primary: {
        main: '#6c4dff',
      },
    },
    typography: {
      fontFamily: 'var(--cb-font-family, "Inter", sans-serif)',
    },
  });
}

function AppWithTheme() {
  const theme = useUIStore((s) => s.theme);
  const muiTheme = React.useMemo(() => createAppTheme(), [theme]);
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <HashRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </HashRouter>
    </ThemeProvider>
  );
}

// Initialize legacy JS ↔ React bridge
initLegacyBridge();

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppWithTheme />
      </QueryClientProvider>
    </React.StrictMode>
  );
}
