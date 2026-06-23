/**
 * Agent Studio Desktop - Main Entry
 */

import { wsClient } from './websocket.js';
import {
  getConversations,
  createConversation,
  getAgents,
  refreshAgents,
  listWorkspaceFiles,
  getMcpConfig,
  healthCheck
} from './api.js';

// ===== 页面切换 =====
function switchPage(pageId) {
  // 切换页面
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });
  const target = document.getElementById(`page-${pageId}`);
  if (target) {
    target.classList.add('active');
  }

  // 切换导航状态
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.remove('active');
  });
  const navItem = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navItem) {
    navItem.classList.add('active');
  }
}

// ===== 初始化导航 =====
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const pageId = item.getAttribute('data-page');
      if (pageId) {
        switchPage(pageId);
      }
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const pageId = item.getAttribute('data-page');
        if (pageId) {
          switchPage(pageId);
        }
      }
    });
  });
}

// ===== 会话管理 =====
async function loadConversations() {
  const container = document.getElementById('conversations-list');
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const conversations = await getConversations();
    renderConversations(container, conversations.items || []);
  } catch (error) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载会话</div><div class="empty-state-desc">请检查后端连接</div></div>';
  }
}

function renderConversations(container, conversations) {
  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <div class="empty-state-title">暂无会话</div>
        <div class="empty-state-desc">点击右上角 + 创建新会话</div>
      </div>
    `;
    return;
  }

  container.innerHTML = conversations.map(conv => `
    <div class="conversation-card" data-id="${conv.id}">
      <div class="conversation-card-title">${escapeHtml(conv.title || '新建会话')}</div>
      <div class="conversation-card-preview">${escapeHtml(conv.preview || '暂无消息')}</div>
      <div class="conversation-card-meta">${formatTime(conv.updatedAt)}</div>
    </div>
  `).join('');

  // 绑定点击事件
  container.querySelectorAll('.conversation-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      console.log('Open conversation:', id);
      // TODO: 打开会话详情
    });
  });
}

// ===== Agent 管理 =====
async function loadAgents() {
  const container = document.getElementById('agents-list');
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const agents = await getAgents();
    renderAgents(container, agents || []);
  } catch (error) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载 Agent</div><div class="empty-state-desc">请检查后端连接</div></div>';
  }
}

function renderAgents(container, agents) {
  if (agents.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m-7-3.5l5.196-3m5.196-3L19 2.5M5 5.5l5.196 3m5.196 3L19 17.5"/>
        </svg>
        <div class="empty-state-title">暂无可用 Agent</div>
        <div class="empty-state-desc">请检查系统配置</div>
      </div>
    `;
    return;
  }

  container.innerHTML = agents.map(agent => `
    <div class="agent-card" data-id="${agent.id}">
      <div class="agent-card-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m-7-3.5l5.196-3m5.196-3L19 2.5M5 5.5l5.196 3m5.196 3L19 17.5"/>
        </svg>
      </div>
      <div class="agent-card-content">
        <div class="agent-card-name">${escapeHtml(agent.name)}</div>
        <div class="agent-card-backend">${escapeHtml(agent.backend)}</div>
        <div class="agent-card-status ${agent.available ? 'available' : 'unavailable'}">
          ${agent.available ? '✓ 可用' : '✗ 不可用'}
        </div>
      </div>
    </div>
  `).join('');
}

// ===== 文件浏览器 =====
async function loadFiles() {
  const container = document.getElementById('file-browser');
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const files = await listWorkspaceFiles({});
    renderFiles(container, files || []);
  } catch (error) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载文件</div><div class="empty-state-desc">请检查后端连接</div></div>';
  }
}

function renderFiles(container, files) {
  if (files.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
        </svg>
        <div class="empty-state-title">工作区为空</div>
        <div class="empty-state-desc">暂无文件</div>
      </div>
    `;
    return;
  }

  container.innerHTML = files.map(file => `
    <div class="file-item" data-path="${escapeHtml(file.path)}">
      <svg class="file-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        ${file.isDirectory
          ? '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'
          : '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>'
        }
      </svg>
      <span class="file-item-name">${escapeHtml(file.name)}</span>
      <span class="file-item-size">${formatSize(file.size)}</span>
    </div>
  `).join('');
}

// ===== MCP 管理 =====
async function loadMcpServers() {
  const container = document.getElementById('mcp-servers-list');
  if (!container) return;

  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const config = await getMcpConfig();
    renderMcpServers(container, config?.servers || []);
  } catch (error) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载 MCP 配置</div><div class="empty-state-desc">请检查后端连接</div></div>';
  }
}

function renderMcpServers(container, servers) {
  if (servers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
        </svg>
        <div class="empty-state-title">暂无 MCP 服务器</div>
        <div class="empty-state-desc">点击"添加服务器"开始配置</div>
      </div>
    `;
    return;
  }

  container.innerHTML = servers.map(server => `
    <div class="mcp-server-card" data-id="${escapeHtml(server.id)}">
      <div class="mcp-server-header">
        <div class="mcp-server-name">${escapeHtml(server.name)}</div>
        <div class="mcp-server-status ${server.connected ? 'connected' : 'disconnected'}">
          ${server.connected ? '✓ 已连接' : '✗ 未连接'}
        </div>
      </div>
      <div class="mcp-server-tools">
        ${server.tools ? server.tools.length + ' 个工具' : '未知工具数'}
      </div>
    </div>
  `).join('');
}

// ===== 工具函数 =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ===== 初始化 =====
async function init() {
  console.log('Agent Studio Desktop initializing...');

  // 初始化导航
  initNavigation();

  // 连接 WebSocket
  wsClient.connect();

  // 监听 WebSocket 事件
  wsClient.on('connected', () => {
    console.log('WebSocket connected, loading data...');
    loadConversations();
    loadAgents();
    loadFiles();
    loadMcpServers();
  });

  wsClient.on('disconnected', () => {
    console.log('WebSocket disconnected');
  });

  // 检查后端连接
  const isHealthy = await healthCheck();
  if (isHealthy) {
    console.log('Backend is healthy');
    // 如果已连接，加载数据
    if (wsClient.isConnected) {
      loadConversations();
      loadAgents();
      loadFiles();
      loadMcpServers();
    }
  } else {
    console.error('Backend is not healthy');
  }

  // 绑定刷新按钮
  document.getElementById('refresh-conversations')?.addEventListener('click', loadConversations);
  document.getElementById('refresh-agents')?.addEventListener('click', loadAgents);
  document.getElementById('refresh-files')?.addEventListener('click', loadFiles);
}

// 启动
init();
