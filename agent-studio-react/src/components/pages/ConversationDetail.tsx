import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAppStore } from '../../stores/appStore';
import { ChatInput } from '../ui/ChatInput';
import { StreamingText } from '../ui/StreamingText';
import { conversationApi } from '../../services/api';

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

  // 查找或创建会话
  useEffect(() => {
    if (!conversationTitle) return;
    const init = async () => {
      setLoading(true);
      try {
        // 优先使用传递过来的 conversationId
        if (conversationId) {
          setConvId(conversationId);
          const result = await conversationApi.messages(conversationId);
          const items: any[] = result?.items || [];
          if (items.length > 0) {
            useChatStore.getState().setMessages(items.map((m: any) => {
              const c = m.content || {};
              return {
                id: m.id || m.msg_id || `m-${Date.now()}`,
                conversationId: m.conversation_id || conversationId,
                role: m.position === 'right' ? 'user' : (m.type === 'tips' ? 'system' : 'assistant'),
                content: typeof c === 'string' ? c : (c.content || JSON.stringify(c)),
                time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
              };
            }));
          }
        } else {
          // 无 ID 时按名称查找
          const list = await conversationApi.list();
          const existing = list?.items?.find((c: any) => c.name === conversationTitle || c.title === conversationTitle);
          if (existing) {
            setConvId(existing.id);
          } else {
            const created = await conversationApi.create(conversationTitle);
            if (created) setConvId(created.id);
          }
        }
      } catch { /* offline */ }
      setLoading(false);
    };
    init();
  }, [conversationTitle]);

  // 自动发送 pendingMessage（从首页创建会话时携带）
  useEffect(() => {
    if (!convId || sentRef.current) return;
    const msg = useChatStore.getState().pendingMessage;
    if (!msg) return;
    sentRef.current = true;
    useChatStore.getState().setPendingMessage(null);
    // 延迟一下等会话完全就绪
    const t = setTimeout(() => {
      const store = useChatStore.getState();
      store.addMessage({
        id: `msg-${Date.now()}`, conversationId: convId, role: 'user', content: msg,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      });
      store.setStreaming(true);
      store.resetStreaming();
      conversationApi.sendMessage(convId, msg).then(r => {
        if (r && (r as any).msg_id) pollForResponse(convId);
        else { store.setStreaming(false); store.resetStreaming(); }
      }).catch(() => { store.setStreaming(false); store.resetStreaming(); });
    }, 500);
    return () => clearTimeout(t);
  }, [convId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lastMsgs, lastStreaming]);

  // 轮询等待 AI 回复
  const pollForResponse = useCallback(async (cid: string) => {
    console.log('[poll] started', cid);
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const result = await conversationApi.messages(cid);
        const items: any[] = result?.items || [];
        console.log(`[poll] ${i}: ${items.length} items`, items.map((m:any)=>`${m.type}/${m.position}/${m.id||m.msg_id}`));
        if (items.length === 0) continue;

        const current = useChatStore.getState().messages;
        console.log(`[poll] current msgs: ${current.length}`, current.map(m=>m.id));
        let foundReply = false;

        for (const m of items) {
          const mid = m.id || m.msg_id;
          if (!mid || current.find(c => c.id === mid)) {
            console.log(`[poll] skip ${mid} (already in current or no id)`);
            continue;
          }
          const c = m.content || {};
          const text = typeof c === 'string' ? c : (c.content || '');

          if (m.position === 'right') { console.log(`[poll] skip user msg ${mid}`); continue; }

          if (m.type === 'tips' && c.code) {
            console.log(`[poll] found error tips: ${text}`);
            useChatStore.getState().addMessage({
              id: mid, conversationId: cid, role: 'system',
              content: text || (c.details || 'AI 处理出错'),
              time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
            });
            foundReply = true;
            break;
          }

          if (m.type === 'text' && m.position !== 'right' && text) {
            console.log(`[poll] FOUND AI REPLY: ${text.slice(0,50)}`);
            useChatStore.getState().addMessage({
              id: mid, conversationId: cid, role: 'assistant',
              content: text,
              time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
            });
            foundReply = true;
            break;
          }
          console.log(`[poll] unhandled msg type: ${m.type} pos=${m.position}`);
        }
        if (foundReply) { console.log('[poll] done, found reply'); break; }
      } catch (e) { console.log(`[poll] error:`, e); break; }
    }
    console.log('[poll] finished, stopping streaming');
    setStreaming(false);
    resetStreaming();
  }, []);

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim()) return;
    const cid = convId || `conv-${Date.now()}`;
    if (!convId) setConvId(cid);

    useChatStore.getState().addMessage({
      id: `msg-${Date.now()}`, conversationId: cid, role: 'user', content,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });
    setStreaming(true);
    resetStreaming();

    try {
      const r = await conversationApi.sendMessage(cid, content);
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
        ) : lastMsgs.length === 0 ? (
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
      <ChatInput rows={1} fullDropdowns={false} onSend={handleSend} />
    </div>
  );
};
