import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../stores/ui-store';
import * as api from '../lib/api';

// ===================================================================
// Types
// ===================================================================

interface FileEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  modified_at?: string;
}

interface FileEditorState {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
}

// ===================================================================
// Helpers
// ===================================================================

function getFileIcon(name: string, isDir: boolean): JSX.Element {
  if (isDir) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  const ext = name.split('.').pop()?.toLowerCase();
  const color = ext === 'js' || ext === 'ts' || ext === 'tsx' || ext === 'jsx' ? '#3b82f6'
    : ext === 'md' || ext === 'txt' ? '#22c55e'
    : ext === 'json' ? '#f59e0b'
    : ext === 'css' || ext === 'html' ? '#e67e22'
    : ext === 'svg' || ext === 'png' || ext === 'jpg' ? '#ec4899'
    : 'var(--cb-text-secondary)';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// ===================================================================
// Component
// ===================================================================

export default function FilesPage() {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);

  // ---- State ----
  const [currentDir, setCurrentDir] = useState('');
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [editor, setEditor] = useState<FileEditorState | null>(null);
  const [saving, setSaving] = useState(false);

  // Breadcrumb path
  const breadcrumbs = currentDir ? currentDir.split('/').filter(Boolean) : [];

  // ===============================================================
  // Load directory contents
  // ===============================================================

  const loadDir = useCallback(async (dir: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listWorkspaceFiles({ root: dir });
      const files = (result as any).files as Array<{ name?: string; path?: string; is_dir?: boolean; size?: number; modified_at?: string }> || [];
      setEntries(files.map((f) => ({
        name: f.name || '',
        path: f.path || '',
        is_dir: f.is_dir ?? false,
        size: f.size,
        modified_at: f.modified_at,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDir(currentDir);
  }, [currentDir, loadDir]);

  // ===============================================================
  // Navigation
  // ===============================================================

  const handleNavigate = useCallback((dir: string) => {
    setEditor(null);
    setCurrentDir(dir);
  }, []);

  const handleOpenFile = useCallback(async (file: FileEntry) => {
    if (file.is_dir) {
      handleNavigate(file.path);
      return;
    }
    try {
      const result = await api.readFile({ path: file.path });
      const content = (result as any).content || (result as any).data || '';
      setEditor({
        path: file.path,
        name: file.name,
        content,
        originalContent: content,
        isDirty: false,
      });
    } catch (err) {
      addToast('无法读取文件: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  }, [addToast, handleNavigate]);

  const handleSaveFile = useCallback(async () => {
    if (!editor || !editor.isDirty) return;
    setSaving(true);
    try {
      await api.writeFile({ path: editor.path, content: editor.content });
      setEditor((prev) => prev ? { ...prev, originalContent: editor.content, isDirty: false } : null);
      addToast('文件已保存', 'success');
    } catch (err) {
      addToast('保存失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    } finally {
      setSaving(false);
    }
  }, [editor, addToast]);

  // ===============================================================
  // Render
  // ===============================================================

  return (
    <div className="page active" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div className="artifacts-page-header">
        <div className="artifacts-page-title">文件浏览器</div>
        <div className="artifacts-page-subtitle">浏览和管理工作区文件</div>
      </div>

      {/* Breadcrumbs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '8px 20px',
        borderBottom: '1px solid var(--cb-border-subtle)',
        fontSize: 13,
        flexShrink: 0,
      }}>
        <button
          onClick={() => handleNavigate('')}
          style={{
            padding: '2px 8px',
            borderRadius: 4,
            color: 'var(--cb-button-primary)',
            fontWeight: breadcrumbs.length === 0 ? 600 : 400,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          工作区根目录
        </button>
        {breadcrumbs.map((part, idx) => (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--wb-color-text-disabled)" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <button
              onClick={() => handleNavigate(breadcrumbs.slice(0, idx + 1).join('/'))}
              style={{
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: idx === breadcrumbs.length - 1 ? 600 : 400,
                color: idx === breadcrumbs.length - 1 ? 'var(--cb-text-primary)' : 'var(--cb-text-secondary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* File list */}
        <div style={{
          flex: editor ? '0 0 300px' : 1,
          overflowY: 'auto',
          borderRight: editor ? '1px solid var(--cb-border-subtle)' : 'none',
        }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 36,
                    background: 'var(--wb-todo-menu-bg-hover)',
                    borderRadius: 6,
                    marginBottom: 4,
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="not-available" style={{ marginTop: 32 }}>
              <div className="not-available-icon" style={{ color: '#ef4444' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="not-available-title">加载失败</div>
              <div className="not-available-desc">{error}</div>
              <button className="chat-welcome-chip active" onClick={() => loadDir(currentDir)} style={{ marginTop: 12 }}>
                重试
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="not-available" style={{ marginTop: 32 }}>
              <div className="not-available-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="not-available-title">空目录</div>
              <div className="not-available-desc">此目录中没有文件</div>
            </div>
          ) : (
            <div style={{ padding: 8 }}>
              {entries.map((entry) => (
                <div
                  key={entry.path}
                  onClick={() => handleOpenFile(entry)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: editor?.path === entry.path ? 'var(--wb-todo-menu-bg-hover)' : 'transparent',
                  }}
                  onMouseEnter={(e) => { if (editor?.path !== entry.path) (e.currentTarget as HTMLElement).style.background = 'var(--wb-todo-menu-bg-hover)'; }}
                  onMouseLeave={(e) => { if (editor?.path !== entry.path) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {getFileIcon(entry.name, entry.is_dir)}
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    color: 'var(--cb-text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {entry.name}
                  </span>
                  {entry.size !== undefined && (
                    <span style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', flexShrink: 0 }}>
                      {formatFileSize(entry.size)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File editor */}
        {editor && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Editor header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 16px',
              borderBottom: '1px solid var(--cb-border-subtle)',
              flexShrink: 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--cb-text-primary)' }}>
                {editor.name}
                {editor.isDirty && <span style={{ color: '#f59e0b', marginLeft: 4 }}>(未保存)</span>}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="chat-welcome-chip active"
                  onClick={handleSaveFile}
                  disabled={!editor.isDirty || saving}
                  style={{
                    padding: '3px 12px',
                    fontSize: 12,
                    opacity: !editor.isDirty ? 0.4 : 1,
                    cursor: !editor.isDirty ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  className="chat-welcome-chip"
                  onClick={() => setEditor(null)}
                  style={{ padding: '3px 12px', fontSize: 12 }}
                >
                  关闭
                </button>
              </div>
            </div>

            {/* Editor */}
            <textarea
              value={editor.content}
              onChange={(e) => setEditor((prev) => prev ? { ...prev, content: e.target.value, isDirty: e.target.value !== prev.originalContent } : null)}
              style={{
                flex: 1,
                width: '100%',
                padding: 16,
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: 13,
                fontFamily: 'var(--cb-font-mono, SF Mono, Menlo, monospace)',
                lineHeight: 1.6,
                color: 'var(--cb-text-primary)',
                background: 'var(--cb-bg-primary, #fff)',
                tabSize: 2,
              }}
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}
