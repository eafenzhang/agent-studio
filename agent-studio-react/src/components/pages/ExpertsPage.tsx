import React, { useState, useEffect } from 'react';
import type { Expert } from '../../types';
import { assistantApi } from '../../services/api';
import { zhName, zhDescription } from '../../data/assistantNames';

const API_BASE = import.meta.env.VITE_AION_CORE_URL || 'http://localhost:25808';

const expertTabs = ['全部', '启用', '停用'];

export const ExpertsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assistantApi.list().then((list) => {
      if (list && list.length > 0) {
        setExperts(list.map((a: any) => ({
          id: a.id,
          name: zhName(a.id, a.name),
          role: a.source === 'builtin' ? '内置助手' : '自定义',
          description: zhDescription(a.id, a.description || `${a.preset_agent_type} 类型助手`),
          tags: [
            a.source === 'builtin' ? '内置' : '自定义',
            a.preset_agent_type,
            ...(a.enabled_skills || []).slice(0, 2),
          ].filter(Boolean),
          avatar: a.avatar || a.name.charAt(0).toUpperCase(),
          avatarUrl: typeof a.avatar === 'string' && a.avatar.startsWith('/')
            ? `${API_BASE}${a.avatar}` : undefined,
        })));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered =
    activeTab === 0 ? experts
    : activeTab === 1 ? experts.filter((e) => !e.role.includes('停用'))
    : experts.filter((e) => e.role.includes('停用'));

  return (
    <div className="page active page-fade-in">
      <div className="experts-tabs">
        {expertTabs.map((tab, i) => (
          <div key={tab} className={`expert-tab${activeTab === i ? ' active' : ''}`}
            onClick={() => setActiveTab(i)}>{tab}</div>
        ))}
      </div>
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--cb-text-secondary)' }}>加载中...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--wb-color-text-disabled)' }}>
          {activeTab === 0 ? '暂无助手' : '没有匹配的助手'}
        </div>
      ) : (
        <div className="experts-grid">
          {filtered.map((expert) => (
            <div key={expert.id} className="expert-card">
              <div className="expert-card-top">
                <div className="expert-avatar">
                  {expert.avatarUrl ? (
                    <img src={expert.avatarUrl} alt={expert.name}
                      style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
                  ) : (
                    expert.avatar
                  )}
                </div>
                <div>
                  <div className="expert-name">{expert.name}</div>
                  <div className="expert-role">{expert.role}</div>
                </div>
              </div>
              <div className="expert-desc">{expert.description}</div>
              <div className="expert-tags">
                {expert.tags.map((tag) => <span key={tag} className="expert-tag">{tag}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
