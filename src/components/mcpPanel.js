/**
 * MCP Panel Component
 * MCP 管理组件
 */

import { getMcpConfig, addMcpServer, deleteMcpServer } from '../api.js';
import { wsClient } from '../websocket.js';

export class McpPanelComponent {
  constructor() {
    this.container = null;
    this.servers = [];
  }

  init(container) {
    this.container = container;
    this.bindEvents();
    this.load();
  }

  bindEvents() {
    wsClient.on('mcp.statusChanged', () => this.load());
  }

  async load() {
    if (!this.container) return;

    this.container.innerHTML = '<div class="loading">加载中...</div>';

    try {
      const config = await getMcpConfig();
      this.servers = config?.servers || [];
      this.render();
    } catch (error) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载 MCP 配置</div></div>';
    }
  }

  render() {
    if (this.servers.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">暂无 MCP 服务器</div>
          <div class="empty-state-desc">点击"添加服务器"开始配置</div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.servers.map(server => `
      <div class="mcp-server-card" data-id="${this.escapeHtml(server.id)}">
        <div class="mcp-server-header">
          <div class="mcp-server-name">${this.escapeHtml(server.name)}</div>
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

  async addServer(config) {
    try {
      await addMcpServer(config);
      await this.load();
    } catch (error) {
      console.error('Failed to add MCP server:', error);
      throw error;
    }
  }

  async removeServer(id) {
    try {
      await deleteMcpServer(id);
      await this.load();
    } catch (error) {
      console.error('Failed to remove MCP server:', error);
      throw error;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new McpPanelComponent();
