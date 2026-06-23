/**
 * Conversations Component
 * 会话管理组件
 */

import {
  getConversations,
  createConversation,
  deleteConversation,
  getMessages,
  sendMessage
} from '../api.js';
import { wsClient } from '../websocket.js';

export class ConversationsComponent {
  constructor() {
    this.container = null;
    this.conversations = [];
    this.selectedConversation = null;
  }

  init(container) {
    this.container = container;
    this.bindEvents();
    this.load();
  }

  bindEvents() {
    // 监听 WebSocket 事件
    wsClient.on('conversation.updated', () => this.load());
    wsClient.on('conversation.message.new', (data) => {
      if (this.selectedConversation?.id === data.conversationId) {
        this.appendMessage(data);
      }
    });
  }

  async load() {
    if (!this.container) return;

    this.container.innerHTML = '<div class="loading">加载中...</div>';

    try {
      const result = await getConversations();
      this.conversations = result.items || [];
      this.render();
    } catch (error) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载会话</div></div>';
    }
  }

  render() {
    if (this.conversations.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">暂无会话</div>
          <div class="empty-state-desc">点击 + 创建新会话</div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.conversations.map(conv => `
      <div class="conversation-card" data-id="${conv.id}">
        <div class="conversation-card-title">${this.escapeHtml(conv.title || '新建会话')}</div>
        <div class="conversation-card-preview">${this.escapeHtml(conv.preview || '暂无消息')}</div>
        <div class="conversation-card-meta">${this.formatTime(conv.updatedAt)}</div>
      </div>
    `).join('');

    // 绑定点击事件
    this.container.querySelectorAll('.conversation-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        this.select(id);
      });
    });
  }

  async create(title) {
    try {
      const conv = await createConversation({ title });
      this.conversations.unshift(conv);
      this.render();
      return conv;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  async select(id) {
    this.selectedConversation = this.conversations.find(c => c.id === id);
    // TODO: 打开会话详情视图
    console.log('Selected conversation:', this.selectedConversation);
  }

  appendMessage(message) {
    // TODO: 在聊天视图中追加消息
    console.log('New message:', message);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
  }
}

export default new ConversationsComponent();
