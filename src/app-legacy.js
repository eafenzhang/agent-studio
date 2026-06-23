/**
 * Agent Studio Desktop - Application Entry Point
 * Imports all modules, runs initialization sequence:
 * connect check → parallel data load → init components → connect WebSocket
 */

// Core modules
import state from './state.js';
import { showToast, toggleDropdown, selectDropdown, copyToClipboard } from './utils.js';
import { initKeyboard, register } from './utils/keyboard.js';

// Communication layer
import * as api from './api.js';
import wsClient from './websocket.js';
import * as chatService from './services/chat-service.js';

// Components (React has replaced experts, tools, artifacts, projects, settings pages)
import * as sidebar from './components/sidebar.js';
import * as chatComponent from './components/chat.js';
import * as messageInput from './components/message-input.js';
import * as tabs from './components/tabs.js';

// CSS import (Vite handles this)
import './styles/components.css';

// ===== Page Configuration =====
const pageTitles = {
  home: '新建任务',
  assistant: '助理',
  projects: '项目',
  experts: '专家',
  tools: '工具',
  artifacts: '产物',
  conversation: '会话',
};

// ===== Page Switching =====
/**
 * Switch to a page by ID
 * @param {string} pageId
 * @param {HTMLElement} navEl
 */
function switchPage(pageId, navEl) {
  // Hide all pages
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.remove('active', 'page-fade-in');
  });

  // Show target page
  const target = document.getElementById('page-' + pageId);
  if (target) {
    target.classList.add('active');
    requestAnimationFrame(() => target.classList.add('page-fade-in'));
  }

  // Deactivate all nav tabs
  document.querySelectorAll('.conversation-list-tab-button').forEach((b) => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  // Activate clicked nav tab
  if (navEl) {
    navEl.classList.add('active');
    navEl.setAttribute('aria-selected', 'true');
  }

  // Update topbar title
  const topbar = document.getElementById('topbar-title');
  if (topbar) topbar.textContent = pageTitles[pageId] || '';

  // Hide conversation detail
  const convDetail = document.getElementById('conversation-detail');
  if (convDetail) convDetail.classList.remove('active');

  // Update state
  state.set('currentPage', pageId);
  state.set('currentConversationId', null);

  // Lazy-load page data (now handled by React Router)
  // Page components have been migrated to React; no legacy init needed here.
}

// ===== Sidebar Toggle =====
function toggleSidebar() {
  sidebar.toggleSidebar();
}

// ===== Category Switching (Home Page) =====
const chipData = {
  office: ['📊 数据分析', '📝 文档写作', '💻 代码开发', '🎨 设计素材'],
  prototype: ['📱 移动端原型', '🖥️ Web 原型', '📋 交互流程'],
  creative: ['🎬 视频脚本', '🖌️ 视觉设计', '📰 营销文案'],
};

function switchCategory(cat, btn) {
  document.querySelectorAll('.chat-welcome-chip').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  renderChips(cat);
}

function renderChips(cat) {
  const row = document.getElementById('chip-row');
  if (!row) return;
  // Only render static chips if no real assistants are loaded from API
  const assistants = state.get('assistants') || [];
  if (assistants.length > 0) {
    // Re-render assistants (they were already loaded, keep them)
    renderAssistantChips(assistants);
    return;
  }
  const items = chipData[cat] || chipData.office;
  row.innerHTML = items
    .map((c) => `<div class="chat-assistant-chip" data-action="selectChip"><span class="chat-assistant-chip-label">${c}</span></div>`)
    .join('');
}

/**
 * Render assistant chips from API-loaded assistants
 * @param {Array} assistants
 */
function renderAssistantChips(assistants) {
  const row = document.getElementById('chip-row');
  if (!row) return;
  row.innerHTML = assistants
    .map((a) => {
      const name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name || 'Unknown';
      let icon = '';
      if (a.avatar && a.avatar.startsWith('/')) {
        icon = `<img src="http://127.0.0.1:25808${a.avatar}" style="width:18px;height:18px;border-radius:50%;" alt="" />`;
      } else {
        icon = `<span>${a.avatar || '🤖'}</span>`;
      }
      return `<div class="chat-assistant-chip" data-action="selectChip"><div class="chat-assistant-chip-avatar">${icon}</div><span class="chat-assistant-chip-label">${name}</span></div>`;
    })
    .join('');
}

function selectChip(el) {
  document.querySelectorAll('.chat-assistant-chip').forEach((c) => c.classList.remove('selected'));
  el.classList.add('selected');
}

function scrollChips(dir) {
  const s = document.querySelector('.chat-assistant-chips-scroll');
  if (s) s.scrollBy({ left: dir * 150, behavior: 'smooth' });
}

// ===== Dropdown Management =====
function selectExpert(el) {
  const menu = el.closest('.chat-dropdown-menu');
  if (menu) {
    menu.querySelectorAll('.chat-dropdown-item').forEach((i) => i.classList.remove('active'));
    el.classList.add('active');
    menu.classList.remove('open');
  }
}

// ===== Folder Open =====
function openFolder(path) {
  showToast('工作区: ' + path);
}

// ===== Bind Navigation =====
function bindNavigation() {
  document.querySelectorAll('.conversation-list-tab-button').forEach((item) => {
    item.addEventListener('click', () => {
      const pageId = item.getAttribute('data-page') || item.textContent.trim().toLowerCase();
      // Map tab text to page IDs
      const text = item.textContent.trim();
      let mappedId = pageId;
      if (text.includes('新建任务')) mappedId = 'home';
      else if (text.includes('助理')) mappedId = 'assistant';
      else if (text.includes('项目')) mappedId = 'projects';
      else if (text.includes('专家')) mappedId = 'experts';
      else if (text.includes('工具')) mappedId = 'tools';
      else if (text.includes('产物')) mappedId = 'artifacts';
      switchPage(mappedId, item);
    });
  });
}

// ===== Bind Home Page Events =====
function bindHomePage() {
  // Category chips
  document.querySelectorAll('.chat-welcome-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.textContent.trim();
      let cat = 'office';
      if (text.includes('原型')) cat = 'prototype';
      else if (text.includes('创意')) cat = 'creative';
      switchCategory(cat, btn);
    });
  });

  // Chip scroll buttons
  document.querySelectorAll('.chat-chip-scroll-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dir = btn.textContent.includes('‹') || btn.querySelector('polyline[points="15 18 9 12 15 6"]') ? -1 : 1;
      scrollChips(dir);
    });
  });

  // Dropdown toggle buttons — remove onclick to prevent double-toggle
  // (inline onclick fires first, then addEventListener fires, causing immediate close)
  document.querySelectorAll('.chat-dropdown > .chat-toolbar-plus, .chat-dropdown > .chat-toolbar-btn').forEach((btn) => {
    const menu = btn.nextElementSibling;
    if (menu && menu.classList.contains('chat-dropdown-menu')) {
      const menuId = menu.id;
      if (menuId) {
        btn.removeAttribute('onclick');
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleDropdown(menuId);
        });
      }
    }
  });

  // Mode menu items — remove onclick to prevent double-fire
  document.querySelectorAll('#mode-menu .chat-dropdown-item').forEach((item) => {
    item.removeAttribute('onclick');
    item.addEventListener('click', () => {
      const label = item.querySelector('.chat-dropdown-item-label');
      if (label) {
        const mode = label.textContent.trim();
        selectDropdown('mode-label', mode, item);
        state.set('selectedMode', mode.toLowerCase());
      }
    });
  });

  // Model menu items (static fallback - will be replaced by message-input.js)
  document.querySelectorAll('#model-menu .chat-dropdown-item').forEach((item) => {
    item.removeAttribute('onclick');
    item.addEventListener('click', () => {
      const label = item.querySelector('.chat-dropdown-item-label');
      if (label) {
        const model = label.textContent.trim();
        selectDropdown('model-label', model, item);
        state.set('selectedModel', model);
      }
    });
  });

  // File menu items
  document.querySelectorAll('#file-menu .chat-dropdown-item').forEach((item) => {
    item.addEventListener('click', () => {
      const label = item.querySelector('.chat-dropdown-item-label');
      if (label) {
        showToast(label.textContent.trim() + ' 功能开发中');
      }
      document.querySelectorAll('.chat-dropdown-menu').forEach((m) => m.classList.remove('open'));
    });
  });
}

// ===== Inline Settings Overlay Helpers (replaces settings.js) =====
function openSettingsOverlay() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.style.display = 'flex';
  // Dispatch bridge event so React can react
  window.dispatchEvent(new CustomEvent('legacy:setTheme', { detail: { theme: state.get('theme') || 'light' } }));
}

function closeSettingsOverlay() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) overlay.style.display = 'none';
}

/**
 * Load providers for the legacy settings page (model tab).
 * Now delegates to the React SettingsPage via data loading.
 */
async function loadProvidersForSettingsPage() {
  try {
    const providers = await api.getProviders();
    state.set('providers', providers || []);
    // Populate legacy settings model list if the DOM element exists
    const list = document.getElementById('settings-model-list');
    if (list && providers) {
      list.innerHTML = providers
        .map((p) => {
          const models = (p.models || []).join(', ') || '—';
          return `<div class="settings-provider-row" data-id="${p.id}">
            <div class="settings-provider-name">${p.name || p.id}</div>
            <div class="settings-provider-models">${models}</div>
            <div class="settings-provider-actions">
              <button class="btn-ghost" data-action="fetchModelsForProvider" data-id="${p.id}">刷新</button>
              <button class="btn-ghost" data-action="editProvider" data-id="${p.id}">编辑</button>
              <button class="btn-ghost" data-action="deleteProvider" data-id="${p.id}">删除</button>
            </div>
          </div>`;
        })
        .join('');
    }
  } catch (err) {
    console.error('Load providers for settings error:', err);
  }
}

/**
 * Load memory entries for the legacy settings page (memory tab).
 */
async function loadMemoryForSettings() {
  try {
    const memory = await api.getMemory();
    state.set('memory', memory || []);
    const list = document.getElementById('settings-memory-list');
    if (list && memory) {
      list.innerHTML = memory
        .map((m) => `<div class="settings-memory-row">
          <div class="settings-memory-content">${m.content || m.text || ''}</div>
          <button class="btn-ghost" data-action="deleteMemory" data-id="${m.id}">删除</button>
        </div>`)
        .join('');
    }
  } catch (err) {
    console.error('Load memory error:', err);
  }
}

// ===== Bind Settings Trigger =====
function bindSettings() {
  // Settings button in footer
  const settingsBtn = document.querySelector('.conversation-list-footer-btn[aria-label="设置"]');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => openSettingsOverlay());
  }

  // Settings overlay click to close
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSettingsOverlay();
    });
  }

  // Close button in settings modal header
  const closeBtn = document.querySelector('.settings-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeSettingsOverlay());
  }

  // NOTE: settings navigation, dialog buttons, and toggles are now handled by React SettingsPage

  // Bind platform select auto-fill (was inline onchange)
  const platformSelect = document.getElementById('model-platform');
  if (platformSelect) {
    platformSelect.addEventListener('change', (e) => autoFillApiUrl(e.target.value));
  }
}

// ===== Load Assistants for Home Page Chips =====
async function loadAssistants() {
  try {
    const data = await api.getAssistants();
    const assistants = data || [];
    state.set('assistants', assistants);
    renderAssistantChips(assistants);
  } catch (err) {
    console.error('Load assistants error:', err);
  }
}

// ===== Load Providers for Model Menu =====
async function loadProviders() {
  try {
    const providers = await api.getProviders();
    state.set('providers', providers || []);

    // Populate model menu
    const menu = document.getElementById('model-menu');
    if (menu && providers && providers.length > 0) {
      const models = [];
      providers.forEach((p) => {
        if (p.models) {
          p.models.forEach((m) => models.push(m));
        }
      });

      if (models.length > 0) {
        menu.innerHTML = models
          .map(
            (m, i) => `
          <div class="chat-dropdown-item ${i === 0 ? 'active' : ''}" data-action="selectDropdown" data-label-id="model-label" data-value="${m}">
            <span class="chat-dropdown-item-label">${m}</span>
            <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        `
          )
          .join('');

        // Set default model label
        const label = document.getElementById('model-label');
        if (label) label.textContent = models[0];
        state.set('selectedModel', models[0]);
      }
    }
  } catch (err) {
    console.error('Load providers error:', err);
  }
}

// ===== Load Agents for Expert Menu =====
async function loadAgentsForExpertMenu() {
  try {
    const agents = await api.getAgents();
    state.set('agents', agents || []);

    const menu = document.getElementById('expert-menu');
    if (menu && agents && agents.length > 0) {
      menu.innerHTML = agents
        .map((a, i) => {
          const name = (a.name_i18n && a.name_i18n['zh-CN']) || a.name || 'Unknown';
          return `
          <div class="chat-dropdown-item ${i === 0 ? 'active' : ''}" data-action="selectExpert">
            <span class="chat-dropdown-item-label">${name}</span>
            <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          `;
        })
        .join('');
    }
  } catch (err) {
    console.error('Load agents error:', err);
  }
}

// ===== Load MCP for Tool Menu =====
async function loadMcpForToolMenu() {
  try {
    const config = await api.getMcpConfig();
    const servers = config?.servers || config || [];
    state.set('mcpServers', servers);

    const menu = document.getElementById('tool-menu');
    if (menu && servers && servers.length > 0) {
      let html = '<div class="chat-dropdown-section">MCP</div>';
      servers.forEach((s) => {
        html += `
          <div class="chat-dropdown-item" data-action="toggleActive">
            <span class="chat-dropdown-item-label">${s.name || s.id || 'Unknown'}</span>
            <svg class="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        `;
      });
      menu.innerHTML = html;
    }
  } catch (err) {
    console.error('Load MCP error:', err);
  }
}

// ===== Workspace Path =====
/**
 * Initialize the workspace path with a sensible default.
 * Tries backend first, falls back to user home directory.
 */
async function initWorkspacePath() {
  // If already set (e.g., from a previous session), keep it
  if (state.get('workspacePath')) return;

  // Try to get the workspace path from the backend
  try {
    const files = await api.listWorkspaceFiles({ path: '' });
    // The backend may return a base path in the response
    if (files && files.path) {
      state.set('workspacePath', files.path);
      return;
    }
    if (files && files.workspace) {
      state.set('workspacePath', files.workspace);
      return;
    }
  } catch (_) {
    // Backend might not be ready, use fallback
  }

  // Fallback: use a sensible default based on platform hints
  // In desktop apps this is typically the user's home directory
  const defaultPath = (typeof window !== 'undefined' && window.__TAURI__)
    ? '' // Tauri provides its own mechanism
    : '';
  state.set('workspacePath', defaultPath);
}

// ===== Connection Check =====
async function checkBackendConnection() {
  try {
    const healthy = await api.healthCheck();
    state.set('connectionStatus', healthy ? 'connected' : 'disconnected');
    return healthy;
  } catch {
    state.set('connectionStatus', 'disconnected');
    return false;
  }
}

// ===== P1: Keyboard Shortcut Registration =====
function registerShortcuts() {
  // Ctrl+N → 新建空会话
  register('Ctrl+n', (e) => {
    tabs.addTab();
  });

  // Ctrl+K → 聚焦侧边栏搜索框
  register('Ctrl+k', (e) => {
    const searchInput = document.getElementById('sidebar-search');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  });

  // Ctrl+Tab → 下一个 Tab
  register('Ctrl+Tab', (e) => {
    tabs.nextTab();
  });

  // Ctrl+Shift+Tab → 上一个 Tab
  register('Ctrl+Shift+Tab', (e) => {
    tabs.prevTab();
  });

  // Ctrl+W → 关闭当前 Tab
  register('Ctrl+w', () => {
    const idx = state.get('activeTabIndex');
    if (idx >= 0) tabs.closeTab(idx);
  });

  // Escape → 关闭弹窗/下拉菜单
  register('Escape', (e) => {
    // Close all dropdowns
    document.querySelectorAll('.chat-dropdown-menu').forEach((m) => m.classList.remove('open'));
    // Close settings if open
    const overlay = document.getElementById('settings-overlay');
    if (overlay && overlay.style.display === 'flex') {
      closeSettingsOverlay();
    }
  });

  // Ctrl+/ → 快捷键帮助提示
  register('Ctrl+/', (e) => {
    showToast('快捷键: Ctrl+N 新建会话 | Ctrl+K 搜索 | Ctrl+Tab 切换Tab | Esc 关闭弹窗 | Enter 发送');
  });
}

// ===== Main Initialization =====
async function init() {
  console.log('Agent Studio Desktop initializing...');

  // 0. Theme initialization
  const savedTheme = localStorage.getItem('agent-studio-theme') || 'light';
  applyTheme(savedTheme);
  state.set('theme', savedTheme);

  // Bind theme selector
  const themeSelect = document.getElementById('theme-select');
  if (themeSelect) {
    themeSelect.value = savedTheme;
    themeSelect.addEventListener('change', (e) => setTheme(e.target.value));
  }

  // 1. Bind navigation
  bindNavigation();
  bindHomePage();
  bindSettings();

  // 1.2. Initialize keyboard shortcuts
  initKeyboard();
  registerShortcuts();

  // 1.3. Initialize tab bar
  tabs.init();

  // 1.5. Global click delegation for data-action
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;

    // Handle stopPropagation specially
    if (action === 'stopPropagation') {
      e.stopPropagation();
      return;
    }

    // Delegate routing table
    const handlers = {
      switchPage: () => {
        const page = el.dataset.arg;
        if (page) switchPage(page, el);
      },
      switchCategory: () => {
        const cat = el.dataset.arg;
        if (cat) {
          // Find the active chip button and deactivate others
          document.querySelectorAll('.chat-welcome-chip').forEach((b) => b.classList.remove('active'));
          el.classList.add('active');
          renderChips(cat);
        }
      },
      selectChip: () => {
        document.querySelectorAll('.chat-assistant-chip').forEach((c) => c.classList.remove('selected'));
        el.classList.add('selected');
      },
      scrollChips: () => {
        const dir = parseInt(el.dataset.dir) || 0;
        const s = document.querySelector('.chat-assistant-chips-scroll');
        if (s) s.scrollBy({ left: dir * 150, behavior: 'smooth' });
      },
      toggleDropdown: () => {
        const menuId = el.dataset.arg;
        if (menuId) toggleDropdown(menuId);
      },
      selectDropdown: () => {
        const labelId = el.dataset.labelId;
        const value = el.dataset.value;
        if (labelId && value) selectDropdown(labelId, value, el);
      },
      selectExpert: () => {
        const menu = el.closest('.chat-dropdown-menu');
        if (menu) {
          menu.querySelectorAll('.chat-dropdown-item').forEach((i) => i.classList.remove('active'));
          el.classList.add('active');
          menu.classList.remove('open');
        }
      },
      toggleSidebar: () => toggleSidebar(),
      openSettings: () => openSettingsOverlay(),
      closeSettings: () => closeSettingsOverlay(),
      switchSettingsPage: () => {
        const pageId = el.dataset.arg;
        if (pageId) switchSettingsPage(pageId, el);
      },
      switchTab: () => {
        const tabsContainer = el.closest('.experts-tabs, .artifacts-tabs');
        if (tabsContainer) {
          tabsContainer.querySelectorAll('.expert-tab, .artifact-tab').forEach((t) => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
        } else {
          document.querySelectorAll('.expert-tab, .artifact-tab').forEach((t) => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
          });
        }
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
      },
      switchToolTab: () => {
        const cat = el.dataset.arg;
        document.querySelectorAll('.tool-tab').forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        el.classList.add('active');
        el.setAttribute('aria-selected', 'true');
        document.querySelectorAll('[data-tool-category]').forEach((c) => {
          c.style.display = c.getAttribute('data-tool-category') === cat ? '' : 'none';
        });
      },
      openFolder: () => {
        const path = el.dataset.arg;
        if (path) showToast('工作区: ' + path);
      },
      showAddModelDialog: () => showAddModelDialog(),
      closeAddModelDialog: () => closeAddModelDialog(),
      saveModel: () => saveModel(),
      closeDialog: () => closeDialog(),
      saveCustomAgent: () => saveCustomAgent(),
      showCreateDialog: () => showCreateDialog(),
      deleteConv: () => {
        const convId = el.dataset.convId;
        if (convId && confirm('确定要删除此会话吗？')) {
          chatService.deleteConversation(convId).then(() => sidebar.loadConversations());
        }
      },
      renameConv: () => {
        const convId = el.dataset.convId;
        if (convId) {
          const newTitle = prompt('请输入新的会话名称:');
          if (newTitle) {
            chatService.renameConversation(convId, newTitle.trim()).then(() => sidebar.loadConversations());
          }
        }
      },
      toggleSettingToggle: () => {
        el.classList.toggle('on');
      },
      toggleActive: () => {
        el.classList.toggle('active');
      },
      openConvPage: () => {
        const convId = el.dataset.convId;
        const convTitle = el.dataset.convTitle || '会话';
        if (convId) tabs.openTab(convId, convTitle);
      },
      fetchModelsForProvider: () => {
        const id = el.dataset.id;
        if (id) fetchModelsForProvider(id);
      },
      testConnection: () => {
        const id = el.dataset.id;
        if (id) testConnection(id);
      },
      editProvider: () => {
        const id = el.dataset.id;
        if (id) editProvider(id);
      },
      deleteProvider: () => {
        const id = el.dataset.id;
        if (id) deleteProvider(id);
      },
      closeArtifactPreview: () => {
        const modal = document.getElementById('artifact-preview-modal');
        if (modal) modal.classList.remove('visible');
      },
      // P1: Message action handlers
      copyMessage: () => {
        const msgId = el.dataset.msgId;
        if (msgId) chatComponent.handleCopyMessage(msgId);
      },
      deleteMessage: () => {
        const msgId = el.dataset.msgId;
        if (msgId) chatComponent.handleDeleteMessage(msgId);
      },
      confirmDelete: () => {
        // Handled inline in chat.js via direct event listener
      },
      cancelDelete: () => {
        // Handled inline in chat.js via direct event listener
      },
      regenerateMessage: () => {
        const msgId = el.dataset.msgId;
        if (msgId) chatComponent.handleRegenerateMessage(msgId);
      },
      editMessage: () => {
        const msgId = el.dataset.msgId;
        if (msgId) chatComponent.handleEditMessage(msgId);
      },
      // P1: Tab action handlers
      activateTab: () => {
        const idx = parseInt(el.dataset.tabIndex, 10);
        if (!isNaN(idx)) tabs.activateTab(idx);
      },
      closeTab: () => {
        const idx = parseInt(el.dataset.tabIndex, 10);
        if (!isNaN(idx)) tabs.closeTab(idx);
      },
      addTab: () => {
        tabs.addTab();
      },
    };

    if (handlers[action]) {
      handlers[action]();
    }
  });

  // 2. Check backend connection
  const isHealthy = await checkBackendConnection();
  if (isHealthy) {
    console.log('Backend is healthy');
  } else {
    console.warn('Backend is not healthy - some features may not work');
  }

  // 2.5. Set default workspace path
  await initWorkspacePath();

  // 3. Initialize chat service WebSocket listeners
  chatService.initWebSocketListeners();

  // 4. Connect WebSocket
  wsClient.connect();

  // 5. Parallel data loading
  await Promise.allSettled([
    loadAssistants(),
    loadProviders(),
    loadAgentsForExpertMenu(),
    loadMcpForToolMenu(),
  ]);

  // 6. Initialize components (page components now handled by React)
  sidebar.init();
  chatComponent.init();
  messageInput.init();

  // 7. Setup periodic connection check
  setInterval(checkBackendConnection, 8000);

  console.log('Agent Studio Desktop initialized');
}

// ===== Settings Page Navigation (closure for delegation) =====
function switchSettingsPage(pageId, navEl) {
  document.querySelectorAll('.settings-page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById('settings-' + pageId);
  if (target) target.classList.add('active');
  document.querySelectorAll('.settings-nav-item').forEach((n) => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const titles = { general: '系统设置', model: '模型', memory: '记忆', update: '更新' };
  const titleEl = document.getElementById('settings-page-title');
  if (titleEl) titleEl.textContent = titles[pageId] || '设置';
  if (pageId === 'memory') loadMemoryForSettings();
  if (pageId === 'model') loadProvidersForSettingsPage();
}

// ===== Add Model Dialog (closure for delegation) =====
function showAddModelDialog() {
  const dialog = document.getElementById('add-model-dialog');
  if (dialog) {
    dialog.classList.add('visible');
    dialog.setAttribute('data-edit-id', '');
    const title = dialog.querySelector('h3');
    if (title) title.textContent = '添加模型';
    document.getElementById('model-api-url').value = '';
    document.getElementById('model-api-key').value = '';
    document.getElementById('model-name').value = '';
    document.getElementById('model-platform').value = 'openai';
    document.getElementById('model-protocol').value = 'openai';
  }
}

function closeAddModelDialog() {
  const dialog = document.getElementById('add-model-dialog');
  if (dialog) {
    dialog.classList.remove('visible');
    dialog.removeAttribute('data-edit-id');
  }
}

async function saveModel() {
  const platform = document.getElementById('model-platform').value;
  const apiUrl = document.getElementById('model-api-url').value.trim();
  const apiKey = document.getElementById('model-api-key').value.trim();
  const name = document.getElementById('model-name').value.trim();
  const protocol = document.getElementById('model-protocol').value;
  if (!apiUrl || !apiKey || !name) { showToast('请填写必填字段'); return; }
  const body = { name, base_url: apiUrl, api_key: apiKey, protocol, models: [name] };
  const dialog = document.getElementById('add-model-dialog');
  const editId = dialog?.getAttribute('data-edit-id');
  try {
    if (editId) {
      await api.updateProvider(editId, body);
      showToast('已更新');
    } else {
      await api.createProvider(body);
      showToast('模型已添加');
    }
    closeAddModelDialog();
    loadProvidersForSettingsPage();
    loadProviders();
  } catch (err) {
    showToast('操作失败: ' + (err.message || ''));
  }
}

// ===== Auto-fill API URL (for onchange in add model dialog) =====
function autoFillApiUrl(platform) {
  const API_URLS = {
    openai: 'https://api.openai.com',
    'new-api': 'http://localhost:3000',
    deepseek: 'https://api.deepseek.com',
    qwen: 'https://dashscope.aliyuncs.com',
    doubao: 'https://ark.cn-beijing.volces.com',
    baidu: 'https://aip.baidubce.com',
    glm: 'https://open.bigmodel.cn',
    moonshot: 'https://api.moonshot.cn',
    minimax: 'https://api.minimaxi.com',
    step: 'https://api.stepfun.com',
    anthropic: 'https://api.anthropic.com',
    gemini: 'https://generativelanguage.googleapis.com',
  };
  const dialog = document.getElementById('add-model-dialog');
  if (dialog && dialog.getAttribute('data-edit-id')) return;
  const url = API_URLS[platform] || '';
  const input = document.getElementById('model-api-url');
  if (input) input.value = url;
}

// ===== Custom Agent Dialog (closure for delegation) =====
function closeDialog() {
  const overlay = document.getElementById('custom-overlay');
  if (overlay) overlay.style.display = 'none';
}

async function saveCustomAgent() {
  const name = document.getElementById('agent-name').value.trim();
  const command = document.getElementById('agent-command').value.trim();
  const argsStr = document.getElementById('agent-args').value.trim();
  if (!name || !command) { showToast('请填写名称和命令'); return; }
  const body = { name, command };
  if (argsStr) body.args = argsStr.split(/\s+/);
  try {
    await api.createCustomAgent(body);
    showToast('已创建');
    closeDialog();
  } catch (err) {
    showToast('创建失败: ' + (err.message || ''));
  }
}

function showCreateDialog() {
  const overlay = document.getElementById('custom-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  overlay.setAttribute('data-edit-id', '');
  document.getElementById('dialog-title').textContent = '创建自定义助手';
  const saveBtn = document.getElementById('dialog-save-btn');
  if (saveBtn) saveBtn.textContent = '创建';
  document.getElementById('agent-name').value = '';
  document.getElementById('agent-command').value = '';
  document.getElementById('agent-args').value = '';
}

// ===== Conversation helper (closure for delegation) =====
function openConvPage(convId, convTitle) {
  sidebar.openConvPage(convId, convTitle);
}

// ===== Provider helpers (closure for delegation — called from inline scripts) =====
async function fetchModelsForProvider(id) {
  showToast('正在获取模型列表...');
  try {
    await api.fetchProviderModels(id);
    showToast('模型列表已更新');
    loadProvidersForSettingsPage();
  } catch (err) {
    showToast('获取失败: ' + (err.message || ''));
  }
}

async function testConnection(id) {
  showToast('正在测试连接...');
  try {
    await api.tryConnect({ provider_id: id });
    showToast('连接成功 ✓');
  } catch (err) {
    showToast('连接失败: ' + (err.message || ''));
  }
}

async function editProvider(id) {
  try {
    const provider = await api.getProvider(id);
    if (!provider) return;
    const dialog = document.getElementById('add-model-dialog');
    if (dialog) {
      dialog.classList.add('visible');
      dialog.setAttribute('data-edit-id', id);
    }
    const title = dialog?.querySelector('h3');
    if (title) title.textContent = '编辑模型';
    document.getElementById('model-name').value = provider.name || '';
    document.getElementById('model-api-url').value = provider.base_url || '';
    document.getElementById('model-api-key').value = provider.api_key || '';
    if (provider.protocol) {
      document.getElementById('model-protocol').value = provider.protocol;
    }
  } catch (err) {
    showToast('加载失败');
  }
}

async function deleteProvider(id) {
  if (!confirm('确定要删除此提供商吗？')) return;
  try {
    await api.deleteProvider(id);
    showToast('已删除');
    loadProvidersForSettingsPage();
  } catch (err) {
    showToast('删除失败');
  }
}

// ===== Theme Functions =====
function applyTheme(theme) {
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (state.get('theme') === 'auto') {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    });
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

function setTheme(theme) {
  localStorage.setItem('agent-studio-theme', theme);
  state.set('theme', theme);
  applyTheme(theme);
}

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
