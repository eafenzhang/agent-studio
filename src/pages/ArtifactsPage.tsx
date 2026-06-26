import { useTranslation } from 'react-i18next';
import { useArtifacts } from '../hooks/use-api';
import { useState, useMemo, useCallback } from 'react';
import { useUIStore } from '../stores/ui-store';
import { useQueryClient } from '@tanstack/react-query';

type ArtifactTab = 'results';

interface ArtifactItem {
  id: string;
  name?: string;
  type?: string;
  conversationId?: string;
  updatedAt?: string;
  createdAt?: string;
  size?: number;
  content?: string;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function getTypeColor(type: string): string {
  switch (type?.toUpperCase()) {
    case 'HTML':
    case 'JS':
    case 'TSX':
    case 'TS':
      return 'var(--cb-button-primary)';
    case 'PDF':
      return '#ef4444';
    case 'MD':
    case 'MARKDOWN':
      return '#22c55e';
    case 'JSON':
      return '#f59e0b';
    case 'CSV':
      return '#3b82f6';
    case 'SVG':
      return '#e67e22';
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'GIF':
      return '#ec4899';
    default:
      return 'var(--cb-text-secondary)';
  }
}

function getTypeIcon(type: string): string {
  const t = type?.toUpperCase() || '';
  if (t === 'HTML') return '</>';
  if (t === 'PDF') return 'PDF';
  if (t === 'MD' || t === 'MARKDOWN') return 'MD';
  if (t === 'JS') return 'JS';
  if (t === 'TS' || t === 'TSX') return 'TS';
  if (t === 'JSON') return '{ }';
  if (t === 'CSV') return 'CSV';
  if (t === 'SVG') return 'SVG';
  if (['PNG', 'JPG', 'JPEG', 'GIF', 'WEBP'].includes(t)) return 'IMG';
  return t.charAt(0) || '?';
}

function formatTime(raw: string): string {
  if (!raw) return '';
  if (/[天时分秒]/.test(raw)) return raw;
  try {
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  } catch {
    return raw;
  }
}

export default function ArtifactsPage() {
  const { t } = useTranslation();
  const addToast = useUIStore((s) => s.addToast);
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useArtifacts();

  const [activeTab] = useState<ArtifactTab>('results');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null);

  // Build artifact items from API response
  const items: ArtifactItem[] = useMemo(() => {
    if (!data?.items || data.items.length === 0) return [];
    return data.items.map((a) => ({
      id: a.id,
      name: a.name || '未命名产物',
      type: a.type || 'unknown',
      conversationId: a.conversationId,
      updatedAt: a.updatedAt,
      createdAt: a.createdAt,
      size: (a as any).size || 0,
      content: (a as any).content || undefined,
    }));
  }, [data]);

  // Derive unique type options from current items
  const typeOptions = useMemo(() => {
    const types = new Set(items.map((a) => (a.type || 'unknown').toUpperCase()));
    return ['all', ...Array.from(types)];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (typeFilter !== 'all') {
      result = result.filter((a) => (a.type || 'unknown').toUpperCase() === typeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (a) => (a.name || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchText, typeFilter]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['artifacts'] });
    addToast('刷新中...', 'info');
  }, [queryClient, addToast]);

  const handleViewArtifact = useCallback((item: ArtifactItem) => {
    setSelectedArtifact(item);
  }, []);

  // Close filter dropdown on outside click
  const closeFilter = () => setFilterOpen(false);

  const getFileCount = () => items.length;
  const getTotalSize = () => {
    const total = items.reduce((sum, a) => sum + (a.size || 0), 0);
    return total > 0 ? formatSize(total) : '';
  };

  return (
    <div className="page active" onClick={(e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.artifact-filter')) closeFilter();
    }}>
      <div className="artifacts-page-header">
        <div className="artifacts-page-title">{t('artifacts.title')}</div>
        <div className="artifacts-page-subtitle">管理 AI 生成的文件与产物</div>
      </div>

      {/* Stats bar */}
      {items.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '8px 20px',
          fontSize: 12,
          color: 'var(--cb-text-secondary)',
          borderBottom: '1px solid var(--cb-border-subtle)',
        }}>
          <span>共 <strong>{getFileCount()}</strong> 个文件</span>
          {getTotalSize() && <span>总计 <strong>{getTotalSize()}</strong></span>}
        </div>
      )}

      <div className="artifacts-tabs">
        <button className="artifact-tab active">
          任务成果
        </button>
      </div>

      <div className="artifacts-toolbar">
        <div className="artifact-filter" style={{ position: 'relative' }}>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--wb-color-text-primary)',
              fontSize: 13,
              padding: '4px 8px',
              borderRadius: 4,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setFilterOpen((prev) => !prev);
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {typeFilter === 'all' ? '全部类型' : typeFilter}
          </button>
          {filterOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 4,
                background: 'var(--wb-color-bg-primary)',
                border: '1px solid var(--cb-border)',
                borderRadius: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                zIndex: 20,
                minWidth: 120,
                padding: '4px 0',
              }}
            >
              {typeOptions.map((opt) => (
                <div
                  key={opt}
                  style={{
                    padding: '6px 14px',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: typeFilter === opt ? 'var(--cb-button-primary)' : 'var(--wb-color-text-primary)',
                    fontWeight: typeFilter === opt ? 600 : 400,
                    background: typeFilter === opt ? 'var(--cb-button-primary-bg)' : 'transparent',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTypeFilter(opt);
                    setFilterOpen(false);
                  }}
                >
                  {opt === 'all' ? '全部类型' : opt}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="artifact-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜索文件..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <button
            onClick={handleRefresh}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--cb-text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="刷新"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>
      </div>

      <div className="artifacts-table">
        {isLoading ? (
          <div style={{ padding: '20px' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 40,
                  background: 'var(--wb-todo-menu-bg-hover)',
                  borderRadius: 8,
                  marginBottom: 8,
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
            ))}
          </div>
        ) : isError ? (
          <div className="not-available" style={{ marginTop: 32 }}>
            <div className="not-available-icon" style={{ color: '#ef4444' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="not-available-title">加载失败</div>
            <div className="not-available-desc" style={{ marginTop: 8 }}>
              {error instanceof Error ? error.message : '无法连接到后端服务'}
            </div>
            <button
              className="chat-welcome-chip active"
              onClick={handleRefresh}
              style={{ marginTop: 12 }}
            >
              重试
            </button>
          </div>
        ) : filtered.length === 0 && searchText ? (
          <div className="not-available" style={{ marginTop: 32 }}>
            <div className="not-available-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="not-available-title">未找到匹配的文件</div>
            <div className="not-available-desc">尝试修改搜索条件或筛选类型</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="not-available" style={{ marginTop: 32 }}>
            <div className="not-available-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="not-available-title">暂无文件</div>
            <div className="not-available-desc">完成 AI 任务后将在此处看到生成的文件。</div>
          </div>
        ) : (
          <table className="artifact-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>更新时间</th>
                <th>大小</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="artifact-name" style={{ cursor: 'pointer' }} onClick={() => handleViewArtifact(a)}>
                      <div className="artifact-icon-sm" style={{ color: getTypeColor(a.type || '') }}>
                        {getTypeIcon(a.type || '')}
                      </div>
                      {a.name}
                    </div>
                  </td>
                  <td>
                    <span className="artifact-type">{a.type}</span>
                  </td>
                  <td>{formatTime(a.updatedAt || '')}</td>
                  <td>{a.size ? formatSize(a.size) : '-'}</td>
                  <td>
                    <button
                      className="msg-action-btn"
                      onClick={() => handleViewArtifact(a)}
                      style={{ fontSize: 11, padding: '2px 8px' }}
                    >
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Artifact Preview Dialog */}
      {selectedArtifact && (
        <div
          className="settings-overlay visible"
          style={{ zIndex: 210 }}
          onClick={() => setSelectedArtifact(null)}
        >
          <div
            className="settings-modal"
            style={{ width: 560, height: 'auto', maxHeight: '80vh', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">文件详情</span>
              <button className="settings-close-btn" onClick={() => setSelectedArtifact(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content" style={{ overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'var(--cb-button-primary-bg, rgba(108,77,255,0.08))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: getTypeColor(selectedArtifact.type || ''),
                      flexShrink: 0,
                    }}
                  >
                    {getTypeIcon(selectedArtifact.type || '')}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cb-text-primary)' }}>
                      {selectedArtifact.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)' }}>
                      {selectedArtifact.type} · {selectedArtifact.size ? formatSize(selectedArtifact.size) : '未知大小'}
                    </div>
                  </div>
                </div>

                {selectedArtifact.createdAt && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 2 }}>创建时间</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)' }}>
                      {new Date(selectedArtifact.createdAt).toLocaleString()}
                    </div>
                  </div>
                )}
                {selectedArtifact.conversationId && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 2 }}>所属会话</div>
                    <div style={{ fontSize: 13, color: 'var(--cb-text-secondary)', wordBreak: 'break-all' }}>
                      {selectedArtifact.conversationId}
                    </div>
                  </div>
                )}

                {selectedArtifact.content && (
                  <div>
                    <div className="setting-label" style={{ marginBottom: 4 }}>内容预览</div>
                    <pre
                      style={{
                        background: 'var(--cb-main-area-background)',
                        borderRadius: 6,
                        padding: 12,
                        fontSize: 12,
                        maxHeight: 300,
                        overflow: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: 'var(--cb-text-primary)',
                        border: '1px solid var(--cb-border-subtle)',
                      }}
                    >
                      {selectedArtifact.content.length > 2000
                        ? selectedArtifact.content.slice(0, 2000) + '\n... (内容过长，已截取前 2000 字符)'
                        : selectedArtifact.content}
                    </pre>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    className="chat-welcome-chip"
                    onClick={() => setSelectedArtifact(null)}
                  >
                    关闭
                  </button>
                  {selectedArtifact.content && (
                    <button
                      className="chat-welcome-chip active"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedArtifact.content || '')
                          .then(() => addToast('已复制内容', 'success'))
                          .catch(() => addToast('复制失败', 'error'));
                      }}
                    >
                      复制内容
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
