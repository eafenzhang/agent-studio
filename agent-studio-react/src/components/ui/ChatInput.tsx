import React, { useState, useEffect } from 'react';
import { Dropdown } from './Dropdown';
import { systemApi, assistantApi, agentApi } from '../../services/api';
import { useAppStore } from '../../stores/appStore';
import { modeOptions as fallbackModes } from '../../data/constants';

interface ChatInputProps {
  placeholder?: string;
  rows?: number;
  fullDropdowns?: boolean;
  onSend?: (content: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  placeholder = '输入消息... (Enter 发送, Shift+Enter 换行)',
  rows = 2,
  fullDropdowns = true,
  onSend,
}) => {
  const agentId = useAppStore((s) => s.selectedAgentId);
  const setAgentId = useAppStore((s) => s.setSelectedAgentId);
  const [mode, setMode] = useState('行动');
  const [model, setModel] = useState('');
  const [activeTools, setActiveTools] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [modeOptions] = useState(fallbackModes);

  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [toolOptions, setToolOptions] = useState<string[]>([]);
  const [agentOptions, setAgentOptions] = useState<{id:string;name:string;icon:string}[]>([]);

  useEffect(() => {
    systemApi.providers().then((data) => {
      if (data) {
        const models = data.flatMap((p: any) => p.models || []);
        if (models.length > 0) setModelOptions(models);
        if (!model && models.length > 0) setModel(models[0]);
      }
    });
    // Tools: collect from assistants' enabled_skills
    assistantApi.list().then((list) => {
      if (list && list.length > 0) {
        const allSkills = new Set<string>();
        for (const a of list as any[]) {
          for (const s of a.enabled_skills || []) allSkills.add(s);
          for (const s of a.custom_skill_names || []) allSkills.add(s);
        }
        if (allSkills.size > 0) setToolOptions(Array.from(allSkills));
      }
    });
    // Agents for ACP dropdown
    agentApi.list().then((list) => {
      if (list && list.length > 0) {
        setAgentOptions((list as any[]).map((a: any) => ({
          id: a.id, name: a.name, icon: a.name.charAt(0).toUpperCase()
        })));
      }
    });
  }, []);

  useEffect(() => {
    if (!model && modelOptions.length > 0) setModel(modelOptions[0]);
  }, [modelOptions]);

  const caretSvg = (
    <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ width: 8, height: 5 }}>
      <polyline points="1 1 5 5 9 1" />
    </svg>
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && onSend) { onSend(input); setInput(''); }
    }
  };

  const handleSendClick = () => {
    if (input.trim() && onSend) { onSend(input); setInput(''); }
  };

  const handleToolToggle = (tool: string) => {
    setActiveTools(prev => prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool]);
  };

  const toolSectionItems = toolOptions.length > 0
    ? toolOptions.map(t => ({ label: t }))
    : [{ label: '暂无可用工具' }];

  return (
    <div className="chat-input-area">
      <div className="chat-input-content">
        <div className="chat-input-main">
          <textarea className="chat-input-textarea" rows={rows} placeholder={placeholder}
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} />

          <div className="chat-input-toolbar">
            <button className="chat-toolbar-plus" aria-label="添加">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {fullDropdowns ? (
              <Dropdown trigger={
                <button className="chat-toolbar-btn chat-toolbar-btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  <span>{mode}</span>{caretSvg}
                </button>
              } sections={[{ items: modeOptions.map(o => ({ label: o })) }]}
                activeValue={mode} onSelect={setMode} />
            ) : (
              <button className="chat-toolbar-btn chat-toolbar-btn-primary"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>行动</button>
            )}

            <Dropdown trigger={
              <button className="chat-toolbar-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                <span>{model || '选择模型'}</span>{caretSvg}
              </button>
            } sections={[{ items: modelOptions.map(o => ({ label: o })) }]}
              activeValue={model} onSelect={setModel} />

            <Dropdown trigger={
              <button className="chat-toolbar-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                工具<span className="chat-toolbar-badge">{activeTools.length}</span>{caretSvg}
              </button>
            } sections={[{ sectionLabel: '技能', items: toolSectionItems }]}
              multiSelect activeValues={activeTools} onToggle={handleToolToggle} />

            {agentOptions.length > 0 && (
              <Dropdown trigger={
                <button className="chat-toolbar-btn" title="选择 ACP Agent">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                  <span style={{fontSize:11}}>{agentOptions.find(a=>a.id===agentId)?.name || 'ACP'}</span>
                  <svg viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{width:6,height:4}}><polyline points="1 1 5 5 9 1"/></svg>
                </button>
              } sections={[{items: agentOptions.map(a=>({label:a.name,value:a.id}))}]}
                activeValue={agentId} onSelect={(v)=>{
                  const item=agentOptions.find(a=>a.id===v||a.name===v);
                  if(item) setAgentId(item.id);
                }} />
            )}

            <div className="chat-toolbar-spacer" />
            <button className="chat-toolbar-send" aria-label="发送" onClick={handleSendClick}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="chat-input-disclaimer">内容由 AI 生成，请核实重要信息</div>
    </div>
  );
};
