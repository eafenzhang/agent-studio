import React, { useState } from 'react';
import { conversationApi } from '../../services/api';
import { useAsyncData } from '../../hooks/useAsyncData';

const artifactTabs = ['任务成果', '云端网盘'];

export const ArtifactsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  // 遍历所有会话的 artifacts
  const { data: artifacts, loading } = useAsyncData(
    async () => {
      const list = await conversationApi.list();
      if (!list?.items || list.items.length === 0) return [];

      const all = await Promise.all(
        list.items.slice(0, 20).map(async (conv) => {
          const arts = await conversationApi.artifacts(conv.id);
          return (arts || []).map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type || '-',
            updatedBy: a.updatedBy || 'Agent',
            updatedAt: a.updatedAt || '',
            size: a.size || '-',
          }));
        }),
      );
      const flat = all.flat();
      return flat.length > 0 ? flat : null;
    },
    [],
    [],
  );

  return (
    <div className="page active page-fade-in">
      <div className="artifacts-tabs">
        {artifactTabs.map((tab, i) => (
          <div key={tab} className={`artifact-tab${activeTab === i ? ' active' : ''}`} onClick={() => setActiveTab(i)}>{tab}</div>
        ))}
      </div>

      {activeTab === 1 ? (
        /* 云端网盘 - 暂未开发 */
        <div className="not-available">
          <div className="not-available-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
          </div>
          <div className="not-available-title">暂未开放</div>
          <div className="not-available-desc">云端网盘功能正在开发中，未来将支持文件同步与管理。</div>
          <div className="not-available-badge">Coming Soon</div>
        </div>
      ) : (
        <>
          <div className="artifacts-toolbar">
            <div className="artifact-filter">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
              全部类型
            </div>
            <div className="artifact-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input type="text" placeholder="搜索文件..." />
            </div>
          </div>
          <div className="artifacts-table">
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--cb-text-secondary)', fontSize: 13 }}>加载中...</div>
            ) : artifacts.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--wb-color-text-disabled)', fontSize: 13 }}>暂无产物，开始对话后将自动生成</div>
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
                  {artifacts.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div className="artifact-name">
                          <div className="artifact-icon-sm" style={a.type === 'HTML' ? { color: 'var(--cb-button-primary)' } : undefined}>
                            {a.type === 'HTML' ? '<>' : a.type === 'PDF' ? 'P' : 'M'}
                          </div>
                          {a.name}
                        </div>
                      </td>
                      <td><span className="artifact-type">{a.type}</span></td>
                      <td>{a.updatedBy}</td>
                      <td>{a.updatedAt}</td>
                      <td>{a.size}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};
