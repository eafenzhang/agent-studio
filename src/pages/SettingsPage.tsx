import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../stores/ui-store';
import { useState, useEffect, useMemo } from 'react';
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

const PRESET_PROVIDERS = [
  { name: 'DeepSeek', platform: 'openai', apiUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'] },
  { name: '通义千问 (Qwen)', platform: 'openai', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: ['qwen3-235b-a22b', 'qwen-plus', 'qwen-turbo'] },
  { name: '智谱 GLM', platform: 'openai', apiUrl: 'https://open.bigmodel.cn/api/paas/v4', models: ['glm-4-flash', 'glm-4-air', 'glm-4-plus'] },
  { name: '百度文心 (ERNIE)', platform: 'openai', apiUrl: 'https://qianfan.baidubce.com/v2', models: ['ernie-4.5-8k', 'ernie-speed-8k', 'ernie-lite-8k'] },
  { name: '月之暗面 (Moonshot)', platform: 'openai', apiUrl: 'https://api.moonshot.cn/v1', models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'] },
  { name: 'MiniMax', platform: 'openai', apiUrl: 'https://api.minimax.chat/v1', models: ['abab6.5s-chat', 'abab7-chat'] },
  { name: '零一万物 (Yi)', platform: 'openai', apiUrl: 'https://api.lingyiwanwu.com/v1', models: ['yi-lightning', 'yi-large'] },
  { name: '字节豆包 (Doubao)', platform: 'openai', apiUrl: 'https://ark.cn-beijing.volces.com/api/v3', models: ['doubao-pro-32k', 'doubao-lite-32k'] },
  { name: 'OpenAI', platform: 'openai', apiUrl: 'https://api.openai.com/v1', models: ['gpt-4o', 'gpt-4o-mini', 'o3-mini', 'o4-mini'] },
  { name: '自定义', platform: 'openai', apiUrl: '', models: [] as string[] },
];

const DEFAULT_MODELS = ['GPT-4o', 'GPT-4o-mini', 'o3-mini', 'deepseek-chat', 'deepseek-reasoner', 'qwen-max-latest', 'glm-4-plus', 'moonshot-v1-128k'];

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
  const selectedModel = useUIStore((s) => s.selectedModel);
  const setSelectedModel = useUIStore((s) => s.setSelectedModel);
  const addToast = useUIStore((s) => s.addToast);
  const { data: providers, isLoading } = useProviders();
  const createProvider = useCreateProvider();
  const deleteProvider = useDeleteProvider();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: memoryEntries, isLoading: memoryLoading } = useMemory();
  const deleteMemory = useDeleteMemory();

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

  // Provider dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', base_url: '', api_key: '', platform: 'openai' });
  const [selectedPreset, setSelectedPreset] = useState('');
  const [modelName, setModelName] = useState('');
  const [dialogInitial, setDialogInitial] = useState({
    name: '',
    base_url: '',
    api_key: '',
    platform: 'openai',
    selectedPreset: '',
    modelName: '',
  });

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

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName);
    const preset = PRESET_PROVIDERS.find((p) => p.name === presetName);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        name: presetName,
        base_url: preset.apiUrl,
        platform: preset.platform,
      }));
      setModelName(preset.models.length > 0 ? preset.models.join(', ') : '');
    }
  };

  const openNewDialog = () => {
    setEditId(null);
    const initial = { name: '', base_url: '', api_key: '', platform: 'openai' };
    setFormData(initial);
    setSelectedPreset('');
    setModelName('');
    setDialogInitial({ ...initial, selectedPreset: '', modelName: '' });
    setDialogOpen(true);
  };

  const openEditDialog = async (id: string) => {
    try {
      const p = await api.getProvider(id);
      const initial = {
        name: p.name || '',
        base_url: p.base_url || '',
        api_key: p.api_key || '',
        platform: p.platform || 'openai',
      };
      setEditId(id);
      setFormData(initial);
      setModelName((p.models || []).join(', '));
      setSelectedPreset('');
      setDialogInitial({ ...initial, selectedPreset: '', modelName: (p.models || []).join(', ') });
      setDialogOpen(true);
    } catch {
      addToast(t('common.networkError'), 'error');
    }
  };

  const handleReset = () => {
    setFormData({
      name: dialogInitial.name,
      base_url: dialogInitial.base_url,
      api_key: dialogInitial.api_key,
      platform: dialogInitial.platform,
    });
    setSelectedPreset(dialogInitial.selectedPreset);
    setModelName(dialogInitial.modelName);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.base_url) {
      addToast('请填写供应商名称和 API 地址', 'warning');
      return;
    }
    try {
      const models = modelName.split(',').map((m) => m.trim()).filter(Boolean);
      const payload = { ...formData, models };
      if (editId) {
        await api.updateProvider(editId, payload);
        addToast(t('settings.saved'), 'success');
      } else {
        await createProvider.mutateAsync(payload);
        addToast(t('settings.saved'), 'success');
      }
      setDialogOpen(false);
      setSelectedPreset('');
      setModelName('');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isNetworkError = /fetch|NetworkError|Failed to fetch|连接|network/i.test(message);
      if (isNetworkError) {
        addToast('保存失败：后端服务未连接，请检查 AionCore 是否已启动', 'error');
      } else {
        addToast(t('settings.saveFailed'), 'error');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('settings.deleteProvider'))) return;
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

  const handleTestConnection = async (id: string) => {
    try {
      addToast('正在测试连接...', 'info');
      await api.fetchProviderModels(id);
      addToast('连接测试成功 ✓', 'success');
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    } catch {
      addToast('连接测试失败，请检查 API 地址和密钥', 'error');
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
    if (!confirm('确定要删除这条记忆吗？')) return;
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

  const allModels = useMemo(() => {
    const fromProviders = (providers || []).flatMap((p) => p.models || []);
    return Array.from(new Set([...DEFAULT_MODELS, ...fromProviders]));
  }, [providers]);

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

              {/* Default model selector — shows models from all configured providers */}
              <div className="setting-group">
                <div className="setting-label">默认模型</div>
                <div className="setting-desc">选择 AI 助手使用的默认语言模型。</div>
                <select
                  className="setting-select"
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value || null)}
                >
                  <option value="">未选择</option>
                  {allModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 8, marginBottom: 8, height: 1, background: 'var(--cb-border-subtle)' }} />

              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                  {t('common.loading')}
                </div>
              ) : !providers || providers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 13, color: 'var(--wb-color-text-disabled)' }}>
                  暂无配置
                </div>
              ) : (
                providers.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#fff',
                      border: '1px solid var(--cb-border-subtle)',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 500, fontSize: 13, color: 'var(--cb-text-primary)' }}>
                        {p.name || '未知'}
                      </span>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => handleFetchModels(p.id)}
                          style={{
                            padding: '2px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            color: 'var(--cb-text-secondary)',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {t('settings.fetchModels')}
                        </button>
                        <button
                          onClick={() => handleTestConnection(p.id)}
                          style={{
                            padding: '2px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            color: '#22c55e',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {t('settings.testConnection')}
                        </button>
                        <button
                          onClick={() => openEditDialog(p.id)}
                          style={{
                            padding: '2px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            color: 'var(--cb-text-secondary)',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          style={{
                            padding: '2px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            color: '#ff4d4f',
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,77,79,0.06)'; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--wb-color-text-disabled)' }}>
                      {(p.models || []).join(', ').substring(0, 80)}
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

    {/* Add/Edit Provider Dialog (outside main overlay to avoid nesting) */}
    {dialogOpen && (
      <div className="settings-overlay visible" style={{ zIndex: 210 }} onClick={() => setDialogOpen(false)}>
          <div
            className="settings-modal"
            style={{ width: 420, height: 'auto', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-main-header">
              <span className="settings-main-title">{editId ? t('settings.editModel') : t('settings.addModel')}</span>
              <button className="settings-close-btn" onClick={() => setDialogOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="settings-content">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Provider preset selector */}
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>供应商</div>
                  <select
                    className="setting-select"
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    <option value="">选择供应商...</option>
                    {PRESET_PROVIDERS.map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>{t('settings.modelName')}</div>
                  <input
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
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="例如: DeepSeek"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>模型 ID</div>
                  <input
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
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="如 deepseek-chat（多个用逗号分隔）"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>{t('settings.apiUrl')}</div>
                  <input
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
                    value={formData.base_url}
                    onChange={(e) => setFormData((p) => ({ ...p, base_url: e.target.value }))}
                    placeholder="https://api.example.com/v1"
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>{t('settings.apiKey')}</div>
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
                    value={formData.api_key}
                    onChange={(e) => setFormData((p) => ({ ...p, api_key: e.target.value }))}
                    placeholder="sk-..."
                  />
                </div>
                <div>
                  <div className="setting-label" style={{ marginBottom: 4 }}>{t('settings.protocol')}</div>
                  <select
                    className="setting-select"
                    value={formData.platform}
                    onChange={(e) => setFormData((p) => ({ ...p, platform: e.target.value }))}
                  >
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: '6px 16px',
                      borderRadius: 6,
                      fontSize: 13,
                      color: 'var(--cb-text-secondary)',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    重置
                  </button>
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
                    {t('chat.cancel')}
                  </button>
                  <button
                    onClick={handleSave}
                    style={{
                      padding: '6px 16px',
                      background: 'var(--cb-button-primary)',
                      color: '#fff',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {t('settings.save')}
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
