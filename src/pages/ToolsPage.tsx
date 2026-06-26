import { useTranslation } from 'react-i18next';
import { useSkills, useMcpServers } from '../hooks/use-api';
import { useState, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../stores/ui-store';
import * as api from '../lib/api';

type ToolTab = 'skill' | 'mcp';

// ===== MCP Server Form State =====
interface McpFormState {
  name: string;
  command: string;
  args: string;
  env: string;
}

const EMPTY_MCP_FORM: McpFormState = { name: '', command: '', args: '', env: '' };

export default function ToolsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const addToast = useUIStore((s) => s.addToast);

  const [tab, setTab] = useState<ToolTab>('skill');
  const { data: skills, isLoading: skillsLoading } = useSkills();
  const { data: mcpServers, isLoading: mcpLoading } = useMcpServers();

  // ---- MCP Dialog State ----
  const [mcpDialogOpen, setMcpDialogOpen] = useState(false);
  const [mcpEditId, setMcpEditId] = useState<string | null>(null);
  const [mcpForm, setMcpForm] = useState<McpFormState>(EMPTY_MCP_FORM);
  const [mcpSaving, setMcpSaving] = useState(false);

  // ===============================================================
  // Derived Data
  // ===============================================================

  const skillItems = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    return skills.map((s) => ({
      id: s.id,
      name: s.name || '未知',
      description: s.description || '',
      stats: s.stats || '',
      enabled: s.enabled ?? false,
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
      tools: m.tools || [],
      icon: (m.name || '?').charAt(0).toUpperCase(),
    }));
  }, [mcpServers]);

  // ===============================================================
  // Skills: Toggle enabled
  // ===============================================================

  const handleToggleSkill = useCallback(async (id: string, enabled: boolean) => {
    try {
      await api.toggleSkill(id, enabled);
      addToast(enabled ? '技能已启用' : '技能已禁用', 'success');
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (err) {
      addToast('操作失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  }, [addToast, queryClient]);

  // ===============================================================
  // MCP: Open Add/Edit Dialog
  // ===============================================================

  const handleOpenAddMcp = useCallback(() => {
    setMcpEditId(null);
    setMcpForm(EMPTY_MCP_FORM);
    setMcpDialogOpen(true);
  }, []);

  const handleOpenEditMcp = useCallback(async (id: string) => {
    try {
      const server = mcpServers?.find((m) => m.id === id);
      if (!server) {
        addToast('未找到该 MCP 服务器', 'error');
        return;
      }
      setMcpEditId(id);
      setMcpForm({
        name: server.name || '',
        command: server.command || '',
        args: (server.args || []).join(' '),
        env: server.env ? JSON.stringify(server.env, null, 2) : '',
      });
      setMcpDialogOpen(true);
    } catch {
      addToast('加载失败', 'error');
    }
  }, [mcpServers, addToast]);

  // ===============================================================
  // MCP: Save (Create or Update)
  // ===============================================================

  const handleSaveMcp = useCallback(async () => {
    if (!mcpForm.name.trim()) {
      addToast('请输入服务器名称', 'warning');
      return;
    }
    if (!mcpForm.command.trim()) {
      addToast('请输入启动命令', 'warning');
      return;
    }

    setMcpSaving(true);
    try {
      const args = mcpForm.args
        .split(/\s+/)
        .map((s) => s.trim())
        .filter(Boolean);

      let env: Record<string, string> | undefined;
      if (mcpForm.env.trim()) {
        try {
          env = JSON.parse(mcpForm.env.trim());
        } catch {
          addToast('环境变量格式错误，请使用 JSON 格式', 'warning');
          setMcpSaving(false);
          return;
        }
      }

      const payload = {
        name: mcpForm.name.trim(),
        command: mcpForm.command.trim(),
        args,
        env,
      };

      if (mcpEditId) {
        await api.updateMcpServer(mcpEditId, payload);
        addToast('MCP 服务器已更新', 'success');
      } else {
        await api.addMcpServer(payload);
        addToast('MCP 服务器已添加', 'success');
      }

      setMcpDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpConfig'] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      const isNetworkError = /fetch|NetworkError|连接|network/i.test(msg);
      addToast(isNetworkError ? '保存失败：后端服务未连接' : msg, 'error');
    } finally {
      setMcpSaving(false);
    }
  }, [mcpForm, mcpEditId, addToast, queryClient]);

  // ===============================================================
  // MCP: Delete
  // ===============================================================

  const handleDeleteMcp = useCallback(async (id: string) => {
    if (!window.confirm('确定要删除这个 MCP 服务器吗？')) return;
    try {
      await api.deleteMcpServer(id);
      addToast('MCP 服务器已删除', 'success');
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpConfig'] });
    } catch (err) {
      addToast('删除失败: ' + (err instanceof Error ? err.message : '未知错误'), 'error');
    }
  }, [addToast, queryClient]);

  // ===============================================================
  // Render: Skill Tab
  // ===============================================================

  function renderSkills() {
    if (skillsLoading) {
      return (
        <div className="empty-state-text">{t('common.loading')}</div>
      );
    }
    if (skillItems.length === 0) {
      return (
        <div className="empty-state-text">{t('tools.noSkills')}</div>
      );
    }
    return skillItems.map((s) => (
      <div key={s.id} className="tool-item">
        <div className="tool-icon">{s.icon}</div>
        <div className="tool-info">
          <div className="tool-name">{s.name}</div>
          <div className="tool-desc">{s.description}</div>
        </div>
        <div className="tool-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {s.stats && <span className="tool-stat">{s.stats}</span>}
          <button
            className={`setting-toggle ${s.enabled ? 'on' : ''}`}
            onClick={() => handleToggleSkill(s.id, !s.enabled)}
            aria-label={s.enabled ? '禁用' : '启用'}
            title={s.enabled ? '点击禁用' : '点击启用'}
            style={{ transform: 'scale(0.75)', transformOrigin: 'right center' }}
          />
        </div>
      </div>
    ));
  }

  // ===============================================================
  // Render: MCP Tab
  // ===============================================================

  function renderMcp() {
    return (
      <>
        <div className="tools-page-header" style={{ padding: '0 0 12px 0', borderBottom: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="tools-page-title" style={{ fontSize: 13, fontWeight: 500 }}>MCP 服务器列表</div>
            <button
              className="chat-welcome-chip active"
              onClick={handleOpenAddMcp}
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              + 添加服务器
            </button>
          </div>
        </div>

        {mcpLoading ? (
          <div className="empty-state-text">{t('common.loading')}</div>
        ) : mcpItems.length === 0 ? (
          <div className="empty-state-text">
            <div className="not-available" style={{ marginTop: 24 }}>
              <div className="not-available-title">暂无 MCP 服务器</div>
              <div className="not-available-desc">点击「添加服务器」配置一个 MCP 服务器</div>
            </div>
          </div>
        ) : (
          mcpItems.map((m) => (
            <div key={m.id} className="tool-item" style={{ alignItems: 'flex-start' }}>
              <div className="tool-icon">{m.icon}</div>
              <div className="tool-info">
                <div className="tool-name">{m.name}</div>
                <div className="tool-desc">{m.description || '无描述'}</div>
                {m.tools && m.tools.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                    {m.tools.slice(0, 5).map((tool) => (
                      <span
                        key={tool}
                        style={{
                          fontSize: 11,
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: 'var(--cb-button-primary-bg, rgba(108,77,255,0.08))',
                          color: 'var(--cb-button-primary, #6c4dff)',
                        }}
                      >
                        {tool}
                      </span>
                    ))}
                    {m.tools.length > 5 && (
                      <span style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)' }}>
                        +{m.tools.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="tool-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span className={m.connected ? 'tool-stat-connected' : 'tool-stat'}>
                  {m.connected ? '已连接' : '未连接'}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="msg-action-btn"
                    onClick={() => handleOpenEditMcp(m.id)}
                    style={{ fontSize: 11, padding: '2px 6px' }}
                  >
                    编辑
                  </button>
                  <button
                    className="msg-action-btn msg-action-btn-danger-hover"
                    onClick={() => handleDeleteMcp(m.id)}
                    style={{ fontSize: 11, padding: '2px 6px' }}
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </>
    );
  }

  // ===============================================================
  // Main Render
  // ===============================================================

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
          MCP 服务器
        </button>
      </div>

      <div className="tools-list">
        {tab === 'skill' && (
          <div className="tool-category">{renderSkills()}</div>
        )}
        {tab === 'mcp' && (
          <div className="tool-category">{renderMcp()}</div>
        )}
      </div>

      {/* ===== MCP Server Add/Edit Dialog ===== */}
      {mcpDialogOpen && (
        <div
          className="settings-overlay visible"
          style={{ zIndex: 210 }}
          onClick={() => setMcpDialogOpen(false)}
        >
          <div
            className="settings-modal"
            style={{ width: 480, height: 'auto', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">
                {mcpEditId ? '编辑 MCP 服务器' : '添加 MCP 服务器'}
              </span>
              <button className="settings-close-btn" onClick={() => setMcpDialogOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>名称 *</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={mcpForm.name}
                    onChange={(e) => setMcpForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="例如: my-filesystem-server"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>启动命令 *</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={mcpForm.command}
                    onChange={(e) => setMcpForm((f) => ({ ...f, command: e.target.value }))}
                    placeholder="例如: npx @anthropic-ai/claude-mcp"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>启动参数</div>
                  <input
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px' }}
                    value={mcpForm.args}
                    onChange={(e) => setMcpForm((f) => ({ ...f, args: e.target.value }))}
                    placeholder="用空格分隔的参数（可选）"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>环境变量 (JSON)</div>
                  <textarea
                    className="chat-input-textarea"
                    style={{ width: '100%', border: '1px solid var(--cb-border)', borderRadius: 4, padding: '6px 10px', minHeight: 60, fontFamily: 'monospace', fontSize: 12 }}
                    value={mcpForm.env}
                    onChange={(e) => setMcpForm((f) => ({ ...f, env: e.target.value }))}
                    placeholder='例如: {"API_KEY": "sk-..."}'
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    className="chat-welcome-chip"
                    onClick={() => setMcpDialogOpen(false)}
                    disabled={mcpSaving}
                  >
                    {t('chat.cancel')}
                  </button>
                  <button
                    className="chat-welcome-chip active"
                    onClick={handleSaveMcp}
                    disabled={mcpSaving}
                    style={mcpSaving ? { opacity: 0.6 } : undefined}
                  >
                    {mcpSaving ? '保存中...' : t('settings.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
