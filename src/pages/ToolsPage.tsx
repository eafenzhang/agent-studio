import { useTranslation } from 'react-i18next';
import { useSkills, useMcpServers } from '../hooks/use-api';
import { useState, useMemo } from 'react';

type ToolTab = 'skill' | 'mcp';

export default function ToolsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<ToolTab>('skill');
  const { data: skills, isLoading: skillsLoading } = useSkills();
  const { data: mcpServers, isLoading: mcpLoading } = useMcpServers();

  const skillItems = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    return skills.map((s) => ({
      id: s.id,
      name: s.name || '未知',
      description: s.description || '',
      stats: s.stats || '',
      icon: (s.name || '?').charAt(0).toUpperCase(),
    }));
  }, [skills]);

  const mcpItems = useMemo(() => {
    if (!mcpServers || mcpServers.length === 0) return [];
    return mcpServers.map((m) => ({
      id: m.id,
      name: m.name || '未知 MCP',
      description: m.description || '',
      connected: m.connected || false,
      icon: (m.name || '?').charAt(0).toUpperCase(),
    }));
  }, [mcpServers]);

  return (
    <div className="page active">
      <div className="tools-page-header">
        <div className="tools-page-title">{t('tools.title')}</div>
      </div>

      <div className="tools-tabs">
        <button
          className={`tool-tab ${tab === 'skill' ? 'active' : ''}`}
          onClick={() => setTab('skill')}
        >
          {t('tools.skill')}
        </button>
        <button
          className={`tool-tab ${tab === 'mcp' ? 'active' : ''}`}
          onClick={() => setTab('mcp')}
        >
          {t('tools.mcp')}
        </button>
      </div>

      <div className="tools-list">
        {tab === 'skill' && (
          <div className="tool-category">
            {skillsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                {t('common.loading')}
              </div>
            ) : skillItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                {t('tools.noSkills')}
              </div>
            ) : (
              skillItems.map((s) => (
                <div key={s.id} className="tool-item">
                  <div className="tool-icon">{s.icon}</div>
                  <div className="tool-info">
                    <div className="tool-name">{s.name}</div>
                    <div className="tool-desc">{s.description}</div>
                  </div>
                  <div className="tool-meta">
                    {s.stats && <span className="tool-stat">{s.stats}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'mcp' && (
          <div className="tool-category">
            {mcpLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                {t('common.loading')}
              </div>
            ) : mcpItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                {t('tools.noMcp')}
              </div>
            ) : (
              mcpItems.map((m) => (
                <div key={m.id} className="tool-item">
                  <div className="tool-icon">{m.icon}</div>
                  <div className="tool-info">
                    <div className="tool-name">{m.name}</div>
                    <div className="tool-desc">{m.description}</div>
                  </div>
                  <div className="tool-meta">
                    <span className={m.connected ? 'tool-stat-connected' : 'tool-stat'}>
                      {m.connected ? '已连接' : '未连接'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
