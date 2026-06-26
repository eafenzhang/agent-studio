import React, { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/** Global error boundary that catches render errors and offers a way back home. */
class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error }: { error: Error | null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        padding: 24,
        textAlign: 'center',
        background: 'var(--cb-main-area-background)',
        color: 'var(--cb-text-primary)',
      }}
    >
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }} role="alert">{t('error.title')}</div>
      <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', marginBottom: 16, maxWidth: 480 }}>
        {error?.message || t('error.unknown')}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="chat-welcome-chip active"
          onClick={() => navigate('/')}
        >
          {t('error.home')}
        </button>
        <button
          className="chat-welcome-chip"
          onClick={() => window.location.reload()}
        >
          {t('error.reload')}
        </button>
      </div>
    </div>
  );
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryInner>
      {children}
    </ErrorBoundaryInner>
  );
}
