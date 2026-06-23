import { useTranslation } from 'react-i18next';
import { useArtifacts } from '../hooks/use-api';
import { useState, useMemo } from 'react';

type ArtifactTab = 'results' | 'cloud';

interface ArtifactItem {
  id: string;
  name?: string;
  type?: string;
  updatedAt?: string;
  size?: number;
  updatedBy?: string;
}

const demoArtifacts: ArtifactItem[] = [
  { id: '1', name: '品牌官网首页设计稿', type: 'HTML', updatedBy: 'Agent', updatedAt: '3 天前', size: 48 * 1024 },
  { id: '2', name: '产品定价对比页', type: 'HTML', updatedBy: 'Agent', updatedAt: '5 天前', size: 32 * 1024 },
  { id: '3', name: '数据仪表盘 v2 报告', type: 'PDF', updatedBy: 'Agent', updatedAt: '7 天前', size: 1228 },
  { id: '4', name: '设计系统规范文档', type: 'MD', updatedBy: 'Agent', updatedAt: '10 天前', size: 24 * 1024 },
  { id: '5', name: '移动端交互原型', type: 'HTML', updatedBy: 'Agent', updatedAt: '12 天前', size: 56 * 1024 },
];

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function getTypeColor(type: string): string {
  if (type === 'HTML' || type === 'JS' || type === 'TSX') return 'var(--cb-button-primary)';
  return 'inherit';
}

function getTypeIcon(type: string): string {
  if (type === 'HTML') return '</>';
  return type.charAt(0);
}

function formatTime(raw: string): string {
  if (!raw) return '';
  // If already a relative string like "3 天前", return as-is
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
  const { data, isLoading } = useArtifacts();
  const [activeTab, setActiveTab] = useState<ArtifactTab>('results');
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const items: ArtifactItem[] = useMemo(() => {
    const raw = data?.items || [];
    if (raw.length === 0) return demoArtifacts;
    return raw.map((a: ArtifactItem) => ({
      id: a.id,
      name: a.name || '未命名产物',
      type: a.type || 'unknown',
      updatedBy: a.updatedBy || 'Agent',
      updatedAt: a.updatedAt || '',
      size: a.size || 0,
    }));
  }, [data]);

  // Derive unique type options from current items
  const typeOptions = useMemo(() => {
    const types = new Set(items.map((a) => a.type || 'unknown'));
    return ['all', ...Array.from(types)];
  }, [items]);

  const filtered = useMemo(() => {
    let result = items;
    if (typeFilter !== 'all') {
      result = result.filter((a) => (a.type || 'unknown') === typeFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (a) => (a.name || '').toLowerCase().includes(q) || (a.type || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, searchText, typeFilter]);

  // Close filter dropdown on outside click
  const closeFilter = () => setFilterOpen(false);

  return (
    <div className="page active" onClick={(e) => {
      // Close filter if clicking outside the filter component
      const target = e.target as HTMLElement;
      if (!target.closest('.artifact-filter')) {
        closeFilter();
      }
    }}>
      <div className="artifacts-page-header">
        <div className="artifacts-page-title">{t('artifacts.title')}</div>
        <div className="artifacts-page-subtitle">管理 AI 生成的文件与产物</div>
      </div>

      <div className="artifacts-tabs">
        <button
          className={`artifact-tab ${activeTab === 'results' ? 'active' : ''}`}
          onClick={() => setActiveTab('results')}
        >
          任务成果
        </button>
        <button
          className={`artifact-tab ${activeTab === 'cloud' ? 'active' : ''}`}
          onClick={() => setActiveTab('cloud')}
        >
          云端网盘
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
      </div>

      <div className="artifacts-table">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
            {t('common.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="not-available">
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
                <th>更新人</th>
                <th>更新时间</th>
                <th>大小</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className="artifact-name">
                      <div className="artifact-icon-sm" style={{ color: getTypeColor(a.type || '') }}>
                        {getTypeIcon(a.type || '')}
                      </div>
                      {a.name}
                    </div>
                  </td>
                  <td>
                    <span className="artifact-type">{a.type}</span>
                  </td>
                  <td>{a.updatedBy}</td>
                  <td>{formatTime(a.updatedAt || '')}</td>
                  <td>{a.size ? formatSize(a.size) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
