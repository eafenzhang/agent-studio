import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAppStore } from '../../stores/appStore';
import { ChatInput } from '../ui/ChatInput';
import { StreamingText } from '../ui/StreamingText';
import { TaskCard } from '../ui/TaskCard';
import { conversationApi } from '../../services/api';
import { useTaskStore } from '../../stores/taskStore';

// ── 消息类型映射 ──
const MSG_TYPES: Record<string, string> = {
  text: 'assistant', tips: 'system', tool_call: 'assistant',
  thinking: 'system', plan: 'assistant', agent_status: 'system',
  permission: 'system', tool_group: 'assistant',
};

// ── 将后端消息映射为前端 Message ──
function mapMessages(items: any[], cid: string) {
  return items.map((m: any) => {
    const c = m.content || {};
    const role = m.position === 'right' ? 'user' : (MSG_TYPES[m.type] || 'assistant');
    let content = typeof c === 'string' ? c : (c.content || '');
    // 特殊类型格式化
    if (m.type === 'tool_call') {
      content = `🔧 **工具调用**: ${c.name || c.function?.name || '未知'}\n\`\`\`json\n${JSON.stringify(c.args || c.arguments || {}, null, 2)}\n\`\`\``;
    } else if (m.type === 'thinking') {
      content = `💭 *${content || '思考中...'}*`;
    } else if (m.type === 'plan') {
      content = `📋 **计划**:\n${content}`;
    } else if (m.type === 'agent_status') {
      content = `⏳ ${content || '处理中...'}`;
    } else if (m.type === 'permission') {
      content = `🔐 **需要确认**: ${content || c.message || ''}`;
    } else if (m.type === 'tips' && c.code) {
      content = content || c.details || '系统提示';
    }
    return {
      id: m.id || m.msg_id || `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversationId: m.conversation_id || cid,
      role,
      type: m.type,
      content: content || JSON.stringify(c),
      time: m.created_at ? new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '',
      toolCalls: m.type === 'tool_call' ? [{
        id: m.id || '',
        name: c.name || c.function?.name || '',
        args: JSON.stringify(c.args || c.arguments || {}),
        status: 'completed' as const,
      }] : undefined,
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
  const tasks = useTaskStore((s) => s.tasks);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [convId, setConvId] = useState<string | null>(null);
  const sentRef = useRef(false);
  const mountedRef = useRef(true);

  // ── 组件挂载/卸载跟踪 ──
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

    // 先不清除 pendingMessage，成功后清除
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
      useChatStore.getState().setPendingMessage(null); // 成功后清除
      if (r && (r as any).msg_id) {
        pollForResponse(convId);
      } else {
        useChatStore.getState().setStreaming(false);
        useChatStore.getState().resetStreaming();
      }
    }).catch(() => {
      // 失败时保留 pendingMessage，重置 sentRef 允许重试
      sentRef.current = false;
      useChatStore.getState().setStreaming(false);
      useChatStore.getState().addMessage({
        id: `err-${Date.now()}`, conversationId: convId, role: 'system',
        content: '发送失败，请重试', time: '...',
      });
      useChatStore.getState().resetStreaming();
    });
  }, [convId]);

  // ── 轮询等待 AI 回复（使用 mapMessages 统一处理所有类型） ──
  const pollForResponse = useCallback(async (cid: string) => {
    for (let i = 0; i < 40; i++) {
      if (!mountedRef.current) return;
      await new Promise(r => setTimeout(r, 2000));
      if (!mountedRef.current) return;
      try {
        const result = await conversationApi.messages(cid);
        const items: any[] = result?.items || [];
        if (items.length === 0) continue;

        const current = useChatStore.getState().messages;
        const mapped = mapMessages(items, cid);
        let foundReply = false;

        for (const msg of mapped) {
          if (current.find(c => c.id === msg.id)) continue;
          if (msg.role === 'user') continue;
          if (!mountedRef.current) return;
          useChatStore.getState().addMessage(msg);
          foundReply = true;
          break;
        }
        if (foundReply) break;
      } catch { break; }
    }
    if (mountedRef.current) {
      setStreaming(false);
      resetStreaming();
    }
  }, []);

  // ── 获取真实 convId（没有则创建） ──
  const ensureConvId = useCallback(async () => {
    if (convId) return convId;
    const state = useAppStore.getState();
    const title = conversationTitle || '新对话';
    const created = await conversationApi.create(title, state.selectedAgentId, {
      mode: state.selectedMode,
      model: state.selectedModel || undefined,
    });
    if (created?.id) {
      setConvId(created.id);
      useAppStore.getState().openConversation(title, created.id);
      return created.id;
    }
    return null;
  }, [convId, conversationTitle]);

  // ── 用户发送消息 ──
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // 确保有真实 convId
    let cid = convId;
    if (!cid) {
      cid = await ensureConvId();
      if (!cid) {
        useChatStore.getState().addMessage({
          id: `err-${Date.now()}`, conversationId: '?', role: 'system',
          content: '创建会话失败，请重试', time: '...',
        });
        return;
      }
    }

    const skills = useAppStore.getState().selectedSkills;
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
  }, [convId, ensureConvId]);

  return (
    <div className="conversation-detail active">
      <div className="conversation-messages">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--cb-text-secondary)' }}>加载会话中...</div>
        ) : lastMsgs.length === 0 && !lastStreaming ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--wb-color-text-disabled)' }}>发送第一条消息开始对话</div>
        ) : (
          lastMsgs.map((msg) => (
            <React.Fragment key={msg.id}>
              <div className={`msg-row ${msg.role}`}>
                <div className={`msg-avatar ${msg.role === 'user' ? 'human' : msg.role === 'assistant' ? 'bot' : 'system'}`}>
                  {msg.role === 'user' ? 'U' : msg.role === 'assistant' ? 'A' : '!'}
                </div>
                <div>
                  <div className={`msg-bubble ${msg.role}`}><StreamingText content={msg.content} /></div>
                  <div className="msg-time" style={msg.role === 'user' ? { textAlign: 'right' } : undefined}>{msg.time}</div>
                  {/* AI 回复后显示任务创建入口 */}
                  {msg.role === 'assistant' && msg.content.length > 20 && (
                    <div style={{ marginTop: 4 }}>
                      <TaskSuggestButton content={msg.content} msgId={msg.id} convId={convId || ''} />
                    </div>
                  )}
                </div>
              </div>
              {/* 显示与消息关联的任务 */}
              {tasks.filter(t => t.conversationId === convId).map(task => (
                <div key={task.id} style={{ paddingLeft: 44, marginBottom: 8 }}>
                  <TaskCard task={task} />
                </div>
              ))}
            </React.Fragment>
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

// ── 任务建议按钮（在 AI 回复下方显示） ──
const TaskSuggestButton: React.FC<{ content: string; msgId: string; convId: string }> = ({ content, convId }) => {
  const [showForm, setShowForm] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const createTask = useTaskStore((s) => s.createTaskFromMessage);

  const suggestTask = () => {
    // 从 AI 回复中提取前 40 字作为任务标题
    const firstLine = content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 40);
    setTitle(firstLine || '新任务');
    setShowForm(true);
  };

  const confirmTask = () => {
    if (!title.trim()) return;
    createTask(title.trim(), content.slice(0, 200), convId);
    setShowForm(false);
  };

  return (
    <div>
      {!showForm ? (
        <button onClick={suggestTask}
          style={{
            padding: '2px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--cb-border)',
            background: 'transparent', cursor: 'pointer', color: 'var(--cb-text-secondary)',
          }}>
          + 创建任务
        </button>
      ) : (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <input value={title} onChange={e => setTitle(e.target.value)}
            style={{
              flex: 1, padding: '3px 6px', fontSize: 11, borderRadius: 4,
              border: '1px solid var(--cb-border)', outline: 'none',
            }}
            placeholder="任务名称" autoFocus />
          <button onClick={confirmTask}
            style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, border: 'none', background: 'var(--cb-button-primary)', color: '#fff', cursor: 'pointer' }}>
            确定
          </button>
          <button onClick={() => setShowForm(false)}
            style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--cb-border)', background: 'transparent', cursor: 'pointer' }}>
            取消
          </button>
        </div>
      )}
    </div>
  );
};
