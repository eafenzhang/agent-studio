import React, { Component, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/** Global error boundary that catches render errors and offers recovery options. */
class ErrorBoundaryInner extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function ErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = React.useState(false);

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
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.6 }}>⚡</div>
      <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }} role="alert">{t('error.title')}</div>
      <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', marginBottom: 16, maxWidth: 480 }}>
        {error?.message || t('error.unknown')}
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          className="chat-welcome-chip active"
          onClick={onRetry}
          title="尝试重新渲染"
        >
          {t('error.retry') || '重试'}
        </button>
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
        {error && (
          <button
            className="chat-welcome-chip"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? '隐藏详情' : '查看详情'}
          </button>
        )}
      </div>
      {showDetails && error && (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: 'var(--cb-bg-secondary)',
            borderRadius: 8,
            fontSize: 11,
            color: 'var(--cb-text-secondary)',
            maxWidth: '100%',
            overflow: 'auto',
            textAlign: 'left',
            maxHeight: 200,
          }}
        >
          {error.stack || error.message}
        </pre>
      )}
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
