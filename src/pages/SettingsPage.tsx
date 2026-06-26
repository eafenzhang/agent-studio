import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/ui-store';
import { useState, useEffect } from 'react';
import {
  useProviders,
  useCreateProvider,
  useDeleteProvider,
  useMemory,
  useDeleteMemory,
  useSettings,
  useUpdateSettings,
} from '../hooks/use-api';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../lib/api';
import { showConfirm } from '../components/ui/ConfirmModal';

const PRESET_PROVIDERS = [
  { name: 'DeepSeek', platform: 'openai', apiUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'] },
  { name: '通义千问 (Qwen)', platform: 'openai', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen-max', 'qwen-plus', 'qwen-turbo'] },
  { name: '智谱 GLM', platform: 'openai', apiUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-plus', 'glm-4-air', 'glm-4-flash'] },
  { name: '百度文心 (ERNIE)', platform: 'openai', apiUrl: 'https://qianfan.baidubce.com/v2', models: ['ernie-4.5-8k', 'ernie-speed-8k', 'ernie-lite-8k'] },
  { name: '月之暗面 (Moonshot)', platform: 'openai', apiUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-auto', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  { name: 'MiniMax', platform: 'openai', apiUrl: 'https://api.minimax.chat/v1', models: ['MiniMax-Text-01', 'abab6.5s-chat', 'abab7-chat'] },
  { name: '零一万物 (Yi)', platform: 'openai', apiUrl: 'https://api.lingyiwanwu.com/v1', models: ['yi-lightning', 'yi-large', 'yi-large-turbo'] },
  { name: '字节豆包 (Doubao)', platform: 'openai', apiUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['doubao-1.5-pro-256k', 'doubao-1.5-pro-32k', 'doubao-1.5-lite-32k'] },
  { name: 'OpenAI', platform: 'openai', apiUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3-mini', 'o4-mini'] },
  { name: 'Anthropic', platform: 'anthropic', apiUrl: 'https://api.anthropic.com/v1', models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'] },
  { name: '自定义', platform: 'openai', apiUrl: '', models: [] as string[] },
];

const TABS = ['general', 'model', 'memory', 'update'] as const;
type SettingsTab = (typeof TABS)[number];

const tabLabels: Record<SettingsTab, string> = {
  general: '系统',
  model: '模型',
  memory: '记忆',
  update: '更新',
};

const tabIcons: Record<SettingsTab, JSX.Element> = {
  general: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09" />
    </svg>
  ),
  model: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
    </svg>
  ),
  memory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  update: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  ),
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const language = useUIStore((s) => s.language);
  const setLanguage = useUIStore((s) => s.setLanguage);
  const compactMode = useUIStore((s) => s.compactMode);
  const setCompactMode = useUIStore((s) => s.setCompactMode);
  const autoUpdateSkills = useUIStore((s) => s.autoUpdateSkills);
  const setAutoUpdateSkills = useUIStore((s) => s.setAutoUpdateSkills);
  const lockScreenRemote = useUIStore((s) => s.lockScreenRemote);
  const setLockScreenRemote = useUIStore((s) => s.setLockScreenRemote);
  const sendShortcut = useUIStore((s) => s.sendShortcut);
  const setSendShortcut = useUIStore((s) => s.setSendShortcut);
  const addToast = useUIStore((s) => s.addToast);
  const selectedModel = useUIStore((s) => s.selectedModel);
  const setSelectedModel = useUIStore((s) => s.setSelectedModel);
  const { data: providers, isLoading } = useProviders();
  const createProvider = useCreateProvider();
  const deleteProvider = useDeleteProvider();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: memoryEntries, isLoading: memoryLoading } = useMemory();
  const deleteMemory = useDeleteMemory();

  // ---- Provider dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<{ id: string; name: string; base_url: string; api_key: string } | null>(null);
  const [presetName, setPresetName] = useState('');
  const [dialogApiKey, setDialogApiKey] = useState('');
  const [fetchingModels, setFetchingModels] = useState(false);

  // ---- System info state ----
  const [systemVersion, setSystemVersion] = useState<string>('1.0.10');
  const [systemInfoLoading, setSystemInfoLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getSystemInfo().then((info) => {
      if (!cancelled) {
        setSystemVersion(info.version || '1.0.10');
        setSystemInfoLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setSystemInfoLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // Sync language change immediately
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  // Sync backend settings to local store when available
  useEffect(() => {
    if (!settings) return;
    if (settings.theme && ['light', 'dark', 'auto'].includes(settings.theme as string)) {
      setTheme(settings.theme as 'light' | 'dark' | 'auto');
    }
    if (settings.language && ['zh', 'en'].includes(settings.language as string)) {
      setLanguage(settings.language as 'zh' | 'en');
    }
    if (typeof settings.compactMode === 'boolean') setCompactMode(settings.compactMode);
    if (typeof settings.autoUpdateSkills === 'boolean') setAutoUpdateSkills(settings.autoUpdateSkills);
    if (typeof settings.lockScreenRemote === 'boolean') setLockScreenRemote(settings.lockScreenRemote);
    if (settings.sendShortcut && ['enter', 'ctrl_enter'].includes(settings.sendShortcut as string)) {
      setSendShortcut(settings.sendShortcut as 'enter' | 'ctrl_enter');
    }
    if (settings.defaultModel && typeof settings.defaultModel === 'string') {
      setSelectedModel(settings.defaultModel);
    }
  }, [
    settings,
    setTheme,
    setLanguage,
    setCompactMode,
    setAutoUpdateSkills,
    setLockScreenRemote,
    setSendShortcut,
    setSelectedModel,
  ]);

  const openNewDialog = () => {
    setEditProvider(null);
    setPresetName('');
    setDialogApiKey('');
    setDialogOpen(true);
  };

  const openEditDialog = async (id: string) => {
    try {
      const p = await api.getProvider(id);
      setEditProvider({ id, name: p.name || '', base_url: p.base_url || '', api_key: p.api_key || '' });
      setPresetName(p.name || '');
      setDialogApiKey(p.api_key || '');
      setDialogOpen(true);
    } catch {
      addToast(t('common.networkError'), 'error');
    }
  };

  const handleSaveProvider = async () => {
    if (!presetName || !dialogApiKey) {
      addToast('请选择供应商并填写 API Key', 'warning');
      return;
    }
    const preset = PRESET_PROVIDERS.find((p) => p.name === presetName);
    if (!preset) {
      addToast('请从列表中选择供应商', 'warning');
      return;
    }
    if (!preset.apiUrl) {
      addToast('该供应商没有预设 API 地址，请使用自定义选项', 'warning');
      return;
    }

    try {
      setFetchingModels(true);
      const payload = {
        name: presetName,
        base_url: preset.apiUrl,
        api_key: dialogApiKey,
        platform: preset.platform || 'openai',
        models: preset.models,
      };

      if (editProvider) {
        await api.updateProvider(editProvider.id, payload);
      } else {
        await createProvider.mutateAsync(payload);
      }

      // After saving, try to fetch models from the API
      try {
        const savedId = editProvider?.id;
        if (savedId) {
          await api.fetchProviderModels(savedId);
        } else {
          // For new providers, invalidate and wait for list to refresh, then fetch
          await queryClient.invalidateQueries({ queryKey: ['providers'] });
          await new Promise((r) => setTimeout(r, 500));
          const freshProviders = queryClient.getQueryData<any[]>(['providers']);
          if (freshProviders && freshProviders.length > 0) {
            const newest = freshProviders[freshProviders.length - 1];
            if (newest.id) await api.fetchProviderModels(newest.id);
          }
        }
        addToast('已保存并尝试获取模型列表', 'success');
      } catch {
        addToast('已保存，但自动获取模型列表失败，可稍后手动点击"获取模型"', 'info');
      }

      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    } catch (err) {
      addToast('保存失败：' + (err instanceof Error ? err.message : String(err)), 'error');
    } finally {
      setFetchingModels(false);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!await showConfirm(t('settings.deleteProvider'))) return;
    try {
      await deleteProvider.mutateAsync(id);
      addToast(t('settings.providerDeleted'), 'success');
    } catch {
      addToast(t('settings.deleteFailed'), 'error');
    }
  };

  const handleFetchModels = async (id: string) => {
    try {
      addToast('正在获取模型列表...', 'info');
      await api.fetchProviderModels(id);
      addToast(t('settings.modelListUpdated'), 'success');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    } catch {
      addToast(t('settings.fetchFailed'), 'error');
    }
  };

  const handleSaveGeneralSettings = async () => {
    try {
      const payload = {
        theme,
        language,
        compactMode,
        autoUpdateSkills,
        lockScreenRemote,
        sendShortcut,
        defaultModel: selectedModel || undefined,
      };
      await updateSettings.mutateAsync(payload);
      addToast(t('settings.saved'), 'success');
    } catch {
      // Backend settings may not be supported; localStorage already persisted via store actions
      addToast('设置已保存到本地', 'success');
    }
  };

  const handleClose = () => {
    // Fallback to home if history navigation would fail (e.g. direct entry / Tauri)
    navigate('/');
  };

  const handleDeleteMemory = async (id: string) => {
    if (!await showConfirm('确定要删除这条记忆吗？')) return;
    try {
      await deleteMemory.mutateAsync(id);
      addToast('已删除', 'success');
    } catch {
      addToast('删除失败', 'error');
    }
  };

  const handleCheckUpdate = () => {
    addToast('正在检查更新...', 'info');
    // Fetch latest.json from GitHub to check for newer versions
    fetch('https://github.com/eafenzhang/agent-studio/releases/latest/download/latest.json', {
      mode: 'cors',
    })
      .then((res) => res.json())
      .then((data) => {
        const latest = data.version || '';
        if (latest && latest !== systemVersion) {
          addToast(`发现新版本 v${latest}，请前往 GitHub 下载`, 'warning');
        } else {
          addToast(`已是最新版本 v${systemVersion}`, 'success');
        }
      })
      .catch(() => {
        addToast(`当前版本 v${systemVersion}（无法检查更新）`, 'info');
      });
  };

  return (
    <>
    <div className="settings-overlay visible">
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sidebar">
          <div className="settings-sidebar-title">{t('settings.title')}</div>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`settings-nav-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabIcons[tab]}
              {tabLabels[tab]}
            </button>
          ))}
        </div>

        {/* Settings Main Content */}
        <div className="settings-main">
          <div className="settings-main-header">
            <span className="settings-main-title">{tabLabels[activeTab]}设置</span>
            <button className="settings-close-btn" onClick={handleClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="settings-content">
            {/* General Settings */}
            <div className={`settings-page ${activeTab === 'general' ? 'active' : ''}`}>
              <div className="setting-group">
                <div className="setting-label">显示语言</div>
                <div className="setting-desc">设置应用界面的显示语言。</div>
                <select
                  className="setting-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'zh' | 'en')}
                >
                  <option value="zh">中文(简体)</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="setting-group">
                <div className="setting-control">
                  <div>
                    <div className="setting-label">简洁模式</div>
                    <div className="setting-desc" style={{ marginBottom: 0 }}>简化对话界面显示。</div>
                  </div>
                  <button
                    className={`setting-toggle ${compactMode ? 'on' : ''}`}
                    onClick={() => setCompactMode(!compactMode)}
                  />
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-label">发送消息</div>
                <div className="setting-desc">聊天输入框中发送消息的快捷键。</div>
                <select
                  className="setting-select"
                  value={sendShortcut}
                  onChange={(e) => setSendShortcut(e.target.value as 'enter' | 'ctrl_enter')}
                >
                  <option value="enter">Enter</option>
                  <option value="ctrl_enter">Ctrl+Enter</option>
                </select>
              </div>

              <div className="setting-group">
                <div className="setting-control">
                  <div>
                    <div className="setting-label">技能自动更新</div>
                    <div className="setting-desc" style={{ marginBottom: 0 }}>自动更新已安装技能为最新版本。</div>
                  </div>
                  <button
                    className={`setting-toggle ${autoUpdateSkills ? 'on' : ''}`}
                    onClick={() => setAutoUpdateSkills(!autoUpdateSkills)}
                  />
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-control">
                  <div>
                    <div className="setting-label">锁屏远程</div>
                    <div className="setting-desc" style={{ marginBottom: 0 }}>锁屏状态下电脑不进入休眠。</div>
                  </div>
                  <button
                    className={`setting-toggle ${lockScreenRemote ? 'on' : ''}`}
                    onClick={() => setLockScreenRemote(!lockScreenRemote)}
                  />
                </div>
              </div>

              <div className="setting-group">
                <div className="setting-label">显示主题</div>
                <div className="setting-desc">设置应用的颜色主题。</div>
                <select
                  className="setting-select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'auto')}
                >
                  <option value="light">{t('settings.themeLight')}</option>
                  <option value="dark">{t('settings.themeDark')}</option>
                  <option value="auto">{t('settings.themeAuto')}</option>
                </select>
              </div>

              <div className="setting-group">
                <button className="chat-welcome-chip active" onClick={handleSaveGeneralSettings}>
                  {t('settings.save')}
                </button>
              </div>
            </div>

            {/* Model Settings */}
            <div className={`settings-page ${activeTab === 'model' ? 'active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="setting-label">模型提供商</div>
                <button
                  onClick={openNewDialog}
                  style={{
                    padding: '6px 16px',
                    background: 'var(--cb-button-primary)',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {t('settings.addModel')}
                </button>
              </div>

              <div style={{ marginTop: 8, marginBottom: 8, height: 1, background: 'var(--cb-border-subtle)' }} />

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                  {t('common.loading')}
                </div>
              ) : !providers || providers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>🤖</div>
                  <div>暂无配置的模型提供商</div>
                  <div style={{ marginTop: 4, fontSize: 12 }}>点击上方「添加模型」按钮开始配置</div>
                </div>
              ) : (
                providers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: 'var(--cb-bg-secondary, #fff)',
                      border: '1px solid var(--cb-border-subtle)',
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginBottom: 8,
                      transition: 'box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: 'linear-gradient(135deg, var(--cb-button-primary), #8b7cf7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 14, fontWeight: 600,
                        }}>
                          {(p.name || '?')[0]}
                        </div>
                        <div>
                          <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--cb-text-primary)' }}>
                            {p.name || '未知'}
                          </span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--wb-color-text-disabled)', background: 'var(--cb-border-subtle)', padding: '1px 6px', borderRadius: 4 }}>
                            {p.platform || 'openai'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleFetchModels(p.id)}
                          style={{
                            padding: '3px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            color: 'var(--cb-text-secondary)',
                            border: '1px solid var(--cb-border-subtle)',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          获取模型
                        </button>
                        <button
                          onClick={() => openEditDialog(p.id)}
                          style={{
                            padding: '3px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            color: 'var(--cb-text-secondary)',
                            border: '1px solid var(--cb-border-subtle)',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          修改 Key
                        </button>
                        <button
                          onClick={() => handleDeleteProvider(p.id)}
                          style={{
                            padding: '3px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            color: '#ff4d4f',
                            border: '1px solid rgba(255,77,79,0.2)',
                            background: 'transparent',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.04)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', marginTop: 8 }}>
                      <span style={{ color: 'var(--cb-text-secondary)' }}>{(p.models || []).slice(0, 6).join(' · ')}</span>
                      {(p.models || []).length > 6 ? <span> ··· 共 {(p.models || []).length} 个模型</span> : (p.models || []).length === 0 ? <span style={{ fontStyle: 'italic' }}>暂无模型，点击「获取模型」拉取</span> : null}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Memory Settings */}
            <div className={`settings-page ${activeTab === 'memory' ? 'active' : ''}`}>
              <div className="setting-group">
                <div className="setting-label">对话记忆</div>
                <div className="setting-desc">AI 助手会记住以下信息。</div>
              </div>
              {memoryLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                  {t('common.loading')}
                </div>
              ) : !memoryEntries || memoryEntries.length === 0 ? (
                <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                  暂无记忆条目
                </div>
              ) : (
                memoryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{ padding: '12px 0', borderBottom: '1px solid var(--cb-border-subtle)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{entry.key || '记忆'}</span>
                      <button
                        onClick={() => handleDeleteMemory(entry.id)}
                        style={{ fontSize: 12, color: '#ff4d4f', padding: '2px 6px', borderRadius: 4 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.06)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        删除
                      </button>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)' }}>{entry.value || '-'}</div>
                    {entry.updatedAt && (
                      <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', marginTop: 2 }}>
                        {new Date(entry.updatedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Update Settings */}
            <div className={`settings-page ${activeTab === 'update' ? 'active' : ''}`}>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>
                  {systemInfoLoading ? '...' : `v${systemVersion}`}
                </div>
                <div style={{ fontSize: 13, color: 'var(--cb-switch-active-bg)', marginBottom: 16 }}>
                  {systemInfoLoading ? '' : `Agent Studio Desktop`}
                </div>
                <button
                  onClick={handleCheckUpdate}
                  style={{
                    padding: '8px 24px',
                    background: 'var(--cb-button-primary)',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  检查更新
                </button>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--wb-color-text-disabled)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: 8,
                }}>
                  最近更新
                </div>
                <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', lineHeight: 2 }}>
                  - 新增 MCP 服务器管理<br />
                  - 优化专家卡片加载<br />
                  - 修复文件同步中断
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Add/Edit Provider Dialog */}
    {dialogOpen && (
      <div className="settings-overlay visible" style={{ zIndex: 210 }} onClick={() => setDialogOpen(false)}>
        <div
          className="settings-modal"
          style={{ width: 400, height: 'auto', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="settings-main-header">
            <span className="settings-main-title">{editProvider ? '修改 API Key' : '添加模型提供商'}</span>
            <button className="settings-close-btn" onClick={() => setDialogOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="settings-content">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Provider preset selector */}
              <div>
                <div className="setting-label" style={{ marginBottom: 5 }}>选择供应商</div>
                <select
                  className="setting-select"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  disabled={!!editProvider}
                >
                  <option value="">请选择...</option>
                  {PRESET_PROVIDERS.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name}{p.apiUrl ? ' — ' + p.apiUrl : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* API URL (auto-filled from preset) */}
              <div>
                <div className="setting-label" style={{ marginBottom: 5 }}>API 地址</div>
                <input
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    border: '1px solid var(--cb-border)',
                    borderRadius: 4,
                    fontSize: 13,
                    color: 'var(--cb-text-secondary)',
                    fontFamily: 'var(--cb-font-family)',
                    outline: 'none',
                    background: 'var(--cb-main-area-background)',
                  }}
                  value={PRESET_PROVIDERS.find((p) => p.name === presetName)?.apiUrl || ''}
                  readOnly
                  placeholder="选择供应商后自动填充"
                />
                <div style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)', marginTop: 3 }}>
                  API 地址由供应商预设自动填充
                </div>
              </div>

              {/* API Key */}
              <div>
                <div className="setting-label" style={{ marginBottom: 5 }}>API Key</div>
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '6px 12px',
                    border: '1px solid var(--cb-border)',
                    borderRadius: 4,
                    fontSize: 13,
                    color: 'var(--cb-text-primary)',
                    fontFamily: 'var(--cb-font-family)',
                    outline: 'none',
                  }}
                  value={dialogApiKey}
                  onChange={(e) => setDialogApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              {/* Model count preview */}
              {presetName && (
                <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', lineHeight: 1.6 }}>
                  预设模型：
                  {(() => {
                    const preset = PRESET_PROVIDERS.find((p) => p.name === presetName);
                    return preset?.models && preset.models.length > 0
                      ? preset.models.join('、')
                      : '保存后将自动从 API 获取最新模型列表';
                  })()}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                <button
                  onClick={() => setDialogOpen(false)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--cb-text-secondary)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveProvider}
                  disabled={fetchingModels || !presetName || !dialogApiKey}
                  style={{
                    padding: '6px 16px',
                    background: fetchingModels || !presetName || !dialogApiKey
                      ? 'var(--wb-color-text-disabled)'
                      : 'var(--cb-button-primary)',
                    color: '#fff',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: fetchingModels || !presetName || !dialogApiKey ? 'not-allowed' : 'pointer',
                  }}
                >
                  {fetchingModels ? '保存中...' : editProvider ? '保存修改' : '添加并获取模型'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
