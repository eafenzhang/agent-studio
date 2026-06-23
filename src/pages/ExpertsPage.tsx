import { useTranslation } from 'react-i18next';
import { useAssistants } from '../hooks/use-api';
import { useState, useMemo } from 'react';
import type { Assistant } from '../types/api';

type ExpertFilter = 'all' | 'builtin' | 'custom';

/** Render an assistant's avatar, handling HTML strings, image URLs, and plain text initials. */
function renderAvatar(assistant: Assistant): JSX.Element {
  const avatar = assistant.avatar || '';
  const name = (assistant.name_i18n && assistant.name_i18n['zh-CN']) || assistant.name || '';

  // HTML content (SVG or img tag from backend) — anything starting with '<'
  if (avatar.startsWith('<')) {
    return <div className="expert-avatar" dangerouslySetInnerHTML={{ __html: avatar }} />;
  }

  // Image URL (absolute or relative)
  if (avatar.startsWith('http') || avatar.startsWith('/')) {
    const src = avatar.startsWith('/') ? 'http://127.0.0.1:25808' + avatar : avatar;
    return (
      <div className="expert-avatar">
        <img
          src={src}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
        />
      </div>
    );
  }

  // Plain text fallback — show text or first character of name
  return <div className="expert-avatar">{avatar || name.charAt(0)}</div>;
}

export default function ExpertsPage() {
  const { t } = useTranslation();
  const { data: assistants, isLoading } = useAssistants();
  const [filter, setFilter] = useState<ExpertFilter>('all');

  const filteredData = useMemo(() => {
    if (!assistants) return [];
    if (filter === 'builtin') return assistants.filter((a) => a.source === 'builtin');
    if (filter === 'custom') return assistants.filter((a) => a.source !== 'builtin');
    return assistants;
  }, [assistants, filter]);

  const filters: { key: ExpertFilter; label: string }[] = [
    { key: 'all', label: t('experts.all') },
    { key: 'builtin', label: t('experts.builtin') },
    { key: 'custom', label: t('experts.custom') },
  ];

  function renderGrid() {
    if (isLoading) {
      return (
        <div style={{
          gridColumn: '1 / -1',
          textAlign: 'center',
          padding: '32px 0',
          fontSize: 13,
          color: 'var(--wb-color-text-disabled)',
        }}>
          {t('common.loading')}
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div style={{
          gridColumn: '1 / -1',
          textAlign: 'center',
          padding: '32px 0',
          fontSize: 13,
          color: 'var(--wb-color-text-disabled)',
        }}>
          {t('experts.noData')}
        </div>
      );
    }

    return filteredData.map((a: Assistant) => {
      const name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name || 'Unknown';
      const desc =
        (a.description_i18n && a.description_i18n['zh-CN']) || a.description || '';
      const truncated = desc.length > 80 ? desc.substring(0, 80) + '...' : desc;
      const role = a.source === 'builtin' ? 'AionCore 内置' : '自定义';
      const tags = a.tags && a.tags.length > 0 ? a.tags : ['通用'];

      return (
        <article key={a.id} className="expert-card">
          <div className="expert-card-top">
            {renderAvatar(a)}
            <div>
              <div className="expert-name">{name}</div>
              <div className="expert-role">{role}</div>
            </div>
          </div>
          <div className="expert-desc">{truncated}</div>
          <div className="expert-tags">
            {tags.map((tag: string) => (
              <span key={tag} className="expert-tag">{tag}</span>
            ))}
          </div>
        </article>
      );
    });
  }

  return (
    <div className="page active">
      <div className="experts-page-header">
        <div className="experts-page-title">{t('experts.title')}</div>
      </div>

      <div className="experts-tabs">
        {filters.map((f) => (
          <button
            key={f.key}
            className={`expert-tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="experts-grid">
        {renderGrid()}
      </div>
    </div>
  );
}
