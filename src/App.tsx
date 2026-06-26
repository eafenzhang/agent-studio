import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import ToastContainer from './components/ui/Toast';
import ConfirmModal from './components/ui/ConfirmModal';
import { SkeletonCard } from './components/ui/Skeleton';
import { initKeyboard, register } from './utils/keyboard';

// Eager-loaded core pages
import HomePage from './pages/HomePage';

// Lazy-loaded pages for code splitting
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const ExpertsPage = lazy(() => import('./pages/ExpertsPage'));
const ToolsPage = lazy(() => import('./pages/ToolsPage'));
const ArtifactsPage = lazy(() => import('./pages/ArtifactsPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

/** Shared Suspense fallback for lazy page loading */
function PageFallback() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SkeletonCard />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize the keyboard registry system
    initKeyboard();

    // Ctrl+N: New conversation → navigate to home
    register('Ctrl+n', () => {
      navigate('/');
    });

    // Ctrl+K: Focus search (fires a custom event for sidebar to pick up)
    register('Ctrl+k', () => {
      window.dispatchEvent(new CustomEvent('app:focus-search'));
    });

    // Ctrl+W: Close current tab (fires custom event)
    register('Ctrl+w', () => {
      window.dispatchEvent(new CustomEvent('app:close-tab'));
    });

    // Ctrl+Tab: Next tab
    register('Ctrl+Tab', () => {
      window.dispatchEvent(new CustomEvent('app:next-tab'));
    });

    // Ctrl+Shift+Tab: Previous tab
    register('Ctrl+Shift+Tab', () => {
      window.dispatchEvent(new CustomEvent('app:prev-tab'));
    });

    // Escape: Close active modal / cancel current action
    register('Escape', () => {
      window.dispatchEvent(new CustomEvent('app:escape'));
    });

    // Cleanup not strictly necessary since initKeyboard sets up a
    // single global listener, but we unregister to be tidy.
    return () => {
      // The keyboard listener is global — no need to tear down
      // unless we want to support hot-reload scenarios cleanly.
    };
  }, [navigate]);

  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/assistant" element={<Navigate to="/" replace />} />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageFallback />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="/experts"
            element={
              <Suspense fallback={<PageFallback />}>
                <ExpertsPage />
              </Suspense>
            }
          />
          <Route
            path="/tools"
            element={
              <Suspense fallback={<PageFallback />}>
                <ToolsPage />
              </Suspense>
            }
          />
          <Route
            path="/artifacts"
            element={
              <Suspense fallback={<PageFallback />}>
                <ArtifactsPage />
              </Suspense>
            }
          />
          <Route
            path="/projects"
            element={
              <Suspense fallback={<PageFallback />}>
                <ProjectsPage />
              </Suspense>
            }
          />
          <Route
            path="/chat/:convId"
            element={
              <Suspense fallback={<PageFallback />}>
                <ChatPage />
              </Suspense>
            }
          />
          <Route
            path="/files"
            element={
              <Suspense fallback={<PageFallback />}>
                <FilesPage />
              </Suspense>
            }
          />
        </Route>
      </Routes>
      <ToastContainer />
      <ConfirmModal />
    </>
  );
}
