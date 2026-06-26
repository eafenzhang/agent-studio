import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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

// ===================================================================
// Mermaid support (lazy loaded)
// ===================================================================

let mermaidApi: any = null;
async function loadMermaid(): Promise<boolean> {
  if (mermaidApi) return true;
  try {
    const mod = await import('mermaid');
    mermaidApi = mod.default || mod;
    mermaidApi.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
    return true;
  } catch {
    return false;
  }
}

// Track rendered diagrams to avoid re-rendering
const mermaidCache = new Map<string, string>();

async function renderMermaid(code: string, id: string): Promise<string | null> {
  const cached = mermaidCache.get(id);
  if (cached) return cached;

  const loaded = await loadMermaid();
  if (!loaded) return null;

  try {
    const { svg } = await mermaidApi.render(`mermaid-${id}`, code);
    mermaidCache.set(id, svg);
    return svg;
  } catch {
    return null;
  }
}

// ===================================================================
// Custom Marked Renderer
// ===================================================================

const renderer = new marked.Renderer();

// Track mermaid blocks during rendering for post-processing
let mermaidBlocks: Array<{ code: string; index: number }> = [];

renderer.code = (code: string, infostring: string | undefined) => {
  const language = (infostring || '').toLowerCase();

  if (language === 'mermaid') {
    const idx = mermaidBlocks.length;
    mermaidBlocks.push({ code, index: idx });
    return `<div class="mermaid-container" data-mermaid-idx="${idx}" style="text-align:center;padding:12px;background:var(--cb-main-area-background);border-radius:8px;margin:8px 0;min-height:60px;display:flex;align-items:center;justify-content:center;">
      <div class="mermaid-loading" style="font-size:12px;color:var(--cb-text-secondary)">🔮 渲染图表中...</div>
    </div>`;
  }

  // Check if this is an HTML document (full <html> or <!DOCTYPE)
  const trimmed = code.trim();
  const isHtmlDoc = /^<!DOCTYPE\s+html|^<html/i.test(trimmed);

  let highlighted = code;
  if (language && hljs.getLanguage(language)) {
    try {
      highlighted = hljs.highlight(code, { language }).value;
    } catch {
      highlighted = code;
    }
  }

  const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const langLabel = language || (isHtmlDoc ? 'html' : 'text');
  const lineCount = code.split('\n').length;
  const isLong = lineCount > 30;

  return `<div class="code-block-wrapper" data-lines="${lineCount}">
    <div class="code-block-header">
      <span class="code-block-lang">${langLabel}</span>
      <div class="code-block-header-actions">
        ${isHtmlDoc ? `<button class="code-block-preview-btn" onclick="(function(btn){var preview=btn.parentElement.parentElement.nextElementSibling;if(preview&&preview.classList.contains('code-block-preview')){var active=preview.style.display!=='none';preview.style.display=active?'none':'block';btn.textContent=active?'👁️ 预览':'✕ 关闭预览';var codeBlock=preview.parentElement.querySelector('pre');if(codeBlock)codeBlock.style.display=active?'block':'none';}}) (this)">👁️ 预览</button>` : ''}
        <button class="code-block-copy-btn" data-code="${escapedCode}" onclick="(function(btn){var code=btn.getAttribute('data-code');navigator.clipboard.writeText(code).then(function(){var t=btn.textContent;btn.textContent='✓ 已复制';setTimeout(function(){btn.textContent=t;},2000);});})(this)">📋 复制</button>
        ${isLong ? `<button class="code-block-expand-btn" onclick="(function(btn){var pre=btn.closest('.code-block-wrapper').querySelector('pre');if(pre){var collapsed=pre.classList.toggle('code-collapsed');btn.textContent=collapsed?'⬇ 展开全部':'⬆ 收起';}}) (this)">⬇ 展开全部</button>` : ''}
      </div>
    </div>
    <pre${isLong ? ' class="code-collapsed"' : ''}><code class="hljs language-${langLabel}">${highlighted}</code></pre>
    ${isHtmlDoc ? `<div class="code-block-preview" style="display:none;border-top:1px solid var(--cb-border-subtle);padding:12px;"><iframe sandbox="allow-scripts" style="width:100%;height:300px;border:none;border-radius:4px;background:#fff;" srcdoc="${escapedCode.replace(/"/g, '&quot;')}"></iframe></div>` : ''}
  </div>`;
};

renderer.table = (header: string, body: string) => {
  return `<div class="table-wrapper" style="overflow-x:auto;margin:8px 0;"><table style="border-collapse:collapse;width:100%;font-size:13px;"><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
};

renderer.image = (href: string, title: string | null, text: string) => {
  const titleAttr = title ? ` title="${title}"` : '';
  return `<div class="msg-image-wrapper" style="margin:8px 0;cursor:zoom-in;display:inline-block;border-radius:8px;overflow:hidden;border:1px solid var(--cb-border-subtle);max-width:100%;">
    <img src="${href}" alt="${text}"${titleAttr} loading="lazy" style="max-width:100%;max-height:400px;display:block;object-fit:contain;" onclick="(function(img){var overlay=document.createElement('div');overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:zoom-out;';var cloned=img.cloneNode();cloned.style.cssText='max-width:90%;max-height:90%;object-fit:contain;border-radius:4px;';overlay.appendChild(cloned);overlay.onclick=function(){document.body.removeChild(overlay);};document.body.appendChild(overlay);})(this)"/>
  </div>`;
};

renderer.listitem = (text: string, task: boolean, checked: boolean) => {
  if (task) {
    const checkbox = checked
      ? '<input type="checkbox" checked disabled style="margin-right:6px;accent-color:var(--cb-button-primary);" />'
      : '<input type="checkbox" disabled style="margin-right:6px;" />';
    return `<li style="list-style:none;margin-left:-20px;">${checkbox} ${text}</li>`;
  }
  return `<li>${text}</li>`;
};

marked.setOptions({
  gfm: true,
  breaks: true,
  renderer,
});

// ===================================================================
// DOMPurify
// ===================================================================

function sanitizeHtml(raw: string): string {
  return DOMPurify.sanitize(raw, {
    ADD_TAGS: ['pre', 'code', 'span', 'div', 'button', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'iframe', 'input'],
    ADD_ATTR: ['class', 'style', 'data-code', 'data-lines', 'data-mermaid-idx', 'sandbox', 'srcdoc', 'loading', 'checked', 'type', 'disabled'],
  });
}

// ===================================================================
// Mermaid Renderer Component
// ===================================================================

function MermaidRenderer({ code, idx }: { code: string; idx: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = `msg-mermaid-${Date.now()}-${idx}`;
    renderMermaid(code, id).then((result) => {
      if (result) setSvg(result);
      else setError(true);
    }).catch(() => setError(true));
  }, [code, idx]);

  if (error) {
    // Fallback: render as regular code block
    const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return (
      <div className="code-block-wrapper" style={{ margin: '8px 0' }}>
        <div className="code-block-header">
          <span className="code-block-lang">mermaid</span>
          <button
            className="code-block-copy-btn"
            onClick={() => navigator.clipboard.writeText(code)}
            style={{ fontSize: 12, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--cb-border)', cursor: 'pointer' }}
          >
            📋 复制
          </button>
        </div>
        <pre><code className="hljs">{escaped}</code></pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 20,
        color: 'var(--cb-text-secondary)',
        fontSize: 13,
        background: 'var(--cb-main-area-background)',
        borderRadius: 8,
        margin: '8px 0',
      }}>
        渲染图表中...
      </div>
    );
  }

  return <div dangerouslySetInnerHTML={{ __html: svg }} style={{ margin: '8px 0' }} />;
}

// ===================================================================
// Image Lightbox Component
// ===================================================================

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
      }}
    >
      <img src={src} alt="" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: 4 }} />
    </div>
  );
}

// ===================================================================
// Post-process rendered HTML to wire up Mermaid and lightboxes
// ===================================================================

function PostProcessedHTML({ html, content }: { html: string; content: string }) {
  // Extract mermaid blocks
  const mermaidBlocksLocal = useMemo(() => {
    const blocks: Array<{ code: string; idx: number }> = [];
    const regex = /```mermaid\s*\n([\s\S]*?)```/g;
    let match;
    let idx = 0;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ code: match[1].trim(), idx: idx++ });
    }
    return blocks;
  }, [content]);

  if (mermaidBlocksLocal.length === 0) {
    return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // Replace mermaid placeholders with React components
  const parts = html.split(/(<div class="mermaid-container"[^>]*><\/div>)/g);
  let mermaidIdx = 0;

  return (
    <div className="markdown-body">
      {parts.map((part, i) => {
        if (part.includes('mermaid-container')) {
          const block = mermaidBlocksLocal[mermaidIdx];
          mermaidIdx++;
          if (block) {
            return <MermaidRenderer key={`mermaid-${i}`} code={block.code} idx={block.idx} />;
          }
          return <div key={`mermaid-${i}`} />;
        }
        return <span key={`html-${i}`} dangerouslySetInnerHTML={{ __html: part }} />;
      })}
    </div>
  );
}

// ===================================================================
// Main Component
// ===================================================================

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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const path = useRef<string | null>(null);

  // Reset mermaid block tracking on each render
  useEffect(() => {
    mermaidBlocks = [];
  }, [content]);

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
    mermaidBlocks = [];
    if (isUser) {
      return sanitizeHtml(content.replace(/\n/g, '<br/>'));
    }
    const raw = marked.parse(content) as string;
    return sanitizeHtml(raw);
  }, [content, isUser]);

  const showMermaid = useMemo(() => {
    if (isUser) return false;
    return /```mermaid/i.test(content);
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

  // Lightbox event listener (for images clicked inside the bubble)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && target.closest('.msg-bubble')) {
        const src = (target as HTMLImageElement).src;
        if (src && !src.startsWith('data:')) {
          e.stopPropagation();
          setLightboxSrc(src);
        }
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

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
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {formatDate(timestamp)}
          </div>
        )}

        {/* Bubble */}
        <div className={`msg-bubble ${isUser ? 'user' : 'assistant'} ${isStreaming ? 'streaming' : ''}`}>
          {isUser ? (
            <div
              style={{ whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : showMermaid ? (
            <PostProcessedHTML html={renderedHtml} content={content} />
          ) : (
            <div
              className="markdown-body"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          )}
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

      {/* Image Lightbox */}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
