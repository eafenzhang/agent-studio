export const ZH_ASSISTANT_NAMES: Record<string, string> = {
  'beautiful-mermaid': '图表专家',
  'word-form-creator': '表单创建',
  'aionui-assistant': 'AionUi 管家',
  'story-roleplay': '角色扮演',
  'social-job-publisher': '招聘发布',
  'human-3-coach': 'HUMAN 教练',
  'word-creator': '文档创作',
  'ui-ux-pro-max': 'UI/UX 设计',
  'excel-creator': '表格专家',
  'morph-ppt': 'PPT 变形',
  'game-3d': '3D 游戏',
  'moltbook': '知识手册',
  'ppt-creator': 'PPT 创作',
  'dashboard-creator': '数据面板',
  'pitch-deck-creator': '路演文稿',
  'morph-ppt-3d': '3D PPT',
  'planning-with-files': '文件规划',
  'cowork': '协作助手',
  'openclaw-setup': '环境配置',
  'academic-paper': '学术论文',
  'financial-model-creator': '财务建模',
};

export const ZH_DESCRIPTIONS: Record<string, string> = {
  'beautiful-mermaid': '使用精美的主题创建流程图、时序图、状态图、类图和 ER 图',
  'word-form-creator': '快速创建和设计表单，支持多种模板和自定义布局',
  'aionui-assistant': 'AionUi 系统管家，帮你配置、排障和管理工作空间',
  'story-roleplay': '沉浸式角色扮演体验，支持多种故事场景和人物设定',
  'social-job-publisher': '一键发布招聘信息到多个社交平台，轻松管理招聘流程',
  'human-3-coach': 'HUMAN 3.0 教练模式，帮助你提升思考和工作效率',
  'word-creator': 'AI 驱动的文档创作工具，支持排版、校对和多语言写作',
  'ui-ux-pro-max': '专业 UI/UX 设计助手，生成界面设计稿和交互原型',
  'excel-creator': '智能表格处理，支持公式生成、数据分析与可视化',
  'morph-ppt': 'PPT 变形动画专家，快速将文档转化为演示文稿',
  'game-3d': '3D 游戏开发助手，支持场景搭建和交互设计',
  'moltbook': '知识库手册工具，整理和管理你的知识体系',
  'ppt-creator': 'AI PPT 创作工具，从文案到设计一站式完成',
  'dashboard-creator': '数据仪表盘创建专家，连接数据源并可视化',
  'pitch-deck-creator': '路演文稿助手，帮你打造投资人青睐的商业计划书',
  'morph-ppt-3d': '3D 风格 PPT 变形动画，炫酷的演示效果',
  'planning-with-files': '基于文件的项目规划，自动分析文档生成计划',
  'cowork': '协作助手，支持团队协作和 Skill 创建',
  'openclaw-setup': 'OpenClaw 环境配置专家，帮助你快速搭建开发环境',
  'academic-paper': '学术论文助手，支持文献检索、写作和格式排版',
  'financial-model-creator': '财务建模专家，创建财务预测和估值模型',
};

export function zhName(id: string, fallback: string): string {
  return ZH_ASSISTANT_NAMES[id] || fallback;
}

export function zhDescription(id: string, fallback: string): string {
  return ZH_DESCRIPTIONS[id] || fallback;
}
