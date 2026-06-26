import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { Assistant } from '../types/api';
import { useAssistants, useCreateConversation } from '../hooks/use-api';
import { useUIStore } from '../stores/ui-store';
import { useChatStore } from '../stores/chat-store';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import * as api from '../lib/api';
import { splitTools, initToolCaches } from '../lib/tools';
import DOMPurify from 'dompurify';
import ChatInputPanel from '../components/chat/ChatInputPanel';

/** Categories for filtering assistant chips on the home page. */
const categories = ['全部', '代码', '写作', '分析', '设计'] as const;
type Category = (typeof categories)[number];

/** Hardcoded fallback chip data when no assistants are loaded from backend. */
const chipData: Record<string, Array<{ l: string; c: string; i: string }>> = {
  office: [
    { l: '数据仪表盘', c: '#e67e22', i: '数' },
    { l: 'AionUi 管家', c: '#3498db', i: 'A' },
    { l: '财务建模助手', c: '#95a5a6', i: '财' },
    { l: 'Excel 表格助手', c: '#27ae60', i: 'E' },
    { l: '日程管理助手', c: '#7f8c8d', i: '日' },
    { l: '邮件撰写助手', c: '#2980b9', i: '邮' },
    { l: '会议纪要助手', c: '#9b59b6', i: '会' },
    { l: '翻译润色助手', c: '#e74c3c', i: '翻' },
    { l: '文档整理助手', c: '#d35400', i: '文' },
    { l: '学术论文助手', c: '#1abc9c', i: '学' },
    { l: 'PPT 演示助手', c: '#f39c12', i: 'P' },
    { l: 'moltbook', c: '#d35400', i: 'm' },
  ],
  prototype: [
    { l: '产品需求分析', c: '#e74c3c', i: '需' },
    { l: '用户画像生成', c: '#9b59b6', i: '画' },
    { l: '信息架构设计', c: '#3498db', i: '架' },
    { l: 'Wireframe 生成', c: '#2ecc71', i: 'W' },
    { l: '交互原型助手', c: '#e67e22', i: '交' },
    { l: '流程图绘制', c: '#1abc9c', i: '流' },
    { l: 'PRD 撰写助手', c: '#34495e', i: 'PR' },
    { l: '竞品分析助手', c: '#f39c12', i: '竞' },
    { l: 'Beautiful Mermaid', c: '#27ae60', i: 'B' },
    { l: '原型评审助手', c: '#7f8c8d', i: '评' },
    { l: '可用性测试', c: '#2980b9', i: '测' },
    { l: 'moltbook', c: '#d35400', i: 'm' },
  ],
  creative: [
    { l: '品牌视觉设计', c: '#e74c3c', i: '品' },
    { l: '海报生成助手', c: '#9b59b6', i: '海' },
    { l: '配色方案生成', c: '#f1c40f', i: '配' },
    { l: 'Logo 设计助手', c: '#3498db', i: 'Lo' },
    { l: 'UI 组件设计', c: '#2ecc71', i: 'UI' },
    { l: '插画生成助手', c: '#e67e22', i: '插' },
    { l: '3D Morph PPT', c: '#9b59b6', i: '3' },
    { l: 'Morph PPT', c: '#e74c3c', i: 'M' },
    { l: '动效设计助手', c: '#1abc9c', i: '动' },
    { l: '设计系统规范', c: '#7f8c8d', i: '设' },
    { l: '图片处理助手', c: '#2980b9', i: '图' },
    { l: 'moltbook', c: '#d35400', i: 'm' },
  ],
};

/** Render an assistant's avatar, handling HTML/SVG, image URLs, and plain text. */
function renderChipAvatar(assistant: Assistant): string | { __html: string } {
  const avatar = assistant.avatar || '';
  if (avatar.startsWith('<')) {
    return { __html: DOMPurify.sanitize(avatar, { ALLOWED_TAGS: ['svg', 'img', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'text', 'tspan', 'use', 'clipPath'], ALLOWED_ATTR: ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'd', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'points', 'transform', 'style', 'src', 'alt', 'class', 'id', 'href', 'clip-path', 'color', 'opacity', 'xmlns', 'preserveAspectRatio'] }) };
  }
  if (avatar.startsWith('http') || avatar.startsWith('/')) {
    const src = avatar.startsWith('/') ? 'http://127.0.0.1:25808' + avatar : avatar;
    return {
      __html: `<img src="${src}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`,
    };
  }
  return avatar;
}

/** Get the display name for an assistant. */
function getAssistantName(a: Assistant): string {
  return (a.name_i18n && a.name_i18n['zh-CN']) || a.name || 'Unknown';
}

const MAX_VISIBLE_CHIPS = 8;

export default function HomePage() {
  const { t } = useTranslation();
  const { data: assistants, isLoading: assistantsLoading, error: assistantsError } = useAssistants();
  const addToast = useUIStore((s) => s.addToast);
  const isGenerating = useUIStore((s) => s.isGenerating);
  const selectedModel = useUIStore((s) => s.selectedModel);
  const selectedMode = useUIStore((s) => s.selectedMode);
  const selectedExpert = useUIStore((s) => s.selectedExpert);
  const selectedTools = useUIStore((s) => s.selectedTools);

  const [activeCategory, setActiveCategory] = useState<Category>('全部');
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const chipScrollRef = useRef<HTMLDivElement>(null);
  const createConv = useCreateConversation();
  const navigate = useNavigate();

  const scrollChips = useCallback((dir: number) => {
    chipScrollRef.current?.scrollBy({ left: dir * 200, behavior: 'smooth' });
  }, []);

  // Show a toast when backend is unreachable for assistants
  useEffect(() => {
    if (assistantsError) {
      addToast('无法加载专家列表，使用默认选择', 'info');
    }
  }, [assistantsError, addToast]);

  // Initialize tool caches for shared splitTools utility
  useEffect(() => {
    initToolCaches(
      () => api.getSkills().catch(() => []),
      () => api.getMcpServers().catch(() => [])
    );
  }, []);

  // ---- Filter assistants by active category ----
  const filteredAssistants = useMemo(() => {
    if (!assistants || assistants.length === 0) return null;
    if (activeCategory === '全部') return assistants;
    const cat = activeCategory.toLowerCase();
    return assistants.filter((a: Assistant) => {
      const tags: string[] = (a as any).tags || [];
      const name = getAssistantName(a).toLowerCase();
      const desc = ((a.description_i18n && a.description_i18n['zh-CN']) || a.description || '').toLowerCase();
      return (
        tags.some((t: string) => t.toLowerCase().includes(cat)) ||
        name.includes(cat) ||
        desc.includes(cat)
      );
    });
  }, [assistants, activeCategory]);

  // ---- Render assistant chips ----
  const renderChips = useCallback(() => {
    if (assistantsLoading) {
      return Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`skeleton-${i}`}
          className="chat-assistant-chip"
          style={{ pointerEvents: 'none', opacity: 0.5 }}
        >
          <div
            className="chat-assistant-chip-avatar"
            style={{ background: 'var(--cb-border)', animation: 'pulse 1.5s ease-in-out infinite' }}
          />
          <span
            className="chat-assistant-chip-label"
            style={{ background: 'var(--cb-border)', borderRadius: 4, width: 40, height: 10, animation: 'pulse 1.5s ease-in-out infinite' }}
          />
        </div>
      ));
    }

    if (filteredAssistants && filteredAssistants.length > 0) {
      const displayed = filteredAssistants.slice(0, MAX_VISIBLE_CHIPS);
      return displayed.map((a: Assistant) => {
        const name = getAssistantName(a);
        const initial = name.charAt(0);
        const color = '#6c4dff';
        const avatarContent = renderChipAvatar(a);

        return (
          <div
            key={a.id}
            className={`chat-assistant-chip ${selectedChip === a.id ? 'selected' : ''}`}
            onClick={() => setSelectedChip(a.id)}
          >
            {typeof avatarContent === 'object' ? (
              <div
                className="chat-assistant-chip-avatar"
                style={{ background: color, overflow: 'hidden' }}
                dangerouslySetInnerHTML={avatarContent}
              />
            ) : (
              <div className="chat-assistant-chip-avatar" style={{ background: color }}>
                {avatarContent || initial}
              </div>
            )}
            <span className="chat-assistant-chip-label">{name}</span>
          </div>
        );
      });
    }

    const fallbackKey = activeCategory === '全部' ? 'office' : activeCategory;
    const chips = chipData[fallbackKey] || chipData.office;
    return chips.map((c) => (
      <div
        key={c.l}
        className={`chat-assistant-chip ${selectedChip === c.l ? 'selected' : ''}`}
        onClick={() => setSelectedChip(c.l)}
      >
        <div className="chat-assistant-chip-avatar" style={{ background: c.c }}>
          {c.i}
        </div>
        <span className="chat-assistant-chip-label">{c.l}</span>
      </div>
    ));
  }, [filteredAssistants, activeCategory, selectedChip, assistantsLoading]);

  const categoryLabels: Record<Category, string> = {
    '全部': '全部',
    '代码': '代码',
    '写作': '写作',
    '分析': '分析',
    '设计': '设计',
  };

  // ---- Send handler: create conversation + navigate ----
  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) return;

      // Check backend health
      try {
        const healthy = await api.healthCheck();
        if (!healthy) {
          addToast('后端服务未连接，请检查 AionCore 是否已启动', 'warning');
          return;
        }
      } catch {
        addToast('后端服务未连接，请检查 AionCore 是否已启动', 'warning');
        return;
      }

      try {
        // Create conversation via REST API
        const conv = await createConv.mutateAsync({ title: trimmed.substring(0, 30) });
        const convId = conv.id;

        // Build message payload with selected options
        const payload: Parameters<typeof api.sendMessage>[1] = { content: trimmed };
        if (selectedModel) payload.model = selectedModel;
        if (selectedMode) payload.mode = selectedMode;
        // Action mode uses Aion CLI (ACP) automatically; other modes use selected expert
        if (selectedExpert && selectedMode !== 'action') payload.assistant_id = selectedExpert;
        // If action mode and a model is configured, set model for provider routing
        if (!payload.assistant_id && payload.model) {
          payload.assistant_id = payload.model;
        }

        if (selectedTools.length > 0) {
          const categorized = splitTools(selectedTools);
          if (categorized.inject_skills) payload.inject_skills = categorized.inject_skills;
          if (categorized.mcp_tools) payload.mcp_tools = categorized.mcp_tools;
          if (categorized.tools) payload.tools = categorized.tools;
        }

        const msg = await api.sendMessage(convId, payload);
        const messageId = (msg as any)?.msg_id || (msg as any)?.id;

        // Initialize streaming state in chatStore so ChatPage picks it up
        useChatStore.getState().startStreaming(convId, messageId);

        // Navigate to chat page
        navigate(`/chat/${convId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : '未知错误';
        addToast('发送失败: ' + message, 'error');
      }
    },
    [isGenerating, createConv, navigate, addToast, selectedModel, selectedMode, selectedExpert, selectedTools],
  );

  return (
    <div className="page active">
      {/* Welcome Section */}
      <div className="chat-welcome">
        <div className="chat-welcome-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--cb-button-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <div className="chat-welcome-title">Agent Studio</div>
        <div className="chat-welcome-desc">你的 AI 创作工作台，输入需求开始对话</div>

        {/* Category Chips */}
        <div className="chat-welcome-chips">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chat-welcome-chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* Assistant Chips Row */}
      <div className="chat-assistant-chips">
        <button className="chat-chip-scroll-btn" onClick={() => scrollChips(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="chat-assistant-chips-scroll" ref={chipScrollRef}>
          {renderChips()}
        </div>
        <button className="chat-chip-scroll-btn" onClick={() => scrollChips(1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Chat Input Panel (shared component) */}
      <ChatInputPanel onSend={handleSend} isGenerating={isGenerating} />
    </div>
  );
}
