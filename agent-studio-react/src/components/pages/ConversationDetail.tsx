import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAppStore } from '../../stores/appStore';
import { ChatInput } from '../ui/ChatInput';
import { StreamingText } from '../ui/StreamingText';
import { conversationApi } from '../../services/api';

// ── 将后端消息映射为前端 Message ──
function mapMessages(items: any[], cid: string) {
  return items.map((m: any) => {
    const c = m.content || {};
    return {
      id: m.id || m.msg_id || `m-${Date.now()}`,
      conversationId: m.conversation_id || cid,
      role: m.position === 'right' ? 'user' : (m.type === 'tips' ? 'system' : 'assistant'),
      content: typeof c === 'string' ? c : (c.content || JSON.stringify(c)),
      time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
    };
  }) as import('../../types').Message[];
}

export const ConversationDetail: React.FC = () => {
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const resetStreaming = useChatStore((s) => s.resetStreaming);
  const lastMsgs = useChatStore((s) => s.messages);
  const lastStreaming = useChatStore((s) => s.streamingContent);
  const conversationTitle = useAppStore((s) => s.conversationTitle);
  const conversationId = useAppStore((s) => s.conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);
  const sentRef = useRef(false);

  // ── 初始化：加载消息 ──
  useEffect(() => {
    if (!conversationTitle && !conversationId) return;

    // 切换会话时先清空旧消息
    useChatStore.getState().setMessages([]);
    sentRef.current = false;

    const init = async () => {
      if (conversationId) {
        setConvId(conversationId);
        // 加载历史消息
        try {
          const result = await conversationApi.messages(conversationId);
          const items: any[] = result?.items || [];
          if (items.length > 0) {
            useChatStore.getState().setMessages(mapMessages(items, conversationId));
          }
        } catch { /* 离线 */ }
        setLoading(false);
        return;
      }
      // 无 ID，按名称查找或新建
      setLoading(true);
      try {
        const list = await conversationApi.list();
        const existing = list?.items?.find((c: any) => c.name === conversationTitle || c.title === conversationTitle);
        if (existing) {
          setConvId(existing.id);
          const result = await conversationApi.messages(existing.id);
          const items: any[] = result?.items || [];
          if (items.length > 0) {
            useChatStore.getState().setMessages(mapMessages(items, existing.id));
          }
        } else {
          const created = await conversationApi.create(conversationTitle || '');
          if (created) setConvId(created.id);
        }
      } catch { /* 离线 */ }
      setLoading(false);
    };
    init();
  }, [conversationTitle, conversationId]);

  // ── 自动滚动到底部 ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lastMsgs, lastStreaming]);

  // ── 自动发送 pendingMessage（从首页创建会话时携带） ──
  useEffect(() => {
    if (!convId || sentRef.current) return;
    const msg = useChatStore.getState().pendingMessage;
    if (!msg) return;
    sentRef.current = true;
    useChatStore.getState().setPendingMessage(null);

    const store = useChatStore.getState();
    store.addMessage({
      id: `msg-${Date.now()}`, conversationId: convId, role: 'user', content: msg,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });
    store.setStreaming(true);
    store.resetStreaming();

    const skills = useAppStore.getState().selectedSkills;
    conversationApi.sendMessage(convId, msg, {
      skills: skills.length > 0 ? skills : undefined,
    }).then(r => {
      if (r && (r as any).msg_id) {
        pollForResponse(convId);
      } else {
        useChatStore.getState().setStreaming(false);
        useChatStore.getState().resetStreaming();
      }
    }).catch(() => {
      sentRef.current = false; // 失败时重置，允许重试
      useChatStore.getState().setStreaming(false);
      useChatStore.getState().addMessage({
        id: `err-${Date.now()}`, conversationId: convId, role: 'system',
        content: '发送失败，请重试', time: '...',
      });
      useChatStore.getState().resetStreaming();
    });
  }, [convId]);

  // ── 轮询等待 AI 回复 ──
  const pollForResponse = useCallback(async (cid: string) => {
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const result = await conversationApi.messages(cid);
        const items: any[] = result?.items || [];
        if (items.length === 0) continue;

        const current = useChatStore.getState().messages;
        let foundReply = false;

        for (const m of items) {
          const mid = m.id || m.msg_id;
          if (!mid || current.find(c => c.id === mid)) continue;
          const c = m.content || {};
          const text = typeof c === 'string' ? c : (c.content || '');
          if (m.position === 'right') continue;

          if (m.type === 'tips' && c.code) {
            useChatStore.getState().addMessage({
              id: mid, conversationId: cid, role: 'system',
              content: text || (c.details || 'AI 处理出错'),
              time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
            });
            foundReply = true;
            break;
          }
          if (m.type === 'text' && text) {
            useChatStore.getState().addMessage({
              id: mid, conversationId: cid, role: 'assistant',
              content: text,
              time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
            });
            foundReply = true;
            break;
          }
        }
        if (foundReply) break;
      } catch { break; }
    }
    setStreaming(false);
    resetStreaming();
  }, []);

  // ── 用户发送消息 ──
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const cid = convId || `conv-${Date.now()}`;
    if (!convId) setConvId(cid);

    const appState = useAppStore.getState();
    const skills = appState.selectedSkills;
    useChatStore.getState().addMessage({
      id: `msg-${Date.now()}`, conversationId: cid, role: 'user', content,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });
    setStreaming(true);
    resetStreaming();

    try {
      const r = await conversationApi.sendMessage(cid, content, {
        skills: skills.length > 0 ? skills : undefined,
      });
      if (r && (r as any).msg_id) {
        pollForResponse(cid);
      } else {
        setStreaming(false);
        resetStreaming();
      }
    } catch {
      setStreaming(false);
      useChatStore.getState().addMessage({
        id: `err-${Date.now()}`, conversationId: cid, role: 'system',
        content: '发送失败', time: '...',
      });
      resetStreaming();
    }
  }, [convId]);

  return (
    <div className="conversation-detail active">
      <div className="conversation-messages">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--cb-text-secondary)' }}>加载会话中...</div>
        ) : lastMsgs.length === 0 && !lastStreaming ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--wb-color-text-disabled)' }}>发送第一条消息开始对话</div>
        ) : (
          lastMsgs.map((msg) => (
            <div key={msg.id} className={`msg-row ${msg.role}`}>
              <div className={`msg-avatar ${msg.role === 'user' ? 'human' : msg.role === 'assistant' ? 'bot' : 'system'}`}>
                {msg.role === 'user' ? 'U' : msg.role === 'assistant' ? 'A' : '!'}
              </div>
              <div>
                <div className={`msg-bubble ${msg.role}`}><StreamingText content={msg.content} /></div>
                <div className="msg-time" style={msg.role === 'user' ? { textAlign: 'right' } : undefined}>{msg.time}</div>
              </div>
            </div>
          ))
        )}
        {isStreaming && lastStreaming && (
          <div className="msg-row assistant">
            <div className="msg-avatar bot">A</div>
            <div><div className="msg-bubble assistant"><StreamingText content={lastStreaming} isStreaming /></div></div>
          </div>
        )}
        {isStreaming && !lastStreaming && (
          <div className="msg-row assistant">
            <div className="msg-avatar bot">A</div>
            <div><div className="msg-bubble assistant"><span className="streaming-wait"><span className="streaming-dot">.</span><span className="streaming-dot">.</span><span className="streaming-dot">.</span></span></div></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ChatInput rows={1} fullDropdowns={false} onSend={handleSend} hideAgentSelector />
    </div>
  );
};
