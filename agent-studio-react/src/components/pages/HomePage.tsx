import React, { useRef, useState, useEffect } from 'react';
import { ChatInput } from '../ui/ChatInput';
import { conversationApi, systemApi, assistantApi } from '../../services/api';
import { useChatStore } from '../../stores/chatStore';
import { useAppStore } from '../../stores/appStore';
import { zhName } from '../../data/assistantNames';

const API_BASE = import.meta.env.VITE_AION_CORE_URL || 'http://localhost:25808';

export const HomePage: React.FC = () => {
  const chipRowRef = useRef<HTMLDivElement>(null);
  const setConversations = useChatStore((s) => s.setConversations);
  const openConversation = useAppStore((s) => s.openConversation);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const [apiChips, setApiChips] = useState<{ label: string; id: string; avatarUrl?: string; avatarLetter: string }[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<string | null>(null);
  const agentId = useAppStore((s) => s.selectedAgentId);

  useEffect(() => {
    systemApi.info().then(() => setBackendOnline(true)).catch(() => setBackendOnline(false));
    conversationApi.list().then((res) => {
      if (res?.items) setConversations(res.items.map(c => ({
        id: c.id, title: c.title || c.name || '', name: c.name, createdAt: c.createdAt || '', updatedAt: c.updatedAt || '', messageCount: c.messageCount || 0,
      })));
    }).catch(() => {});
    assistantApi.list().then((list) => {
      if (list && list.length > 0) {
        setApiChips((list as any[]).map((a: any) => ({
          label: zhName(a.id, a.name),
          id: a.id,
          avatarUrl: typeof a.avatar === 'string' && a.avatar.startsWith('/') ? `${API_BASE}${a.avatar}` : undefined,
          avatarLetter: a.name.charAt(0).toUpperCase(),
        })));
      }
    }).catch(() => {});
  }, []);

  const handleSend = async (content: string) => {
    if (!content.trim()) return;
    useChatStore.getState().setPendingMessage(content);
    try {
      const conv = await conversationApi.create(content.slice(0, 30), agentId, {
        assistantId: selectedExpert || undefined,
      });
      if (conv) { openConversation(conv.title || conv.name || content.slice(0, 20), conv.id); return; }
    } catch { /* offline */ }
    openConversation(content.slice(0, 20));
  };

  const scrollChips = (dir: number) => { chipRowRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' }); };

  return (
    <div className="page active page-fade-in">
      <div className="chat-welcome">
        <div className="chat-welcome-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--cb-button-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="chat-welcome-title">Agent Studio</div>
        <div className="chat-welcome-desc">你的 AI 创作工作台，选择一个助手开始对话</div>
        {backendOnline === false && <div className="backend-offline-banner">⚠️ AionCore 后端未启动，使用离线模式</div>}
      </div>

      {/* 专家行 — 从 API 加载 */}
      {apiChips.length > 0 && (
        <div className="chat-assistant-chips">
          <button className="chat-chip-scroll-btn" onClick={() => scrollChips(-1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="chat-assistant-chips-scroll" ref={chipRowRef}>
            {apiChips.map((chip) => (
              <div key={chip.id} className={`chat-assistant-chip${selectedExpert === chip.id ? ' selected' : ''}`} onClick={() => setSelectedExpert(selectedExpert === chip.id ? null : chip.id)}>
                {chip.avatarUrl ? (
                  <img src={chip.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} />
                ) : (
                  <div className="chat-assistant-chip-avatar" style={{ background: 'var(--cb-button-primary)' }}>{chip.avatarLetter}</div>
                )}
                <span className="chat-assistant-chip-label">{chip.label}</span>
              </div>
            ))}
          </div>
          <button className="chat-chip-scroll-btn" onClick={() => scrollChips(1)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}

      <ChatInput onSend={handleSend} />
    </div>
  );
};
