/**
 * File Browser Component
 * 文件浏览器组件
 */

import { listWorkspaceFiles, readFile, writeFile } from '../api.js';
import { wsClient } from '../websocket.js';

export class FileBrowserComponent {
  constructor() {
    this.container = null;
    this.files = [];
    this.currentPath = '';
  }

  init(container) {
    this.container = container;
    this.bindEvents();
    this.load();
  }

  bindEvents() {
    wsClient.on('file.changed', () => this.load());
  }

  async load(path = '') {
    if (!this.container) return;

    this.container.innerHTML = '<div class="loading">加载中...</div>';

    try {
      this.files = await listWorkspaceFiles({ root: path });
      this.currentPath = path;
      this.render();
    } catch (error) {
      this.container.innerHTML = '<div class="empty-state"><div class="empty-state-title">无法加载文件</div></div>';
    }
  }

  render() {
    if (this.files.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">工作区为空</div>
          <div class="empty-state-desc">暂无文件</div>
        </div>
      `;
      return;
    }

    this.container.innerHTML = this.files.map(file => `
      <div class="file-item" data-path="${this.escapeHtml(file.path)}" data-is-directory="${file.isDirectory}">
        <svg class="file-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          ${file.isDirectory
            ? '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>'
            : '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>'
          }
        </svg>
        <span class="file-item-name">${this.escapeHtml(file.name)}</span>
        <span class="file-item-size">${this.formatSize(file.size)}</span>
      </div>
    `).join('');

    // 绑定点击事件
    this.container.querySelectorAll('.file-item').forEach(item => {
      item.addEventListener('click', () => {
        const path = item.getAttribute('data-path');
        const isDirectory = item.getAttribute('data-is-directory') === 'true';

        if (isDirectory) {
          this.load(path);
        } else {
          this.openFile(path);
        }
      });
    });
  }

  async openFile(path) {
    try {
      const content = await readFile({ path });
      console.log('File content:', content);
      // TODO: 打开文件编辑器
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

export default new FileBrowserComponent();
