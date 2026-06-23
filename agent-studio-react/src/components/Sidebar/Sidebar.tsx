import React from 'react';
import type { PageId } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { conversationApi } from '../../services/api';

interface SidebarProps {
  activePage: PageId;
  collapsed: boolean;
  selectedConversation: string | null;
  onSwitchPage: (page: PageId) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onOpenConversation: (title: string, id?: string) => void;
}

const navItems: { id: PageId; label: string; badge?: string; icon: React.ReactNode }[] = [
  { id: 'home', label: '新建任务', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> },
  { id: 'assistant', label: '助理', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a7 7 0 0 1 7 7v1a7 7 0 0 1-14 0v-1a7 7 0 0 1 7-7z"/><path d="M12 2v3"/><circle cx="12" cy="12" r="2"/></svg> },
  { id: 'tasks', label: '任务', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { id: 'experts', label: '专家', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2"/></svg> },
  { id: 'tools', label: '工具', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { id: 'artifacts', label: '产物', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activePage, collapsed, selectedConversation,
  onSwitchPage, onToggleSidebar, onOpenSettings, onOpenConversation,
}) => {
  const conversations = useChatStore((s) => s.conversations);

  // 过滤：只显示有有效名称的会话
  const validConvs = conversations.filter(c => (c.title || c.name || '').trim().length > 0);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await conversationApi.delete(id);
      useChatStore.getState().setConversations(conversations.filter(c => c.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className={`conversation-list${collapsed ? ' collapsed' : ''}`}>
      <div className="conversation-list-header">
        <div className="conversation-list-logo-row">
          <div className="conversation-list-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <span>Agent Studio</span>
          </div>
          <button className="conversation-list-footer-btn" aria-label="折叠侧栏" onClick={onToggleSidebar}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="15 9 12 12 15 15"/></svg>
          </button>
        </div>
        <div className="conversation-list-tabs" role="tablist">
          {navItems.map((item) => (
            <button key={item.id} className={`conversation-list-tab-button conversation-list-tab-button-box${activePage === item.id ? ' active' : ''}`} role="tab" aria-selected={activePage === item.id} onClick={() => onSwitchPage(item.id)}>
              {item.icon}{item.label}{item.badge && <span className="conversation-list-tab-beta">{item.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="conversation-list-content">
        <div className="conversation-section">
          <div className="conversation-section-label">
            <span className="conversation-section-label-text">对话 ({validConvs.length})</span>
            <svg className="conversation-section-chevron conversation-section-chevron-expanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div className="conversation-section-content">
            {validConvs.length === 0 ? (
              <div style={{ padding: '16px 12px', fontSize: 12, color: 'var(--wb-color-text-disabled)', textAlign: 'center' }}>暂无对话</div>
            ) : (
              validConvs.map((conv) => {
                const displayName = conv.title || conv.name || conv.id;
                return (
                  <div key={conv.id} className={`conversation-agent-card${selectedConversation === displayName ? ' selected' : ''}`}
                    onClick={() => onOpenConversation(displayName, conv.id)}>
                    <div className="conversation-agent-card__info">
                      <div className="conversation-agent-card__title">{displayName}</div>
                      <div className="conversation-agent-card__meta">{conv.updatedAt || conv.createdAt || ''}</div>
                    </div>
                    <div className="conversation-agent-card__actions">
                      <button className="card-action-btn" onClick={(e) => handleDelete(e, conv.id)} aria-label="删除">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="conversation-list-footer">
        <div className="conversation-list-footer-avatar">U</div>
        <div className="conversation-list-footer-btn" role="button" tabIndex={0} aria-label="设置" onClick={onOpenSettings}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </div>
      </div>
    </div>
  );
};
