import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useMemo } from 'react';
import ConversationList from './ConversationList';
import { useUIStore } from '../../stores/ui-store';
import { useTaskStepsStore } from '../../stores/task-store';
import { useAgentStore } from '../../stores/agent-store';

interface NavItem {
  id: string;
  path: string;
  icon: JSX.Element;
  labelKey: string;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    id: 'home', path: '/',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    labelKey: 'nav.newTask',
  },
  {
    id: 'assistant', path: '/assistant',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a7 7 0 0 1 7 7v1a7 7 0 0 1-14 0v-1a7 7 0 0 1 7-7z"/><path d="M12 2v3"/><circle cx="12" cy="12" r="2"/></svg>,
    labelKey: 'nav.assistant',
  },
  {
    id: 'experts', path: '/experts',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"/></svg>,
    labelKey: 'nav.experts',
  },
  {
    id: 'projects', path: '/projects',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    labelKey: 'nav.projects',
    badge: 'Beta',
  },
  {
    id: 'tools', path: '/tools',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    labelKey: 'nav.tools',
  },
  {
    id: 'artifacts', path: '/artifacts',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    labelKey: 'nav.artifacts',
  },
  {
    id: 'files', path: '/files',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
    labelKey: 'nav.files',
  },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'tasks'>('all');
  const activeTaskConvs = useTaskStepsStore((s) => s.getActiveTaskConvs());
  const taskConvCount = activeTaskConvs.length;
  const activeAgents = useAgentStore((s) => s.getActiveAgents());
  const agentCount = activeAgents.length;

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`conversation-list ${sidebarOpen ? '' : 'collapsed'}`}>

      <div className="conversation-list-header">
        <div className="conversation-list-logo-row">
          <div
            className="conversation-list-logo"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/'); }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Agent Studio</span>
          </div>
          <span className="conversation-list-version-badge">v0.1</span>
          <button
            className="conversation-list-footer-btn"
            onClick={toggleSidebar}
            aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            style={{ marginLeft: 'auto' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {sidebarOpen ? (
                <>
                  <polyline points="15 18 9 12 15 6" />
                </>
              ) : (
                <>
                  <polyline points="9 18 15 12 9 6" />
                </>
              )}
            </svg>
          </button>
        </div>

        <div className="conversation-list-tabs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`conversation-list-tab-button ${isActive(item.path) ? 'active' : ''}`}
            >
              {item.icon}
              {t(item.labelKey)}
              {item.badge && (
                <span className="conversation-list-tab-beta">{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Search box */}
        <div style={{ marginTop: 8, position: 'relative' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sidebar.search')}
            style={{
              width: '100%',
              padding: '6px 10px 6px 28px',
              border: '1px solid var(--cb-border-subtle)',
              borderRadius: 6,
              fontSize: 12,
              color: 'var(--cb-text-primary)',
              background: 'var(--cb-main-area-background)',
              outline: 'none',
            }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--wb-color-text-disabled)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Active agents bar */}
        {agentCount > 0 && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            marginTop: 6,
            padding: '4px 0',
            borderTop: '1px solid var(--cb-border-subtle)',
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--wb-color-text-disabled)',
              padding: '2px 0',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              运行中 Agent ({agentCount})
            </div>
            {activeAgents.slice(0, 4).map((agent) => (
              <div
                key={agent.convId}
                onClick={() => navigate(`/chat/${agent.convId}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 8px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--cb-text-primary)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--wb-todo-menu-bg-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#22c55e',
                  flexShrink: 0,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                <span style={{ fontWeight: 500, color: 'var(--cb-button-primary)' }}>{agent.agentName}</span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--cb-text-secondary)' }}>
                  {agent.convTitle.slice(0, 20)}
                </span>
              </div>
            ))}
            {agentCount > 4 && (
              <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', padding: '2px 8px' }}>
                +{agentCount - 4} 更多
              </div>
            )}
          </div>
        )}

        {/* Task filter toggle */}
        {taskConvCount > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            <button
              className={`chat-welcome-chip ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
              style={{ fontSize: 11, padding: '2px 8px' }}
            >
              全部
            </button>
            <button
              className={`chat-welcome-chip ${filterMode === 'tasks' ? 'active' : ''}`}
              onClick={() => setFilterMode('tasks')}
              style={{ fontSize: 11, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              任务 ({taskConvCount})
            </button>
          </div>
        )}
      </div>

      <ConversationList search={search} filterMode={filterMode} />

      <div className="conversation-list-footer">
        <div className="conversation-list-footer-avatar">U</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate('/settings')}
          className="conversation-list-footer-btn"
          aria-label={t('nav.settings')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09" />
          </svg>
        </button>
      </div>
    </div>
  );
}
