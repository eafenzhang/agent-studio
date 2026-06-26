/**
 * ChatInputPanel — shared input area used by HomePage and ChatPage/ChatInput.
 *
 * Eliminates the ~400 lines of duplicated toolbar/dropdown/textarea code
 * between HomePage.tsx and the old ChatInput.tsx.
 *
 * Features:
 * - Mode selector (行动 / 规划 / 研究)
 * - Model selector (from configured providers)
 * - Tool selector (Skills + MCP toggles)
 * - Expert selector (from assistants)
 * - Attach menu (with actual file upload or "developing" toast)
 * - Textarea with send-shortcut support
 * - Send / Stop-generating button
 * - Drag-and-drop zone for file upload
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/ui-store';
import { useDropdown } from '../../hooks/use-dropdown';
import { useAssistants, useProviders, useSkills, useMcpServers } from '../../hooks/use-api';
import * as api from '../../lib/api';
import { updateToolCaches } from '../../lib/tools';

// ===================================================================
// Types
// ===================================================================
export interface SendPayloadOptions {
  model?: string;
  mode?: string;
  assistant_id?: string;
  inject_skills?: string[];
  mcp_tools?: string[];
  tools?: string[];
}

export interface ChatInputPanelProps {
  /** Called when the user wants to send a message. */
  onSend: (text: string) => void;
  /** Called when the user wants to cancel the current generation. */
  onCancel?: () => void;
  /** Whether the AI is currently generating a response. */
  isGenerating?: boolean;
  /** Override the placeholder text. */
  placeholder?: string;
  /** Initial text to populate the textarea (for editing). */
  initialText?: string;
  /** Called when editing is cancelled. */
  onClearEdit?: () => void;
  /** Expert category filter (passed from parent that renders the chips). */
  expertCategory?: ExpertCategory;
}

export { CATEGORIES };
export type { ExpertCategory };

// ===================================================================
// Constants
// ===================================================================

const FALLBACK_MODELS = [
  'GPT-4o', 'GPT-4o-mini', 'o3-mini',
  'deepseek-chat', 'deepseek-reasoner',
  'qwen-max-latest', 'glm-4-plus', 'moonshot-v1-128k',
];

const MODE_OPTIONS: Array<{ label: string; value: string; description: string }> = [
  { label: '行动', value: 'action', description: '工作区内行动，使用工具需确认' },
  { label: '规划', value: 'plan', description: '适合长任务制定计划，需审批执行' },
  { label: '自主', value: 'research', description: '完全自主控制，无需人工干预' },
];

const CATEGORIES = ['全部', '代码', '写作', '分析', '设计'] as const;
type ExpertCategory = (typeof CATEGORIES)[number];

/** Classify an expert into a category by name/description matching. */
function classifyExpert(name: string, desc: string, tags?: string[]): ExpertCategory {
  const text = `${name} ${desc} ${(tags || []).join(' ')}`.toLowerCase();
  if (/代码|code|部署|编程|开发|工程|openclaw|cowork|aionui|文件规划|技术/i.test(text)) return '代码';
  if (/写作|文案|论文|文章|内容|招聘|发布|角色扮演|故事|word|文档/i.test(text)) return '写作';
  if (/分析|数据|仪表盘|财务|建模|ppt|演示|幻灯片|金融|模型/i.test(text)) return '分析';
  if (/设计|ui|ux|mermaid|morph|3d|游戏|界面|视觉|路演|beautiful/i.test(text)) return '设计';
  return '全部';
}

/** Get the display name for an assistant. */
function getAssistantName(a: { name?: string; name_i18n?: Record<string, string> }): string {
  return (a.name_i18n && a.name_i18n['zh-CN']) || a.name || 'Unknown';
}

// ===================================================================
// Component
// ===================================================================

export default function ChatInputPanel({
  onSend,
  onCancel,
  isGenerating = false,
  placeholder: placeholderProp,
  initialText,
  onClearEdit,
  expertCategory: expertCategoryProp,
}: ChatInputPanelProps) {
  const { t } = useTranslation();

  // ---- External data ----
  const { data: assistants } = useAssistants();
  const { data: providers } = useProviders();
  const { data: skills } = useSkills();
  const { data: mcpServers } = useMcpServers();

  // ---- UI store ----
  const addToast = useUIStore((s) => s.addToast);
  const backendOk = useUIStore((s) => s.connectionStatus === 'connected');
  const selectedModel = useUIStore((s) => s.selectedModel);
  const setSelectedModel = useUIStore((s) => s.setSelectedModel);
  const selectedMode = useUIStore((s) => s.selectedMode);
  const setSelectedMode = useUIStore((s) => s.setSelectedMode);
  const selectedExpert = useUIStore((s) => s.selectedExpert);
  const setSelectedExpert = useUIStore((s) => s.setSelectedExpert);
  const selectedTools = useUIStore((s) => s.selectedTools);
  const setSelectedTools = useUIStore((s) => s.setSelectedTools);
  const sendShortcut = useUIStore((s) => s.sendShortcut);

  // ---- Local state ----
  const [text, setText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<Array<{ name: string; path: string; type: 'file' | 'image' }>>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const dropdown = useDropdown();
  const isEditMode = initialText !== undefined;
  const [toolTab, setToolTab] = useState<'skill' | 'mcp'>('skill');

  // Derived tool lists for tabbed display
  const filteredSkills = useMemo(() => {
    if (!skills || skills.length === 0) return [];
    return skills.filter((s) => s.id).map((s) => ({ id: s.id, label: s.name || s.id, type: 'skill' as const }));
  }, [skills]);

  const filteredMcp = useMemo(() => {
    if (!mcpServers || mcpServers.length === 0) return [];
    return mcpServers.filter((m) => m.id).map((m) => ({ id: m.id, label: m.name || m.id, type: 'mcp' as const }));
  }, [mcpServers]);

  // Populate textarea when entering edit mode
  useEffect(() => {
    if (initialText !== undefined) {
      setText(initialText);
      // Focus the textarea
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [initialText]);

  // ---- Derived data ----
  const currentModeLabel = MODE_OPTIONS.find((m) => m.value === selectedMode)?.label ?? MODE_OPTIONS[0].label;

  const models = useMemo(() => {
    if (!providers || providers.length === 0) return FALLBACK_MODELS;
    const fromProviders = providers.flatMap((p) => p.models || []).filter(Boolean);
    if (fromProviders.length === 0) return FALLBACK_MODELS;
    return Array.from(new Set(fromProviders));
  }, [providers]);

  // ---- Expert category filter (from parent component's chips)
  const [localExpertCategory, setLocalExpertCategory] = useState<ExpertCategory>('全部');
  const expertCategory = expertCategoryProp ?? localExpertCategory;

  const expertOptions = useMemo(() => {
    if (!assistants || assistants.length === 0) return [];
    // Filter out ACP tools (source === 'generated')
    let list = assistants.filter((a) => a.source !== 'generated');
    if (list.length === 0) return [];

    // Apply category filter
    if (expertCategory !== '全部') {
      list = list.filter((a) => {
        const name = getAssistantName(a);
        const desc = a.description || '';
        const tags = (a as any).tags || [];
        return classifyExpert(name, desc, tags) === expertCategory;
      });
    }
    // If filtered list is empty, fall back to showing all
    const displayList = list.length > 0 ? list : assistants.filter((a) => a.source !== 'generated');

    return displayList.slice(0, 12).map((a) => ({
      id: a.id,
      name: getAssistantName(a),
    }));
  }, [assistants, expertCategory]);

  // ACP (Agent Control Plane) tools — Aion CLI, Hermes, OpenCode
  // These are system-level agents with source === 'generated'
  const acpOptions = useMemo(() => {
    if (!assistants || assistants.length === 0) return [{ id: 'bare:632f31d2', name: 'Aion CLI' }];
    const acpList = assistants.filter((a) => a.source === 'generated');
    if (acpList.length === 0) return [{ id: 'bare:632f31d2', name: 'Aion CLI' }];
    return acpList.map((a) => ({
      id: a.id,
      name: getAssistantName(a),
    }));
  }, [assistants]);

  // Auto-select Aion CLI on first load
  const [acpInitialized, setAcpInitialized] = useState(false);
  useEffect(() => {
    if (!acpInitialized && acpOptions.length > 0) {
      const aionCli = acpOptions.find((a) => /aion/i.test(a.name));
      if (aionCli) {
        setSelectedExpert(aionCli.id);
      } else if (acpOptions[0]) {
        setSelectedExpert(acpOptions[0].id);
      }
      setAcpInitialized(true);
    }
  }, [acpOptions, acpInitialized, setSelectedExpert]);

  // ===============================================================
  // Auto-resize textarea
  // ===============================================================

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
    }
  }, [text]);

  // ===============================================================
  // Handlers
  // ===============================================================

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed && attachedFiles.length === 0) {
      addToast('请输入消息或添加文件', 'warning');
      return;
    }
    if (!backendOk) {
      addToast(t('common.backendDisconnected'), 'warning');
      return;
    }

    // Build message content including file references
    let messageText = trimmed;
    if (attachedFiles.length > 0) {
      const fileRefs = attachedFiles.map((f) => {
        if (f.type === 'image') return `[图片: ${f.path}]`;
        return `[文件: ${f.path}]`;
      }).join('\n');
      messageText = messageText ? `${messageText}\n\n${fileRefs}` : fileRefs;
    }

    setText('');
    setAttachedFiles([]);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onClearEdit?.();
    onSend(messageText);
  }, [text, attachedFiles, backendOk, addToast, t, onSend, onClearEdit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey) return;
      const shouldSend =
        sendShortcut === 'enter' || ((e.ctrlKey || e.metaKey) && sendShortcut === 'ctrl_enter');
      if (shouldSend) {
        e.preventDefault();
        if (isGenerating) {
          onCancel?.();
        } else {
          handleSend();
        }
      }
    },
    [handleSend, onCancel, sendShortcut, isGenerating],
  );

  const handleToolToggle = useCallback(
    (toolId: string) => {
      setSelectedTools(
        selectedTools.includes(toolId)
          ? selectedTools.filter((t) => t !== toolId)
          : [...selectedTools, toolId],
      );
    },
    [selectedTools, setSelectedTools],
  );

  const handleAttach = useCallback(
    (action: 'image' | 'file') => {
      dropdown.close();
      if (action === 'image') {
        imageInputRef.current?.click();
      } else {
        fileInputRef.current?.click();
      }
    },
    [dropdown],
  );

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'file' | 'image') => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be picked again
    e.target.value = '';

    // Read file content
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (!content) return;

      // For images, strip the data URL prefix to get raw base64
      let fileContent = content;
      if (fileType === 'image') {
        const commaIdx = content.indexOf(',');
        if (commaIdx >= 0) {
          fileContent = content.substring(commaIdx + 1);
        }
      }

      // Write file to workspace via backend
      const workspacePath = `uploads/${Date.now()}-${file.name}`;
      try {
        await api.writeFile({ path: workspacePath, content: fileContent });
        setAttachedFiles((prev) => [...prev, { name: file.name, path: workspacePath, type: fileType }]);
        addToast(`已添加文件: ${file.name}`, 'success');
      } catch (err) {
        // If backend write fails, still attach via path hint
        setAttachedFiles((prev) => [...prev, { name: file.name, path: file.name, type: fileType }]);
        addToast('无法上传到工作区，将以本地文件名引用', 'warning');
      }
    };
    reader.onerror = () => {
      addToast('读取文件失败', 'error');
    };

    if (fileType === 'image') {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }, [addToast]);

  const handleRemoveFile = useCallback((path: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.path !== path));
  }, []);

  // Keep tool caches in sync with latest skills/MCP data
  useEffect(() => {
    if (skills && mcpServers) {
      updateToolCaches(skills, mcpServers);
    }
  }, [skills, mcpServers]);

  // We expose selected state directly via the stores, so parent components
  // can read useUIStore selectors. No need to pass them through props.

  const placeholder = placeholderProp ?? (isEditMode
    ? '编辑消息... (Enter 发送)'
    : (sendShortcut === 'ctrl_enter' ? '输入消息... (Ctrl+Enter 发送, Shift+Enter 换行)' : '输入消息... (Enter 发送, Shift+Enter 换行)'));

  // ===============================================================
  // Render
  // ===============================================================

  return (
    <div className="chat-input-area" ref={dropdown.ref}>
      {/* Edit mode banner */}
      {isEditMode && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            background: 'rgba(108,77,255,0.06)',
            borderBottom: '1px solid rgba(108,77,255,0.12)',
            fontSize: 12,
            color: 'var(--cb-button-primary)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span style={{ flex: 1 }}>正在编辑消息</span>
          <button
            onClick={() => { setText(''); onClearEdit?.(); }}
            style={{ padding: '2px 8px', fontSize: 12, borderRadius: 4, color: 'var(--cb-text-secondary)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            取消
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelected(e, 'file')}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelected(e, 'image')}
      />

      {/* Attached file chips */}
      {attachedFiles.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '6px 12px 0', flexWrap: 'wrap' }}>
          {attachedFiles.map((f) => (
            <div
              key={f.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                background: f.type === 'image' ? 'rgba(108,77,255,0.08)' : 'var(--cb-main-area-background)',
                border: '1px solid var(--cb-border-subtle)',
                color: 'var(--cb-text-secondary)',
              }}
            >
              {f.type === 'image' ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
              <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <button
                onClick={() => handleRemoveFile(f.path)}
                style={{ padding: 0, display: 'flex', color: 'var(--wb-color-text-disabled)', fontSize: 14, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Attachments area (placeholder for future file chips) */}
      <div className="chat-input-content">
        <div className="chat-input-main">
          <textarea
            ref={textareaRef}
            className="chat-input-textarea"
            rows={2}
            placeholder={placeholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            style={isGenerating ? { opacity: 0.5 } : undefined}
          />
          <div className="chat-input-toolbar">
            {/* ===== Plus / Attach ===== */}
            <div className="chat-dropdown">
              <button
                className="chat-toolbar-plus"
                aria-label="添加"
                onClick={() => dropdown.toggle('attach')}
                disabled={isGenerating}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <div className={`chat-dropdown-menu ${dropdown.isOpen('attach') ? 'open' : ''}`}>
                <div className="chat-dropdown-item" onClick={() => handleAttach('image')}>
                  <span className="chat-dropdown-item-label">上传图片</span>
                </div>
                <div className="chat-dropdown-item" onClick={() => handleAttach('file')}>
                  <span className="chat-dropdown-item-label">上传文件</span>
                </div>
              </div>
            </div>

            {/* ===== Mode ===== */}
            <div className="chat-dropdown">
              <button
                className="chat-toolbar-btn chat-toolbar-btn-primary"
                onClick={() => dropdown.toggle('mode')}
                disabled={isGenerating}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                {currentModeLabel}
              </button>
              <div className={`chat-dropdown-menu chat-dropdown-menu-wide ${dropdown.isOpen('mode') ? 'open' : ''}`}>
                {MODE_OPTIONS.map((m) => (
                  <div
                    key={m.value}
                    className={`chat-dropdown-item ${selectedMode === m.value ? 'active' : ''}`}
                    onClick={() => { setSelectedMode(m.value); dropdown.close(); }}
                    style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '8px 14px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                      <span className="chat-dropdown-item-label">{m.label}</span>
                      <svg className="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="chat-dropdown-item-desc">{m.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ===== Model ===== */}
            <div className="chat-dropdown">
              <button
                className="chat-toolbar-btn"
                onClick={() => dropdown.toggle('model')}
                disabled={isGenerating}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                {selectedModel || 'GPT-4o'}
              </button>
              <div className={`chat-dropdown-menu ${dropdown.isOpen('model') ? 'open' : ''}`}>
                {models.map((m) => (
                  <div
                    key={m}
                    className={`chat-dropdown-item ${selectedModel === m || (!selectedModel && m === 'GPT-4o') ? 'active' : ''}`}
                    onClick={() => { setSelectedModel(m); dropdown.close(); }}
                  >
                    <span className="chat-dropdown-item-label">{m}</span>
                    <svg className="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* ===== Tools ===== */}
            <div className="chat-dropdown">
              <button
                className="chat-toolbar-btn"
                onClick={() => dropdown.toggle('tool')}
                disabled={isGenerating}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
                工具
                {selectedTools.length > 0 && <span className="chat-toolbar-badge">{selectedTools.length}</span>}
              </button>
              <div className={`chat-dropdown-menu chat-dropdown-menu-wide ${dropdown.isOpen('tool') ? 'open' : ''}`} style={{ minWidth: 240 }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--cb-border-subtle)', marginBottom: 2 }}>
                  <button
                    style={{
                      flex: 1, padding: '7px 8px 5px', fontSize: 12, fontWeight: toolTab === 'skill' ? 600 : 400,
                      color: toolTab === 'skill' ? 'var(--cb-button-primary)' : 'var(--cb-text-secondary)',
                      border: 'none', borderBottom: toolTab === 'skill' ? '2px solid var(--cb-button-primary)' : '2px solid transparent',
                      background: 'transparent', cursor: 'pointer',
                    }}
                    onClick={() => setToolTab('skill')}
                  >
                    技能 {filteredSkills.length > 0 && `(${filteredSkills.length})`}
                  </button>
                  <button
                    style={{
                      flex: 1, padding: '7px 8px 5px', fontSize: 12, fontWeight: toolTab === 'mcp' ? 600 : 400,
                      color: toolTab === 'mcp' ? 'var(--cb-button-primary)' : 'var(--cb-text-secondary)',
                      border: 'none', borderBottom: toolTab === 'mcp' ? '2px solid var(--cb-button-primary)' : '2px solid transparent',
                      background: 'transparent', cursor: 'pointer',
                    }}
                    onClick={() => setToolTab('mcp')}
                  >
                    MCP {filteredMcp.length > 0 && `(${filteredMcp.length})`}
                  </button>
                </div>
                {/* List */}
                <div style={{ maxHeight: 260, overflowY: 'auto', padding: '2px 0' }}>
                  {(toolTab === 'skill' ? filteredSkills : filteredMcp).length > 0 ? (
                    (toolTab === 'skill' ? filteredSkills : filteredMcp).map((tool) => (
                      <div
                        key={tool.id}
                        className={`chat-dropdown-item ${selectedTools.includes(tool.id) ? 'active' : ''}`}
                        onClick={() => handleToolToggle(tool.id)}
                      >
                        <span className="chat-dropdown-item-label">{tool.label}</span>
                        <span className="chat-dropdown-item-hint">{toolTab === 'mcp' ? 'MCP' : 'Skill'}</span>
                        <svg className="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--wb-color-text-disabled)' }}>
                      {toolTab === 'skill' ? '暂无可用技能' : '暂无 MCP 服务器'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== ACP (Agent Control Plane) — Aion CLI / Hermes / OpenCode ===== */}
            <div className="chat-dropdown">
              <button
                className="chat-toolbar-btn"
                onClick={() => dropdown.toggle('acp')}
                disabled={isGenerating}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                {selectedExpert
                  ? (acpOptions.find((e) => e.id === selectedExpert)?.name || 'Aion CLI')
                  : 'ACP'}
              </button>
              <div className={`chat-dropdown-menu ${dropdown.isOpen('acp') ? 'open' : ''}`}>
                {acpOptions.length > 0 ? (
                  acpOptions.map((acp) => (
                    <div
                      key={acp.id}
                      className={`chat-dropdown-item ${selectedExpert === acp.id ? 'active' : ''}`}
                      onClick={() => { setSelectedExpert(acp.id); dropdown.close(); }}
                    >
                      <span className="chat-dropdown-item-label">{acp.name}</span>
                      <svg className="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  ))
                ) : (
                  <div className="chat-dropdown-section">Aion CLI</div>
                )}
              </div>
            </div>

            <div className="chat-toolbar-spacer" />

            {/* ===== Send / Stop button ===== */}
            {isGenerating ? (
              <button
                className="chat-toolbar-send chat-toolbar-stop"
                onClick={onCancel}
                aria-label="停止生成"
                title="停止生成"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                className="chat-toolbar-send"
                onClick={handleSend}
                disabled={!text.trim() && attachedFiles.length === 0}
                aria-label={t('home.send')}
                style={!text.trim() && attachedFiles.length === 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="chat-input-disclaimer">内容由 AI 生成，请核实重要信息</div>
    </div>
  );
}
