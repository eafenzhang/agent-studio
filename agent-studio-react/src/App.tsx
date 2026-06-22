import React, { useState, useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { pageTitles } from './data/constants';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TopBar } from './components/TopBar/TopBar';
import { HomePage } from './components/pages/HomePage';
import { AssistantPage } from './components/pages/AssistantPage';
import { ProjectsPage } from './components/pages/ProjectsPage';
import { ExpertsPage } from './components/pages/ExpertsPage';
import { ToolsPage } from './components/pages/ToolsPage';
import { ArtifactsPage } from './components/pages/ArtifactsPage';
import { ConversationDetail } from './components/pages/ConversationDetail';
import { SettingsModal } from './components/Settings/SettingsModal';
import { wsClient } from './services/ws';

const AION_CORE_URL = import.meta.env.VITE_AION_CORE_URL || 'http://localhost:25808';

const StartupScreen: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  const [status, setStatus] = useState<'connecting' | 'failed'>('connecting');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const res = await fetch(`${AION_CORE_URL}/api/system/info`, { signal: AbortSignal.timeout(3000) });
        const d = await res.json();
        if (!cancelled && d?.success) {
          // 后端就绪 → 连接 WebSocket
          await wsClient.connect().catch(() => {});
          if (!cancelled) onReady();
        }
      } catch {
        if (!cancelled) { setRetryCount(i => i + 1); setStatus('failed'); }
      }
    };

    timeout = setTimeout(check, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [retryCount]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#fff', gap: 16 }}>
      <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--cb-button-primary)' }}>Agent Studio</div>
      {status === 'connecting' ? (
        <>
          <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)' }}>正在连接 AionCore 后端...</div>
          <div className="streaming-wait"><span className="streaming-dot">.</span><span className="streaming-dot">.</span><span className="streaming-dot">.</span></div>
        </>
      ) : (
        <>
          <div style={{ fontSize: 13, color: '#e65100', maxWidth: 400, textAlign: 'center' }}>AionCore 后端未响应</div>
          <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', maxWidth: 500, textAlign: 'center', fontFamily: 'var(--cb-font-mono)', background: '#f5f5f5', padding: 12, borderRadius: 8 }}>
            AionCore 后端未启动，请启动后端服务后重试
          </div>
          <button onClick={() => { setStatus('connecting'); setRetryCount(i => i + 1); }}
            style={{ padding: '8px 24px', background: 'var(--cb-button-primary)', color: '#fff', borderRadius: 6, fontSize: 13, border: 'none', cursor: 'pointer' }}>
            重试连接
          </button>
          <button onClick={onReady}
            style={{ padding: '6px 16px', background: 'transparent', color: 'var(--cb-text-secondary)', borderRadius: 6, fontSize: 12, border: '1px solid var(--cb-border)', cursor: 'pointer' }}>
            离线模式进入
          </button>
        </>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [backendReady, setBackendReady] = useState(false);
  const activePage = useAppStore((s) => s.activePage);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const conversationTitle = useAppStore((s) => s.conversationTitle);
  const switchPage = useAppStore((s) => s.switchPage);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const openSettings = useAppStore((s) => s.openSettings);
  const closeSettings = useAppStore((s) => s.closeSettings);
  const openConversation = useAppStore((s) => s.openConversation);

  if (!backendReady) {
    return <StartupScreen onReady={() => setBackendReady(true)} />;
  }

  const getTitle = (): string => {
    if (conversationTitle) return conversationTitle;
    return pageTitles[activePage] || '';
  };

  const renderPage = () => {
    if (conversationTitle) return <ConversationDetail />;
    switch (activePage) {
      case 'home': return <HomePage />;
      case 'assistant': return <AssistantPage />;
      case 'projects': return <ProjectsPage />;
      case 'experts': return <ExpertsPage />;
      case 'tools': return <ToolsPage />;
      case 'artifacts': return <ArtifactsPage />;
      default: return <HomePage />;
    }
  };

  return (
    <>
      <div className="teams-container">
        <Sidebar
          activePage={activePage}
          collapsed={sidebarCollapsed}
          selectedConversation={conversationTitle}
          onSwitchPage={switchPage}
          onToggleSidebar={toggleSidebar}
          onOpenSettings={openSettings}
          onOpenConversation={openConversation}
        />
        <div className="teams-content-wrapper">
          <TopBar title={getTitle()} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
          <div className="chat-container">{renderPage()}</div>
        </div>
      </div>
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
    </>
  );
};

export default App;
