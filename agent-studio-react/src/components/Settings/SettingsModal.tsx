import React, { useState, useEffect, useCallback } from 'react';
import { settingsTitles } from '../../data/constants';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const settingsNavItems = [
  {
    id: 'general',
    label: '系统',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09" />
      </svg>
    ),
  },
  {
    id: 'model',
    label: '模型',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'memory',
    label: '记忆',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: 'update',
    label: '更新',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
    ),
  },
];

const ToggleButton: React.FC<{ defaultOn?: boolean; onChange?: (on: boolean) => void }> = ({ defaultOn = false, onChange }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <button className={`setting-toggle${on ? ' on' : ''}`} onClick={() => { const v = !on; setOn(v); onChange?.(v); }} />
  );
};

// ── Provider 卡片（含测试连接、刷新模型）──
const ProviderCard: React.FC<{ provider: any; onDelete: (id: string) => void; onRefresh: () => void }> = ({ provider: p, onDelete, onRefresh }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { systemApi } = await import('../../services/api');
      const r = await systemApi.testConnection(p.base_url, p.api_key || '');
      setTestResult(r ? `✅ 连接成功 (${r.protocol})` : '❌ 连接失败');
    } catch { setTestResult('❌ 连接异常'); }
    setTesting(false);
  };

  const handleFetchModels = async () => {
    setFetching(true);
    try {
      const { systemApi } = await import('../../services/api');
      const r = await systemApi.fetchModels(p.id);
      if (r && r.models && r.models.length > 0) {
        setTestResult(`✅ 获取到 ${r.models.length} 个模型`);
        onRefresh();
      } else {
        setTestResult('⚠️ 未获取到模型');
      }
    } catch { setTestResult('❌ 获取失败'); }
    setFetching(false);
  };

  return (
    <div key={p.id} style={{ padding: 12, background: 'var(--cb-main-area-background)', borderRadius: 8, border: `1px solid ${p.enabled ? 'var(--cb-main-area-border-color)' : 'var(--cb-border-subtle)'}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
          <span style={{ fontSize: 11, color: 'var(--cb-text-secondary)', marginLeft: 8 }}>{p.platform}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={handleTest} disabled={testing} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--cb-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cb-text-secondary)' }}>
            {testing ? '测试中...' : '测试连接'}
          </button>
          <button onClick={handleFetchModels} disabled={fetching} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, border: '1px solid var(--cb-border)', background: 'transparent', cursor: 'pointer', color: 'var(--cb-text-secondary)' }}>
            {fetching ? '获取中...' : '刷新模型'}
          </button>
          <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: p.enabled ? 'rgba(108,77,255,0.08)' : 'var(--cb-tag-background)', color: p.enabled ? 'var(--cb-button-primary)' : 'var(--cb-text-secondary)' }}>{p.enabled ? '已启用' : '已停用'}</span>
          <button onClick={() => onDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', padding: 2 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="14" height="14" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)', marginBottom: 4, fontFamily: 'var(--cb-font-mono)', wordBreak: 'break-all' }}>{p.base_url}</div>
      {testResult && <div style={{ fontSize: 11, marginBottom: 4, color: testResult.includes('✅') ? 'var(--cb-switch-active-bg)' : '#e65100' }}>{testResult}</div>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(p.models || []).map((m: string) => (
          <span key={m} style={{ padding: '1px 6px', background: 'var(--cb-tag-background)', borderRadius: 4, fontSize: 11, color: 'var(--cb-text-secondary)' }}>{m}</span>
        ))}
      </div>
    </div>
  );
};

// ── 模型设置内容（从 AionCore Provider API 加载）──
// ── 国内主流供应商预设 ──
const VENDOR_PRESETS: Record<string, { platform: string; base_url: string; models: string }> = {
  deepseek:    { platform: 'openai', base_url: 'https://api.deepseek.com/v1', models: 'deepseek-chat,deepseek-reasoner,deepseek-coder,deepseek-chat-v4,deepseek-reasoner-v4,deepseek-coder-v4,deepseek-v3-241226,deepseek-r1-250120' },
  zhipu:       { platform: 'openai', base_url: 'https://open.bigmodel.cn/api/paas/v4', models: 'GLM-4-Plus,GLM-4-AirX,GLM-4-Air,GLM-4-Flash,GLM-4V-Plus,GLM-4V,CogView-3' },
  alibaba:     { platform: 'openai', base_url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', models: 'qwen-max,qwen-plus,qwen-turbo,qwen2.5-72b-instruct,qwen2.5-32b-instruct,qwen2.5-14b-instruct,qwen2.5-7b-instruct,qwen2.5-coder-32b,qwen2.5-coder-14b,qwen-vl-max,qwen-vl-plus,qwen2.5-vl-72b' },
  baidu:       { platform: 'openai', base_url: 'https://aip.baidubce.com/rpc/2.0/ai/custom/v1/wenxinworkspace/chat', models: 'ERNIE-4.0-8K,ERNIE-3.5-8K,ERNIE-Speed-8K,ERNIE-Lite-8K,ERNIE-Tiny-8K,ERNIE-4.0-Turbo-8K' },
  xfyun:       { platform: 'openai', base_url: 'https://spark-api.xf-yun.com/v3.5/chat', models: 'spark-4.0,spark-3.5,spark-3.1,spark-lite,spark-pro,spark-max,spark-ultra' },
  doubao:      { platform: 'openai', base_url: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', models: 'doubao-pro-32k,doubao-pro-128k,doubao-pro-256k,doubao-lite-32k,doubao-lite-128k,deepseek-r1-250120,deepseek-v3-241226' },
  moonshot:    { platform: 'openai', base_url: 'https://api.moonshot.cn/v1', models: 'moonshot-v1-8k,moonshot-v1-32k,moonshot-v1-128k,moonshot-v1-auto' },
  minimax:     { platform: 'openai', base_url: 'https://api.minimax.chat/v1', models: 'MiniMax-Text-01,abab6.5s,abab6.5g,abab5.5,abab5.5s,abab6.5t-chat' },
  lingyi:      { platform: 'openai', base_url: 'https://api.lingyiwanwu.com/v1', models: 'yi-large,yi-medium,yi-spark,yi-vision,yi-large-turbo,yi-large-rag,yi-large-fc' },
  baichuan:    { platform: 'openai', base_url: 'https://api.baichuan-ai.com/v1', models: 'Baichuan4,Baichuan4-Turbo,Baichuan3-Turbo,Baichuan3-Lite' },
  stepfun:     { platform: 'openai', base_url: 'https://api.stepfun.com/v1', models: 'step-2-16k,step-1-8k,step-1-32k,step-1-128k,step-1v-8k,step-1x-32k,step-2-16k-nightly' },
  tencent:     { platform: 'openai', base_url: 'https://api.lkeap.cloud.tencent.com/v1', models: 'deepseek-v3-671b,deepseek-r1-671b,hunyuan-large,hunyuan-large-long,glm-4-plus,hunyuan-turbo' },
};

const VENDOR_LABELS: Record<string, string> = {
  deepseek: 'DeepSeek', zhipu: '智谱 AI (GLM)', alibaba: '阿里云 (通义千问)',
  baidu: '百度 (文心)', xfyun: '讯飞 (星火)', doubao: '字节 (豆包)',
  moonshot: '月之暗面 (Moonshot)', minimax: 'MiniMax (abab)',
  lingyi: '零一万物 (Yi)', baichuan: '百川智能', stepfun: '阶跃星辰 (Step)',
  tencent: '腾讯云 (混元)',
};

const ModelSettingsContent: React.FC = () => {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendor, setVendor] = useState('');
  const [form, setForm] = useState({ name: '', platform: 'openai', base_url: '', api_key: '', models: '' });

  const loadProviders = () => {
    import('../../services/api').then(({ systemApi }) => {
      systemApi.providers().then((data) => {
        if (data) setProviders(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  };

  useEffect(() => { loadProviders(); }, []);

  const selectVendor = (key: string) => {
    setVendor(key);
    const p = VENDOR_PRESETS[key];
    if (p) {
      setForm({ name: VENDOR_LABELS[key], platform: p.platform, base_url: p.base_url, api_key: form.api_key, models: p.models });
    }
  };

  const handleCreate = async () => {
    if (!form.name || !form.base_url) return;
    const models = form.models.split(',').map(s => s.trim()).filter(Boolean);
    const { systemApi } = await import('../../services/api');
    await systemApi.createProvider({
      name: form.name, platform: form.platform,
      base_url: form.base_url, api_key: form.api_key, models, enabled: true,
    });
    setShowForm(false);
    setVendor('');
    setForm({ name: '', platform: 'openai', base_url: '', api_key: '', models: '' });
    loadProviders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除此 Provider？')) return;
    const { systemApi } = await import('../../services/api');
    await systemApi.deleteProvider(id);
    loadProviders();
  };

  if (loading) return <div style={{ padding: 16, textAlign: 'center', color: 'var(--cb-text-secondary)', fontSize: 13 }}>加载中...</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="setting-label">模型提供商 ({providers.length})</div>
          <div className="setting-desc">管理 AI 模型服务。</div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setVendor(''); }} style={{
          padding: '6px 14px', background: 'var(--cb-button-primary)', color: '#fff',
          borderRadius: 6, fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer',
        }}>{showForm ? '取消' : '+ 添加'}</button>
      </div>

      {showForm && (
        <div style={{ padding: 12, background: 'var(--cb-main-area-background)', borderRadius: 8, border: '1px solid var(--cb-main-area-border-color)', marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cb-text-secondary)' }}>选择供应商（自动填充最新 URL 和模型 ID）</div>
          <select value={vendor} onChange={e => selectVendor(e.target.value)} style={inputStyle}>
            <option value="">-- 手动输入 --</option>
            {Object.entries(VENDOR_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <div style={{ height: 1, background: 'var(--cb-border)', margin: '4px 0' }} />
          <input placeholder="名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
          <input placeholder="Base URL（已自动填充）" value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} style={{ ...inputStyle, color: vendor ? 'var(--cb-text-secondary)' : undefined }} />
          <input placeholder="API Key" type="password" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} style={inputStyle} />
          <input placeholder="模型列表（逗号分隔，已自动填充）" value={form.models} onChange={e => setForm({ ...form, models: e.target.value })} style={{ ...inputStyle, color: vendor ? 'var(--cb-text-secondary)' : undefined }} />
          <button onClick={handleCreate} style={{
            padding: '6px 14px', background: 'var(--cb-button-primary)', color: '#fff',
            borderRadius: 6, fontSize: 12, border: 'none', cursor: 'pointer', alignSelf: 'flex-end',
          }}>保存</button>
        </div>
      )}

      {providers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--wb-color-text-disabled)', fontSize: 13 }}>
          暂无 Provider，点击上方"添加"按钮创建
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {providers.map((p: any) => (
            <ProviderCard key={p.id} provider={p} onDelete={handleDelete} onRefresh={loadProviders} />
          ))}
        </div>
      )}
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--cb-border)',
  background: '#fff', outline: 'none', fontFamily: 'var(--cb-font-family)',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [activePage, setActivePage] = useState('general');

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const switchPage = (id: string) => {
    setActivePage(id);
  };

  return (
    <div className={`settings-overlay${open ? ' visible' : ''}`} onClick={handleOverlayClick}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-sidebar">
          <div className="settings-sidebar-title">系统设置</div>
          {settingsNavItems.map(item => (
            <div
              key={item.id}
              className={`settings-nav-item${activePage === item.id ? ' active' : ''}`}
              onClick={() => switchPage(item.id)}
            >
              {item.icon}
              {item.label}
            </div>
          ))}
        </div>
        <div className="settings-main">
          <div className="settings-main-header">
            <div className="settings-main-title">{settingsTitles[activePage] || '设置'}</div>
            <button className="settings-close-btn" onClick={onClose}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="settings-content">
            {/* General Settings */}
            <div className={`settings-page${activePage === 'general' ? ' active' : ''}`}>
              <div className="setting-group">
                <div className="setting-label">显示语言</div>
                <div className="setting-desc">设置应用界面的显示语言。</div>
                <select className="setting-select">
                  <option>中文(简体)</option>
                  <option>English</option>
                </select>
              </div>
              <div className="setting-group">
                <div className="setting-control">
                  <div>
                    <div className="setting-label">简洁模式</div>
                    <div className="setting-desc" style={{ marginBottom: 0 }}>简化对话界面显示。</div>
                  </div>
                  <ToggleButton defaultOn />
                </div>
              </div>
              <div className="setting-group">
                <div className="setting-label">发送消息</div>
                <div className="setting-desc">聊天输入框中发送消息的快捷键。</div>
                <select className="setting-select">
                  <option>Enter</option>
                  <option>Ctrl+Enter</option>
                </select>
              </div>
              <div className="setting-group">
                <div className="setting-control">
                  <div>
                    <div className="setting-label">技能自动更新</div>
                    <div className="setting-desc" style={{ marginBottom: 0 }}>自动更新已安装技能为最新版本。</div>
                  </div>
                  <ToggleButton defaultOn />
                </div>
              </div>
              <div className="setting-group">
                <div className="setting-control">
                  <div>
                    <div className="setting-label">锁屏远程</div>
                    <div className="setting-desc" style={{ marginBottom: 0 }}>锁屏状态下电脑不进入休眠。</div>
                  </div>
                  <ToggleButton />
                </div>
              </div>
            </div>

            {/* Model Settings */}
            <div className={`settings-page${activePage === 'model' ? ' active' : ''}`}>
              <ModelSettingsContent />
            </div>

            {/* Memory Settings */}
            <div className={`settings-page${activePage === 'memory' ? ' active' : ''}`}>
              <div className="setting-group">
                <div className="setting-label">对话记忆</div>
                <div className="setting-desc">AI 助手会记住以下信息。</div>
              </div>
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--cb-border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>用户偏好</span>
                  <span style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)' }}>3 天前</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)' }}>偏好中文交互，回复风格简洁专业。</div>
              </div>
              <div style={{ padding: '12px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>项目上下文</span>
                  <span style={{ fontSize: 11, color: 'var(--wb-color-text-disabled)' }}>7 天前</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--cb-text-secondary)' }}>当前主要项目为品牌官网重设计。</div>
              </div>
            </div>

            {/* Update Settings */}
            <div className={`settings-page${activePage === 'update' ? ' active' : ''}`}>
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>v5.1.3</div>
                <div style={{ fontSize: 13, color: 'var(--cb-switch-active-bg)', marginBottom: 16 }}>已是最新版本</div>
                <button style={{ padding: '8px 24px', background: 'var(--cb-button-primary)', color: '#fff', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>检查更新</button>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--wb-color-text-disabled)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>最近更新</div>
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
  );
};
