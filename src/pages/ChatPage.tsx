/**
 * ChatPage — conversation detail view.
 *
 * Architecture (after refactor):
 * ┌─────────────────────────────────────────────────────────┐
 * │  ChatPage                                               │
 * │  ├─ useConversationStream(convId)  ← single source     │
 * │  │     .content, .isStreaming, .toolCalls, .taskSteps   │
 * │  │     .send(), .cancel(), .isConnected                 │
 * │  ├─ TaskProgressPanel ← reads hook.taskSteps           │
 * │  ├─ MessageList ← API history + streaming content      │
 * │  │     └─ MessageBubble + ToolCallCard                 │
 * │  └─ ChatInputPanel ← onSend → hook.send()             │
 * │                      onCancel → hook.cancel()          │
 * └─────────────────────────────────────────────────────────┘
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConversation, useMessages, useDeleteConversation } from '../hooks/use-api';
import { useChatStore } from '../stores/chat-store';
import { useUIStore } from '../stores/ui-store';
import { useConversationStream } from '../hooks/use-conversation-stream';
import type { TaskStep, ToolCall } from '../types/api';
import * as api from '../lib/api';
import MessageBubble from '../components/chat/MessageBubble';
import ChatInputPanel from '../components/chat/ChatInputPanel';
import ToolCallCard from '../components/chat/ToolCallCard';
import TaskProgressPanel from '../components/chat/TaskProgressPanel';
import ThinkingBlock from '../components/chat/ThinkingBlock';

// ===================================================================
// Types
// ===================================================================

interface LocalMessage {
  id: string;
  content: string;
  isUser: boolean;
  createdAt?: string;
  hasError?: boolean;
  toolCalls?: ToolCall[];
  taskSteps?: TaskStep[];
}

// ===================================================================
// Helpers
// ===================================================================

/** Extract plain text from a message content field of unknown shape. */
function extractContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const c = content as Record<string, unknown>;
    if (typeof c.content === 'string') return c.content;
    if (typeof c.text === 'string') return c.text;
    return JSON.stringify(content);
  }
  return String(content ?? '');
}

// ===================================================================
// Component
// ===================================================================

export default function ChatPage() {
  const { convId } = useParams<{ convId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ---- Data ----
  const { data: conversation, isLoading: convLoading } = useConversation(convId || '');
  const { data: messagesData, isLoading: msgLoading } = useMessages(convId || '');
  const deleteConversation = useDeleteConversation();

  // ---- Streaming hook (single source of truth) ----
  const {
    content: streamingContent,
    isStreaming,
    toolCalls: streamingToolCalls,
    taskSteps: streamingTaskSteps,
    thinkingBlocks,
    error: streamingError,
    isConnected,
    turnId,
    continuationCount,
    send,
    cancel,
  } = useConversationStream(convId || '');

  // ---- Local state ----
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ---- UI store ----
  const addToast = useUIStore((s) => s.addToast);
  const selectedModel = useUIStore((s) => s.selectedModel);
  const selectedMode = useUIStore((s) => s.selectedMode);
  const selectedExpert = useUIStore((s) => s.selectedExpert);
  const selectedTools = useUIStore((s) => s.selectedTools);

  // ===============================================================
  // Merge API history into localMessages (preserving streaming state)
  // ===============================================================

  useEffect(() => {
    if (!messagesData?.items) return;

    setLocalMessages((prev) => {
      const apiMessages: LocalMessage[] = messagesData.items.map((m) => {
        const prevMsg = prev.find((p) => p.id === m.id);
        return {
          id: m.id,
          content: extractContent(m.content),
          isUser: m.position !== 'left',
          createdAt: m.createdAt,
          toolCalls: (m.toolCalls as ToolCall[]) || prevMsg?.toolCalls || [],
          taskSteps: (m.taskSteps as TaskStep[]) || prevMsg?.taskSteps || [],
        };
      });

      const apiIds = new Set(apiMessages.map((m) => m.id));
      const localOnly = prev.filter((m) => !apiIds.has(m.id));

      return [...apiMessages, ...localOnly];
    });
  }, [messagesData]);

  // ===============================================================
  // Auto-scroll to bottom
  // ===============================================================

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, streamingContent, streamingToolCalls.length]);

  // ===============================================================
  // Handle stream_end: flush streaming content to localMessages
  // ===============================================================

  const prevStreamingRef = useRef({ content: '', isStreaming: false });

  useEffect(() => {
    // When streaming transitions from active → inactive, persist the
    // completed message if it has content.
    if (prevStreamingRef.current.isStreaming && !isStreaming && streamingContent) {
      setLocalMessages((prev) => {
        const msgId = `stream-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        // Check if we already have a message with this content (dedup)
        const lastAssistantMsg = [...prev].reverse().find((m) => !m.isUser);
        if (lastAssistantMsg && lastAssistantMsg.content === streamingContent) {
          // Already in the list (flushed from chatStore) — just update toolCalls/taskSteps
          return prev.map((m) =>
            m.id === lastAssistantMsg.id
              ? {
                  ...m,
                  toolCalls: streamingToolCalls.length > 0 ? streamingToolCalls : m.toolCalls,
                  taskSteps: streamingTaskSteps.length > 0 ? streamingTaskSteps : m.taskSteps,
                }
              : m,
          );
        }
        return [
          ...prev,
          {
            id: msgId,
            content: streamingContent,
            isUser: false,
            createdAt: new Date().toISOString(),
            toolCalls: streamingToolCalls,
            taskSteps: streamingTaskSteps,
          },
        ];
      });
    }
    prevStreamingRef.current = { content: streamingContent, isStreaming };
  }, [isStreaming, streamingContent, streamingToolCalls, streamingTaskSteps]);

  // ===============================================================
  // Handle send: call hook.send with current selections
  // ===============================================================

  const handleSend = useCallback(
    async (text: string) => {
      if (!convId) return;

      // Add user message immediately
      const userMsgId = `user-${Date.now()}`;
      setLocalMessages((prev) => [
        ...prev,
        { id: userMsgId, content: text, isUser: true, createdAt: new Date().toISOString() },
      ]);

      // Build tool IDs from selectedTools
      let inject_skills: string[] | undefined;
      let mcp_tools: string[] | undefined;
      if (selectedTools.length > 0) {
        // We need skills and mcpServers data to split. Read from useAPI hooks
        // via the services module directly.
        try {
          const skillListData = await api.getSkills().catch(() => []);
          const mcpListData = await api.getMcpServers().catch(() => []);
          const skillSet = new Set(skillListData.map((s) => s.id).filter(Boolean));
          const mcpSet = new Set(mcpListData.map((m) => m.id).filter(Boolean));
          const skillIds = selectedTools.filter((id) => skillSet.has(id));
          const mcpIds = selectedTools.filter((id) => mcpSet.has(id));
          if (skillIds.length > 0) inject_skills = skillIds;
          if (mcpIds.length > 0) mcp_tools = mcpIds;
        } catch {
          // Fall back to sending selectedTools as generic tools
        }
      }

      // If no data from API call, send as generic tools
      const options: Parameters<typeof send>[1] = {
        model: selectedModel || undefined,
        mode: selectedMode || undefined,
        assistant_id: selectedExpert || undefined,
        inject_skills,
        mcp_tools,
        tools: !inject_skills && !mcp_tools && selectedTools.length > 0 ? selectedTools : undefined,
      };

      await send(text, options);
    },
    [convId, send, selectedModel, selectedMode, selectedExpert, selectedTools],
  );

  // ===============================================================
  // Handle message actions
  // ===============================================================

  const handleCopyMessage = useCallback(
    (content: string) => {
      navigator.clipboard.writeText(content).then(() => {
        addToast(t('toast.copied'), 'success');
      });
    },
    [addToast, t],
  );

  const handleDeleteMessage = useCallback(
    async (msgId: string) => {
      // Check if this is a user-created local message or a server message
      const msg = localMessages.find((m) => m.id === msgId);
      if (!msg) return;

      if (msg.id.startsWith('user-') || msg.id.startsWith('stream-')) {
        // Local-only message — just remove from state
        setLocalMessages((prev) => prev.filter((m) => m.id !== msgId));
        addToast(t('toast.deleted'), 'success');
        return;
      }

      // Server message — mark locally removed; we don't have a per-message
      // delete API, so just hide it from the UI
      setLocalMessages((prev) => prev.filter((m) => m.id !== msgId));
      addToast(t('toast.deleted'), 'success');
    },
    [localMessages, addToast, t],
  );

  const handleRegenerateMessage = useCallback(() => {
    addToast('重新生成功能开发中', 'info');
  }, [addToast]);

  const handleEditMessage = useCallback(() => {
    addToast('编辑功能开发中', 'info');
  }, [addToast]);

  const handleDeleteConversation = useCallback(async () => {
    if (!convId) return;
    if (!window.confirm(t('chat.deleteConv'))) return;

    try {
      await deleteConversation.mutateAsync(convId);
      addToast(t('toast.deleted'), 'success');
      navigate('/');
    } catch {
      addToast('删除失败', 'error');
    }
  }, [convId, deleteConversation, addToast, t, navigate]);

  // ===============================================================
  // Derived state
  // ===============================================================

  const isLoading = convLoading || msgLoading;

  const displayedMessages = localMessages;

  const allTaskSteps = useMemo(() => {
    // Merge API task steps with streaming task steps
    const seen = new Set<string>();
    const steps: TaskStep[] = [];

    for (const msg of localMessages) {
      if (msg.taskSteps) {
        for (const step of msg.taskSteps) {
          if (!seen.has(step.id)) {
            seen.add(step.id);
            steps.push(step);
          }
        }
      }
    }

    // Append streaming steps (not yet in localMessages)
    for (const step of streamingTaskSteps) {
      if (!seen.has(step.id)) {
        seen.add(step.id);
        steps.push(step);
      }
    }

    return steps;
  }, [localMessages, streamingTaskSteps]);

  // ===============================================================
  // Render
  // ===============================================================

  return (
    <div className="conversation-detail active">
      {/* Task Progress Panel — only when streaming or persisted steps exist */}
      {(isStreaming || allTaskSteps.length > 0) && (
        <TaskProgressPanel convId={convId || ''} steps={allTaskSteps} isStreaming={isStreaming} />
      )}

      {/* Conversation header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px',
          borderBottom: '1px solid var(--cb-border-subtle)',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cb-text-primary)' }}>
          {conversation?.name || conversation?.title || t('chat.title')}
        </div>
        <button
          onClick={handleDeleteConversation}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            color: 'var(--wb-color-text-disabled)',
            borderRadius: 4,
          }}
          title={t('chat.delete')}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#ff4d4f';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--wb-color-text-disabled)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="conversation-messages">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="msg-row assistant">
              <div className="msg-avatar bot">AI</div>
              <div
                style={{
                  width: 200,
                  height: 20,
                  background: 'var(--cb-main-area-background)',
                  borderRadius: 8,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            </div>
            <div className="msg-row user" style={{ alignSelf: 'flex-end' }}>
              <div
                style={{
                  width: 120,
                  height: 20,
                  background: 'var(--cb-main-area-background)',
                  borderRadius: 8,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              <div className="msg-avatar human">U</div>
            </div>
          </div>
        ) : displayedMessages.length === 0 && !streamingContent && !isStreaming ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              padding: '40px 0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
              {t('chat.noMessages')}
            </div>
          </div>
        ) : (
          <>
            {displayedMessages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <MessageBubble
                  id={msg.id}
                  content={msg.content}
                  isUser={msg.isUser}
                  timestamp={msg.createdAt}
                  onCopy={() => handleCopyMessage(msg.content)}
                  onDelete={() => handleDeleteMessage(msg.id)}
                  onRegenerate={() => handleRegenerateMessage()}
                  onEdit={() => handleEditMessage()}
                  isStreaming={false}
                />
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 8,
                      paddingLeft: 38,
                    }}
                  >
                    {msg.toolCalls.map((tc) => (
                      <ToolCallCard key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <MessageBubble
                  id="streaming"
                  content={streamingContent || (streamingError ? streamingError : '')}
                  isUser={false}
                  isStreaming={!streamingError}
                  onCopy={() => handleCopyMessage(streamingContent)}
                  onDelete={() => {}}
                  onRegenerate={() => {}}
                  onEdit={() => {}}
                />

                {/* Agent Thinking Blocks (chain-of-thought) */}
                {thinkingBlocks.length > 0 && thinkingBlocks.map((block) => (
                  <ThinkingBlock key={block.id} block={block} />
                ))}

                {/* Turn continuation indicator */}
                {isStreaming && continuationCount > 0 && (
                  <div
                    style={{
                      paddingLeft: 38,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--cb-text-tertiary, #a0a0a0)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span>Agent 正在继续思考... (第 {continuationCount} 轮)</span>
                  </div>
                )}

                {streamingToolCalls.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      paddingLeft: 38,
                    }}
                  >
                    {streamingToolCalls.map((tc) => (
                      <ToolCallCard key={tc.id} toolCall={tc} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInputPanel
        onSend={handleSend}
        onCancel={cancel}
        isGenerating={isStreaming}
      />
    </div>
  );
}
