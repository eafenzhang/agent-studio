import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useConversations, useDeleteConversation } from '../../hooks/use-api';
import type { Conversation } from '../../types/api';
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { useTaskStepsStore } from '../../stores/task-store';

interface ConversationGroup {
  label: string;
  items: Conversation[];
}

/** Shape of the right-click context menu state. */
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  conversationId: string;
  conversationTitle: string;
}

interface ConversationListProps {
  search?: string;
  filterMode?: 'all' | 'tasks';
}

export default function ConversationList({ search = '', filterMode = 'all' }: ConversationListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useConversations(search);
  const deleteMutation = useDeleteConversation();

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    conversationId: '',
    conversationTitle: '',
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);

  // ---- Inline rename state ----
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const rawConversations: Conversation[] = (data as { items?: Conversation[] })?.items || [];
  const stepsByConv = useTaskStepsStore((s) => s.stepsByConv);
  const getProgress = useTaskStepsStore((s) => s.getProgress);

  const conversations = useMemo(() => {
    let filtered = rawConversations;

    // Apply task filter (search is now handled server-side via useConversations(search))
    if (filterMode === 'tasks') {
      filtered = filtered.filter((c) => {
        const steps = stepsByConv[c.id];
        return steps && steps.length > 0 && steps.some((s) => s.status !== 'done' && s.status !== 'error');
      });
    }

    return filtered;
  }, [rawConversations, search, filterMode, stepsByConv]);

  const formatTime = (ts?: string): string => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  };

  /** Group conversations by time period */
  const groups: ConversationGroup[] = useMemo(() => {
    if (conversations.length === 0) return [];

    const now = new Date();
    const today: Conversation[] = [];
    const thisWeek: Conversation[] = [];
    const earlier: Conversation[] = [];

    conversations.forEach((c) => {
      const d = c.updatedAt ? new Date(c.updatedAt) : new Date(0);
      const diffDays = (now.getTime() - d.getTime()) / 86400000;

      if (diffDays < 1) {
        today.push(c);
      } else if (diffDays < 7) {
        thisWeek.push(c);
      } else {
        earlier.push(c);
      }
    });

    const result: ConversationGroup[] = [];
    if (today.length > 0)
      result.push({ label: `${t('sidebar.today')} (${today.length})`, items: today });
    if (thisWeek.length > 0)
      result.push({
        label: `${t('sidebar.thisWeek')} (${thisWeek.length})`,
        items: thisWeek,
      });
    if (earlier.length > 0)
      result.push({
        label: `${t('sidebar.earlier')} (${earlier.length})`,
        items: earlier,
      });

    return result;
  }, [conversations, t]);

  const toggleSection = (label: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  // ===============================================================
  // Context Menu
  // ===============================================================

  /** Close the context menu on any outside click or Escape key. */
  useEffect(() => {
    if (!contextMenu.visible) return;

    const close = () => {
      setContextMenu((prev) => ({ ...prev, visible: false }));
    };

    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && contextMenuRef.current.contains(e.target as Node)) {
        return;
      }
      close();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleKey);
    };
  }, [contextMenu.visible]);

  /** Open the right-click context menu at the cursor position. */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, convId: string, title: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        conversationId: convId,
        conversationTitle: title,
      });
    },
    []
  );

  // ===============================================================
  // Delete
  // ===============================================================

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, convId: string) => {
    e.stopPropagation();
    e.preventDefault();

    if (deleteConfirmId === convId) {
      setDeleteConfirmId(null);
      try {
        await deleteMutation.mutateAsync(convId);
      } catch {
        // silently fail
      }
    } else {
      setDeleteConfirmId(convId);
      setTimeout(() => {
        setDeleteConfirmId((current) => (current === convId ? null : current));
      }, 3000);
    }
  };

  const handleContextDelete = async () => {
    try {
      await deleteMutation.mutateAsync(contextMenu.conversationId);
    } catch {
      // silently fail
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // ===============================================================
  // Rename
  // ===============================================================

  const startRenaming = useCallback((convId: string, currentTitle: string) => {
    setRenamingId(convId);
    setRenameValue(currentTitle);
    setContextMenu((prev) => ({ ...prev, visible: false }));
    // Focus input after render
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 50);
  }, []);

  const handleRenameConfirm = useCallback(async () => {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    try {
      await api.updateConversation(renamingId, { name: trimmed });
      queryClient.invalidateQueries({ queryKey: ['conversation', renamingId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch {
      // silently fail
    }
    setRenamingId(null);
  }, [renamingId, renameValue, queryClient]);

  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRenameConfirm();
      } else if (e.key === 'Escape') {
        setRenamingId(null);
      }
    },
    [handleRenameConfirm]
  );

  // Close rename if clicking elsewhere
  useEffect(() => {
    if (!renamingId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (renameInputRef.current && !renameInputRef.current.contains(e.target as Node)) {
        handleRenameConfirm();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [renamingId, handleRenameConfirm]);

  // ===============================================================
  // Render
  // ===============================================================

  return (
    <div className="conversation-list-content">
      {isLoading ? (
        <div style={{ padding: '8px 0' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: 40,
                background: 'var(--wb-todo-menu-bg-hover)',
                borderRadius: 8,
                marginBottom: 4,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div style={{ padding: '8px', fontSize: 12, color: 'var(--wb-color-text-disabled)' }}>
          {filterMode === 'tasks'
            ? '暂未有任务对话 — 与 AI 对话时收到计划步骤的任务会自动显示在此'
            : t('sidebar.noConversations')}
        </div>
      ) : (
        groups.map((group) => {
          const isCollapsed = collapsedSections[group.label] ?? false;
          return (
            <div className="conversation-section" key={group.label}>
              <div className="conversation-section-label" onClick={() => toggleSection(group.label)}>
                <span className="conversation-section-label-text">{group.label}</span>
                <svg
                  className={`conversation-section-chevron ${isCollapsed ? '' : 'conversation-section-chevron-expanded'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              {!isCollapsed && (
                <div className="conversation-section-content">
                  {group.items.map((c) => {
                    const title = c.name || c.title || '新对话';
                    const time = c.updatedAt ? formatTime(c.updatedAt) : '';
                    const isRenaming = renamingId === c.id;

                    return (
                      <div
                        key={c.id}
                        className="conversation-agent-card"
                        onClick={() => {
                          if (!isRenaming) navigate(`/chat/${c.id}`);
                        }}
                        onContextMenu={(e) => handleContextMenu(e, c.id, title)}
                        onDoubleClick={() => startRenaming(c.id, title)}
                      >
                        <div className="conversation-agent-card__info">
                          {isRenaming ? (
                            <input
                              ref={renameInputRef}
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={handleRenameKeyDown}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                padding: '2px 6px',
                                fontSize: 12,
                                border: '1px solid var(--cb-button-primary)',
                                borderRadius: 4,
                                outline: 'none',
                                background: 'var(--cb-surface-primary)',
                                color: 'var(--cb-text-primary)',
                              }}
                            />
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                              <div className="conversation-agent-card__title">{title}</div>
                              {/* Task progress indicator */}
                              {(() => {
                                const progress = getProgress(c.id);
                                if (progress.total === 0) return null;
                                const allDone = progress.done === progress.total;
                                return (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      padding: '1px 5px',
                                      borderRadius: 8,
                                      flexShrink: 0,
                                      background: allDone ? 'rgba(34,197,94,0.12)' : 'rgba(108,77,255,0.1)',
                                      color: allDone ? '#22c55e' : 'var(--cb-button-primary)',
                                      fontWeight: 500,
                                      whiteSpace: 'nowrap',
                                    }}
                                    title={allDone ? `${progress.done}/${progress.total} 已完成` : `任务进度 ${progress.done}/${progress.total}`}
                                  >
                                    {allDone ? '✓' : `${progress.done}/${progress.total}`}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                          {time && <div className="conversation-agent-card__meta">{time}</div>}
                        </div>
                        <div className="conversation-agent-card__actions">
                          <button
                            className={`card-action-btn ${deleteConfirmId === c.id ? 'card-action-btn-confirm' : ''}`}
                            onClick={(e) => handleDelete(e, c.id)}
                            aria-label={deleteConfirmId === c.id ? t('chat.confirm') : t('chat.delete')}
                            title={deleteConfirmId === c.id ? t('chat.confirm') : t('chat.delete')}
                          >
                            {deleteConfirmId === c.id ? (
                              <span style={{ color: '#ff4d4f', fontSize: 12, fontWeight: 600 }}>{t('chat.confirm')}</span>
                            ) : (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Right-click Context Menu */}
      {contextMenu.visible && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
            background: 'var(--cb-surface-primary, #fff)',
            border: '1px solid var(--cb-border-subtle, #e5e7eb)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            padding: '4px 0',
            minWidth: 140,
            fontSize: 13,
          }}
        >
          <div
            style={{
              padding: '4px 12px',
              fontSize: 11,
              color: 'var(--wb-color-text-disabled)',
              borderBottom: '1px solid var(--cb-border-subtle)',
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 180,
            }}
          >
            {contextMenu.conversationTitle}
          </div>
          <button
            onClick={() => startRenaming(contextMenu.conversationId, contextMenu.conversationTitle)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              fontSize: 12,
              color: 'var(--cb-text-primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            重命名
          </button>
          <button
            onClick={handleContextDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 12px',
              fontSize: 12,
              color: '#ff4d4f',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.06)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            删除
          </button>
        </div>
      )}
    </div>
  );
}
