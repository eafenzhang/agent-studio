import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshIcon, EditIcon, DeleteIcon } from '../ui/Icons';
import type { Conversation } from '../../types/api';

interface ChatHeaderProps {
  conversation: Conversation | undefined | null;
  currentAgentName: string | null;
  onRename: (newName: string) => void;
  onReset: () => void;
  onDelete: () => void;
}

export default function ChatHeader({ conversation, currentAgentName, onRename, onReset, onDelete }: ChatHeaderProps) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation?.name || conversation?.title || '');
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming]);

  useEffect(() => {
    setRenameValue(conversation?.name || conversation?.title || '');
  }, [conversation?.name, conversation?.title]);

  const handleStartRename = () => {
    setRenaming(true);
    setRenameValue(conversation?.name || conversation?.title || '');
  };

  const handleRenameConfirm = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== (conversation?.name || conversation?.title)) {
      onRename(trimmed);
    }
    setRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameConfirm();
    if (e.key === 'Escape') setRenaming(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 20px',
        borderBottom: '1px solid var(--cb-border-subtle)',
        flexShrink: 0,
        minHeight: 40,
      }}
    >
      {renaming ? (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameConfirm}
          style={{
            fontSize: 13,
            fontWeight: 500,
            padding: '2px 8px',
            border: '1px solid var(--cb-button-primary)',
            borderRadius: 4,
            outline: 'none',
            background: 'var(--cb-surface-primary)',
            color: 'var(--cb-text-primary)',
            width: 240,
          }}
        />
      ) : (
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--cb-text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
          onClick={handleStartRename}
          title={t('settings.rename') || '点击重命名'}
        >
          {conversation?.name || conversation?.title || t('chat.title')}
          <EditIcon size={12} strokeWidth={1.5} style={{ opacity: 0.4 }} />

          {currentAgentName && (
            <span
              style={{
                fontSize: 11,
                padding: '1px 8px',
                borderRadius: 10,
                background: 'rgba(108,77,255,0.1)',
                color: 'var(--cb-button-primary)',
                fontWeight: 500,
                marginLeft: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ verticalAlign: 'middle', marginRight: 3 }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {currentAgentName}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4 }}>
        <button
          onClick={onReset}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            color: 'var(--wb-color-text-disabled)',
            borderRadius: 4,
          }}
          title={t('chat.reset') || '重置对话上下文'}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--cb-button-primary)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(108,77,255,0.06)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'var(--wb-color-text-disabled)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <RefreshIcon size={14} />
        </button>
        <button
          onClick={onDelete}
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
          <DeleteIcon size={14} />
        </button>
      </div>
    </div>
  );
}
