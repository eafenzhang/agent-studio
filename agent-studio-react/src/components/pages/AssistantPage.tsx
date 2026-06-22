import React, { useEffect, useState } from 'react';
import { systemApi, conversationApi, agentApi } from '../../services/api';
import { ChatInput } from '../ui/ChatInput';
import { useAppStore } from '../../stores/appStore';

interface BackendInfo {
  version: string;
  uptime: number;
  online: boolean;
  modelCount: number;
  conversationCount: number;
  agentCount: number;
}

export const AssistantPage: React.FC = () => {
  const [info, setInfo] = useState<BackendInfo>({
    version: '-',
    uptime: 0,
    online: false,
    modelCount: 0,
    conversationCount: 0,
    agentCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const openConversation = useAppStore((s) => s.openConversation);

  useEffect(() => {
    const load = async () => {
      try {
        const [sysInfo, providers, conversations, agents] = await Promise.allSettled([
          systemApi.info(),
          systemApi.providers(),
          conversationApi.list(),
          agentApi.list(),
        ]);

        const s = sysInfo.status === 'fulfilled' ? sysInfo.value : null;
        const m = providers.status === 'fulfilled' ? providers.value : [];
        const c = conversations.status === 'fulfilled' ? conversations.value : null;
        const a = agents.status === 'fulfilled' ? agents.value : [];

        setInfo({
          version: s?.arch || '?',
          uptime: 0,
          online: s !== null,
          modelCount: Array.isArray(m) ? m.length : 0,
          conversationCount: c?.total ?? (c as any)?.items?.length ?? 0,
          agentCount: Array.isArray(a) ? a.length : 0,
        });
      } catch {
        setInfo((prev) => ({ ...prev, online: false }));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSend = (content: string) => {
    if (!content.trim()) return;
    openConversation(content.slice(0, 20));
  };

  return (
    <div className="page active page-fade-in">
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
        {/* 后端状态卡片 */}
        <div style={{
          background: 'var(--cb-main-area-background)',
          border: '1px solid var(--cb-main-area-border-color)',
          borderRadius: 8, padding: 16, marginBottom: 12,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cb-text-primary)', marginBottom: 12 }}>
            {loading ? '连接中...' : info.online ? 'AionCore 运行正常' : 'AionCore 未连接'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
            <div>
              <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 2 }}>平台</div>
              <div style={{ fontWeight: 500 }}>{info.version}</div>
            </div>
            <div>
              <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 2 }}>工作目录</div>
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{info.online ? 'AionCore/data' : '-'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 2 }}>模型</div>
              <div style={{ fontWeight: 500 }}>{info.modelCount} 个可用</div>
            </div>
            <div>
              <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 2 }}>Agent</div>
              <div style={{ fontWeight: 500 }}>{info.agentCount} 个</div>
            </div>
            <div>
              <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 2 }}>对话</div>
              <div style={{ fontWeight: 500 }}>{info.conversationCount} 条</div>
            </div>
            <div>
              <div style={{ color: 'var(--cb-text-secondary)', marginBottom: 2 }}>状态</div>
              <div style={{
                fontWeight: 500,
                color: info.online ? 'var(--cb-switch-active-bg)' : 'var(--wb-color-text-disabled)',
              }}>
                {info.online ? '● 在线' : '○ 离线'}
              </div>
            </div>
          </div>
        </div>

        {/* 连接器状态 */}
        <div style={{
          background: 'var(--cb-main-area-background)',
          border: '1px solid var(--cb-main-area-border-color)',
          borderRadius: 8, padding: '12px 16px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 13, color: 'var(--cb-text-primary)', lineHeight: '19px' }}>
            {info.online
              ? 'AionCore 后端已就绪，可以开始对话或配置 Agent。'
              : 'AionCore 后端未启动，请启动后端服务后重试'}
          </div>
        </div>
      </div>
      <ChatInput rows={2} fullDropdowns={false} onSend={handleSend} />
    </div>
  );
};
