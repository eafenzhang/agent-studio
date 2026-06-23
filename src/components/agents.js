/**
 * Agents Component
 * Agent 管理组件
 */

import { getAgents, refreshAgents, setAgentEnabled } from '../api.js';
import { wsClient } from '../websocket.js';

export class AgentsComponent {
  constructor() {
    this.container = null;
    this.agents = [];
  }

  init(container) {
    this.container = container;
    this.bindEvents();
    this.load();
  }

  bindEvents() {
    wsClient.on('agent.statusChanged', () => this.load());
  }

  async load() {
    if (!this.container) return;

    this.container.innerHTML = '<div class="loading">加载中...</div>';

    try {
      this.agents = await getAgents();
      this.render();
    } catch (error) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载 Agent</div></div>';
    }
  }

  async refresh() {
    try {
      this.agents = await refreshAgents();
      this.render();
    } catch (error) {
      console.error('Failed to refresh agents:', error);
    }
  }

  render() {
    if (this.agents.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">暂无可用 Agent</div>
          <div class="empty-state-desc">请检查系统配置</div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.agents.map(agent => `
      <div class="agent-card" data-id="${agent.id}">
        <div class="agent-card-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m-7-3.5l5.196-3m5.196-3L19 2.5M5 5.5l5.196 3m5.196 3L19 17.5"/>
          </svg>
        </div>
        <div class="agent-card-content">
          <div class="agent-card-name">${this.escapeHtml(agent.name)}</div>
          <div class="agent-card-backend">${this.escapeHtml(agent.backend)}</div>
          <div class="agent-card-status ${agent.available ? 'available' : 'unavailable'}">
            ${agent.available ? '✓ 可用' : '✗ 不可用'}
          </div>
        </div>
      </div>
    `).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

export default new AgentsComponent();
