import { Chip } from '../types';

export const pageTitles: Record<string, string> = {
  home: '新建任务',
  assistant: '助理',
  projects: '项目',
  experts: '专家',
  tools: '工具',
  artifacts: '产物',
};

export const settingsTitles: Record<string, string> = {
  general: '系统',
  model: '模型',
  memory: '记忆',
  update: '更新',
};

export const chipData: Record<string, Chip[]> = {
  office: [
    { label: '数据仪表盘', color: '#e67e22', initial: '数' },
    { label: 'AionUi 管家', color: '#3498db', initial: 'A' },
    { label: '财务建模助手', color: '#95a5a6', initial: '财' },
    { label: 'Excel 表格助手', color: '#27ae60', initial: 'E' },
    { label: '日程管理助手', color: '#7f8c8d', initial: '日' },
    { label: '邮件撰写助手', color: '#2980b9', initial: '邮' },
    { label: '会议纪要助手', color: '#9b59b6', initial: '会' },
    { label: '翻译润色助手', color: '#e74c3c', initial: '翻' },
    { label: '文档整理助手', color: '#d35400', initial: '文' },
    { label: '学术论文助手', color: '#1abc9c', initial: '学' },
    { label: 'PPT 演示助手', color: '#f39c12', initial: 'P' },
    { label: 'moltbook', color: '#d35400', initial: 'm' },
  ],
  prototype: [
    { label: '产品需求分析', color: '#e74c3c', initial: '需' },
    { label: '用户画像生成', color: '#9b59b6', initial: '画' },
    { label: '信息架构设计', color: '#3498db', initial: '架' },
    { label: 'Wireframe 生成', color: '#2ecc71', initial: 'W' },
    { label: '交互原型助手', color: '#e67e22', initial: '交' },
    { label: '流程图绘制', color: '#1abc9c', initial: '流' },
    { label: 'PRD 撰写助手', color: '#34495e', initial: 'PR' },
    { label: '竞品分析助手', color: '#f39c12', initial: '竞' },
    { label: 'Beautiful Mermaid', color: '#27ae60', initial: 'B' },
    { label: '原型评审助手', color: '#7f8c8d', initial: '评' },
    { label: '可用性测试', color: '#2980b9', initial: '测' },
    { label: 'moltbook', color: '#d35400', initial: 'm' },
  ],
  creative: [
    { label: '品牌视觉设计', color: '#e74c3c', initial: '品' },
    { label: '海报生成助手', color: '#9b59b6', initial: '海' },
    { label: '配色方案生成', color: '#f1c40f', initial: '配' },
    { label: 'Logo 设计助手', color: '#3498db', initial: 'Lo' },
    { label: 'UI 组件设计', color: '#2ecc71', initial: 'UI' },
    { label: '插画生成助手', color: '#e67e22', initial: '插' },
    { label: '3D Morph PPT', color: '#9b59b6', initial: '3' },
    { label: 'Morph PPT', color: '#e74c3c', initial: 'M' },
    { label: '动效设计助手', color: '#1abc9c', initial: '动' },
    { label: '设计系统规范', color: '#7f8c8d', initial: '设' },
    { label: '图片处理助手', color: '#2980b9', initial: '图' },
    { label: 'moltbook', color: '#d35400', initial: 'm' },
  ],
};

export const categories = [
  { id: 'office', label: '日常办公' },
  { id: 'prototype', label: '产品原型' },
  { id: 'creative', label: '创意设计' },
];

// ── 输入栏配置（UI 常量，不依赖后端）───────────
export const modeOptions = ['行动', '规划', '自主'];
export const modelOptions = ['GPT-4o', 'Claude 3.5 Sonnet', 'DeepSeek V3', 'Qwen 2.5 Max'];
export const expertMenuOptions = ['代码开发工程师', 'UI 设计师', '内容创作专家', '数据分析师'];
