import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';

interface MessageBubbleProps {
  id: string;
  content: string;
  isUser: boolean;
  timestamp?: string;
  isStreaming?: boolean;
  onCopy: () => void;
  onDelete: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
}

/** Configure marked with a custom renderer to highlight code blocks. */
const renderer = new marked.Renderer();

// Custom code renderer — wraps with a container that has a "copy" button target
renderer.code = (code: string, infostring: string | undefined) => {
  const language = infostring || '';
  let highlighted = code;
  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(code, { language }).value;
    } catch {
      highlighted = code;
    }
  }
  // Escape HTML for the copy-target attribute
  const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span class="code-block-lang">${language || 'text'}</span>
      <button class="code-block-copy-btn" data-code="${escapedCode}" onclick="(function(btn){var code=btn.getAttribute('data-code');navigator.clipboard.writeText(code).then(function(){var t=btn.textContent;btn.textContent='✓ 已复制';setTimeout(function(){btn.textContent=t;},2000);});})(this)">📋 复制</button>
    </div>
    <pre><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`;
};

// Custom table renderer for better styling
renderer.table = (header: string, body: string) => {
  return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

/**
 * Sanitize HTML with extended tags/attrs for rendered markdown.
 */
function sanitizeHtml(raw: string): string {
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['pre', 'code', 'span', 'div', 'button', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
    ADD_ATTR: ['class', 'style', 'data-code'],
  });
}

export default function MessageBubble({
  content,
  isUser,
  timestamp,
  isStreaming = false,
  onCopy,
  onDelete,
  onRegenerate,
  onEdit,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatTime = (ts?: string): string => {
    if (!ts) return '';
    const d = new Date(ts);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const formatDate = (ts?: string): string => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.getDate() === now.getDate()
      && d.getMonth() === now.getMonth()
      && d.getFullYear() === now.getFullYear();
    if (isToday) return formatTime(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${formatTime(ts)}`;
  };

  const renderedHtml = useMemo(() => {
    if (!content) return '';
    if (isUser) {
      return sanitizeHtml(content.replace(/\n/g, '<br/>'));
    }
    const raw = marked.parse(content) as string;
    return sanitizeHtml(raw);
  }, [content, isUser]);

  const handleCopyClick = useCallback(() => {
    onCopy();
    setShowActions(false);
  }, [onCopy]);

  const handleRegenerateClick = useCallback(() => {
    onRegenerate();
    setShowActions(false);
  }, [onRegenerate]);

  const handleEditClick = useCallback(() => {
    onEdit();
    setShowActions(false);
  }, [onEdit]);

  return (
    <div
      className={`msg-row ${isUser ? 'user' : 'assistant'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowDeleteConfirm(false);
      }}
    >
      <div className={`msg-avatar ${isUser ? 'human' : 'bot'}`}>
        {isUser ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="8" r="5" />
            <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        )}
      </div>

      <div style={{ position: 'relative', maxWidth: '100%', minWidth: 0, flex: 1 }}>
        {/* Timestamp */}
        {timestamp && (
          <div
            className="msg-meta"
            style={{
              fontSize: 11,
              color: 'var(--wb-color-text-disabled, #aaa)',
              marginBottom: 2,
              paddingLeft: isUser ? 0 : 0,
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {formatDate(timestamp)}
          </div>
        )}

        {/* Bubble */}
        <div className={`msg-bubble ${isUser ? 'user' : 'assistant'} ${isStreaming ? 'streaming' : ''}`}>
          <div
            className={isUser ? '' : 'markdown-body'}
            style={{ whiteSpace: isUser ? 'pre-wrap' : 'normal' }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
          {isStreaming && (
            <span className="streaming-cursor" />
          )}
        </div>

        {/* Hover action bar */}
        {showActions && !isStreaming && (
          <div className="msg-actions-bar">
            <button
              className="msg-action-btn"
              onClick={handleCopyClick}
              title={t('chat.copy')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{t('chat.copy')}</span>
            </button>
            {!isUser && (
              <button
                className="msg-action-btn"
                onClick={handleRegenerateClick}
                title={t('chat.regenerate')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>{t('chat.regenerate')}</span>
              </button>
            )}
            {showDeleteConfirm ? (
              <>
                <button
                  className="msg-action-btn msg-action-btn-danger"
                  onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                  title={t('chat.confirm')}
                >
                  <span>✓ {t('chat.delete')}</span>
                </button>
                <button
                  className="msg-action-btn"
                  onClick={() => setShowDeleteConfirm(false)}
                  title={t('chat.cancel')}
                >
                  <span>✕</span>
                </button>
              </>
            ) : (
              <button
                className="msg-action-btn msg-action-btn-danger-hover"
                onClick={() => setShowDeleteConfirm(true)}
                title={t('chat.delete')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>{t('chat.delete')}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
