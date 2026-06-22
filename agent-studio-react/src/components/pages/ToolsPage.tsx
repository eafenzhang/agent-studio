import React, { useState, useEffect } from 'react';
import { extensionApi, mcpApi, assistantApi } from '../../services/api';

export const ToolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('skill');
  const [skills, setSkills] = useState<any[]>([]);
  const [mcpServers, setMcpServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      extensionApi.list(),
      assistantApi.list(),
      mcpApi.servers(),
    ]).then(([extResult, asstResult, mcpResult]) => {
      // 1) 优先用 extensionApi
      if (extResult.status === 'fulfilled' && extResult.value && extResult.value.length > 0) {
        setSkills(extResult.value.map((e: any) => ({
          id: e.id, name: e.name,
          description: e.description || '',
          icon: e.name.charAt(0).toUpperCase(),
          stat: e.enabled ? '已启用' : '已禁用',
          connected: e.enabled,
          category: 'skill',
        })));
      }
      // 2) 降级：从所有 assistant 的 enabled_skills 聚合
      else if (asstResult.status === 'fulfilled' && asstResult.value) {
        const allSkills = new Map<string, { name: string; desc: string; assistants: string[] }>();
        for (const a of asstResult.value as any[]) {
          for (const s of a.enabled_skills || []) {
            if (!allSkills.has(s)) {
              allSkills.set(s, { name: s, desc: `由 ${a.name} 提供`, assistants: [] });
            }
            allSkills.get(s)!.assistants.push(a.name);
          }
          for (const s of a.custom_skill_names || []) {
            if (!allSkills.has(s)) {
              allSkills.set(s, { name: s, desc: `自定义技能 · ${a.name}`, assistants: [] });
            }
            allSkills.get(s)!.assistants.push(a.name);
          }
        }
        setSkills(Array.from(allSkills.entries()).map(([id, s]) => ({
          id, name: s.name, description: s.desc,
          icon: s.name.charAt(0).toUpperCase(),
          stat: `${s.assistants.length} 个助手使用`,
          category: 'skill',
        })));
      }

      if (mcpResult.status === 'fulfilled' && mcpResult.value) {
        setMcpServers(mcpResult.value.map((s: any) => ({
          id: s.id, name: s.name,
          description: s.description || s.type || '',
          icon: s.name.charAt(0).toUpperCase(),
          stat: s.enabled ? '已连接' : '未连接',
          connected: s.enabled,
          category: 'mcp',
        })));
      }
      setLoading(false);
    });
  }, []);

  const displayData = activeTab === 'skill' ? skills : mcpServers;

  return (
    <div className="page active page-fade-in">
      <div className="tools-tabs">
        {[{ id: 'skill', label: `技能 (${skills.length})` }, { id: 'mcp', label: `MCP (${mcpServers.length})` }].map(tab => (
          <div key={tab.id} className={`tool-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}>{tab.label}</div>
        ))}
      </div>
      <div className="tools-list">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--cb-text-secondary)' }}>加载中...</div>
        ) : displayData.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--wb-color-text-disabled)' }}>
            {activeTab === 'skill' ? '暂无可用技能' : '未配置 MCP 服务器'}
          </div>
        ) : (
          <div className="tool-category">
            {displayData.map((tool: any) => (
              <div key={tool.id} className="tool-item">
                <div className="tool-icon">{tool.icon}</div>
                <div className="tool-info">
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-desc">{tool.description}</div>
                </div>
                <div className="tool-meta">
                  <span className={`tool-stat${tool.connected ? ' tool-stat-connected' : ''}`}>{tool.stat}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
