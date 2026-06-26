import { Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../sidebar/Sidebar';
import ThemeToggle from '../ui/ThemeToggle';
import { useConversation } from '../../hooks/use-api';
import { useUIStore } from '../../stores/ui-store';
import { useAgentStore } from '../../stores/agent-store';
import { useEffect } from 'react';
import * as api from '../../lib/api';
import { wsClient } from '../../lib/websocket';

const STATUS_CONFIG = {
  connected: { label: '已连接', color: '#22c55e', dot: '#22c55e' },
  connecting: { label: '连接中...', color: '#f59e0b', dot: '#f59e0b' },
  disconnected: { label: '未连接', color: '#ef4444', dot: '#ef4444' },
} as const;

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { convId } = useParams<{ convId: string }>();
  const { data: conversation } = useConversation(convId || '');
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);
  const addToast = useUIStore((s) => s.addToast);
  const openTabs = useUIStore((s) => s.openTabs);
  const closeTab = useUIStore((s) => s.closeTab);
  const activeAgents = useAgentStore((s) => s.activeAgents);

  const isChat = location.pathname.startsWith('/chat/');

  const pageTitles: Record<string, string> = {
    '/': t('home.title'),
    '/settings': t('settings.title'),
    '/experts': t('experts.title'),
    '/tools': t('tools.title'),
    '/artifacts': t('artifacts.title'),
    '/projects': t('projects.title'),
  };

  const title = isChat
    ? (conversation?.name || conversation?.title || '聊天')
    : (pageTitles[location.pathname] || t('app.title'));

  // ---- Periodic health check ----
  useEffect(() => {
    let healthTimer: ReturnType<typeof setInterval> | null = null;

    const check = async () => {
      try {
        const ok = await api.healthCheck();
        if (ok) {
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('disconnected');
        }
      } catch {
        setConnectionStatus('disconnected');
      }
    };

    // Initial check
    check();

    // Periodic check every 30s
    healthTimer = setInterval(check, 30000);

    // Listen for WS connection changes
    const unsubConnected = wsClient.on('connected', () => {
      setConnectionStatus('connected');
    });
    const unsubDisconnected = wsClient.on('disconnected', () => {
      setConnectionStatus('disconnected');
    });
    const unsubReconnectFailed = wsClient.on('reconnect_failed', () => {
      addToast('后端连接断开，请检查 AionCore 是否运行中', 'warning');
    });

    return () => {
      if (healthTimer) clearInterval(healthTimer);
      unsubConnected();
      unsubDisconnected();
      unsubReconnectFailed();
    };
  }, [setConnectionStatus, addToast]);

  const statusInfo = STATUS_CONFIG[connectionStatus];

  return (
    <div className="teams-container">
      <Sidebar />

      <div className="teams-content-wrapper">
        <div className="workbuddy-topbar">
          <div className="workbuddy-topbar-left">
            <span className="workbuddy-topbar-title">{title}</span>
          </div>
          <div className="workbuddy-topbar-actions">
            {/* Connection Status */}
            <div
              className="connection-status-indicator"
              title={`后端状态: ${statusInfo.label}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                color: statusInfo.color,
                cursor: 'default',
                background: connectionStatus === 'connected'
                  ? 'rgba(34,197,94,0.08)'
                  : connectionStatus === 'connecting'
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(239,68,68,0.08)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: statusInfo.dot,
                  display: 'inline-block',
                  animation: connectionStatus === 'connecting' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                  flexShrink: 0,
                }}
              />
              <span>{statusInfo.label}</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
        {/* Tab bar — shows open conversation tabs for easy switching */}
        {openTabs.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            padding: '0 16px',
            background: 'var(--cb-main-area-background)',
            borderBottom: '1px solid var(--cb-border-subtle)',
            flexShrink: 0,
            overflowX: 'auto',
          }}>
            {openTabs.map((tab, idx) => {
              const isActive = location.pathname === `/chat/${tab.conversationId}`;
              return (
                <div
                  key={tab.conversationId}
                  onClick={() => navigate(`/chat/${tab.conversationId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 10px',
                    fontSize: 12,
                    borderRadius: '6px 6px 0 0',
                    cursor: 'pointer',
                    color: isActive ? 'var(--cb-text-primary)' : 'var(--cb-text-secondary)',
                    background: isActive ? 'var(--wb-color-bg-primary, #fff)' : 'transparent',
                    borderBottom: isActive ? '2px solid var(--cb-button-primary)' : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    maxWidth: 160,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flexShrink: 0,
                  }}
                >
                  {/* Active agent indicator dot */}
                  {activeAgents[tab.conversationId] && (
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#22c55e',
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.title}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); closeTab(idx); }}
                    style={{
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      fontSize: 12,
                      color: 'var(--wb-color-text-disabled)',
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="chat-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
