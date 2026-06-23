/**
 * Agent Studio Desktop - Tab Bar Component
 * Renders and manages conversation tabs (P1-1).
 * Architecture: display:none/block to preserve DOM, no destroy.
 */

import state from '../state.js';
import { escapeHtml, genId } from '../utils.js';
import * as chatComponent from './chat.js';
import * as messageInput from './message-input.js';
import * as chatService from '../services/chat-service.js';

/** @type {HTMLElement|null} */
let tabBarContainer = null;

/** Persist tab state in sessionStorage */
const TAB_STORAGE_KEY = 'agent-studio-tabs';

function persistTabs() {
  const tabs = state.get('openTabs') || [];
  const activeIndex = state.get('activeTabIndex');
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, JSON.stringify({ tabs, activeIndex }));
  } catch (_) {
    // sessionStorage may be full
  }
}

function restoreTabs() {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (raw) {
      const { tabs, activeIndex } = JSON.parse(raw);
      if (Array.isArray(tabs) && tabs.length > 0) {
        state.set('openTabs', tabs);
        state.set('activeTabIndex', typeof activeIndex === 'number' ? activeIndex : 0);
        return true;
      }
    }
  } catch (_) { /* ignore */ }
  return false;
}

/**
 * Initialize the tab bar: create DOM container, restore tabs, bind events.
 */
export function init() {
  ensureTabBarContainer();
  const restored = restoreTabs();
  if (restored) {
    renderTabBar();
    const tabs = state.get('openTabs') || [];
    const idx = state.get('activeTabIndex') || 0;
    if (tabs[idx]) {
      activateTabContent(tabs[idx].conversationId, idx);
    }
  }
}

/**
 * Ensure the tab bar DOM container exists.
 */
function ensureTabBarContainer() {
  if (document.getElementById('tab-bar')) return;
  const detail = document.getElementById('conversation-detail');
  if (!detail) return;
  const bar = document.createElement('div');
  bar.id = 'tab-bar';
  bar.className = 'tab-bar';
  // Insert before conversation-messages
  const messages = document.getElementById('conversation-messages');
  if (messages) {
    detail.insertBefore(bar, messages);
  } else {
    detail.insertBefore(bar, detail.firstChild);
  }
  tabBarContainer = bar;
}

/**
 * Render the tab bar from state.
 */
export function renderTabBar() {
  const bar = document.getElementById('tab-bar');
  if (!bar) { ensureTabBarContainer(); return; }
  tabBarContainer = bar;

  const tabs = state.get('openTabs') || [];
  const activeIndex = state.get('activeTabIndex') || 0;

  bar.innerHTML =
    tabs
      .map((tab, i) => {
        const title = tab.title || '新会话';
        return `
        <div class="tab-item ${i === activeIndex ? 'active' : ''}"
             data-tab-index="${i}"
             data-action="activateTab"
             title="${escapeHtml(title)}">
          <span class="tab-title">${escapeHtml(truncateTitle(title))}</span>
          <button class="tab-close" data-action="closeTab" data-tab-index="${i}" title="关闭">×</button>
        </div>
      `;
      })
      .join('') +
    `<button class="tab-add" data-action="addTab" title="新建会话 (Ctrl+N)">+</button>`;

  // Bind click events
  bindTabBarEvents(bar);
}

/**
 * Truncate a title for display.
 * @param {string} title
 * @param {number} max
 * @returns {string}
 */
function truncateTitle(title, max = 20) {
  if (!title) return '新会话';
  return title.length > max ? title.substring(0, max) + '…' : title;
}

/**
 * Bind click events on the tab bar.
 * @param {HTMLElement} bar
 */
function bindTabBarEvents(bar) {
  // Activate tab
  bar.querySelectorAll('.tab-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.tab-close')) return;
      const idx = parseInt(item.dataset.tabIndex, 10);
      activateTab(idx);
    });
  });

  // Close tab
  bar.querySelectorAll('.tab-close').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.tabIndex, 10);
      closeTab(idx);
    });
  });

  // Add tab
  const addBtn = bar.querySelector('.tab-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => addTab());
  }
}

/**
 * Activate a tab by index.
 * @param {number} index
 */
export function activateTab(index) {
  const tabs = state.get('openTabs') || [];
  if (index < 0 || index >= tabs.length) return;

  state.set('activeTabIndex', index);

  // Show conversation detail
  const detail = document.getElementById('conversation-detail');
  if (detail) detail.classList.add('active');

  // Hide all pages
  document.querySelectorAll('.page').forEach((p) => {
    p.classList.remove('active', 'page-fade-in');
  });

  const tab = tabs[index];
  state.set('currentConversationId', tab.conversationId);
  state.set('currentPage', 'conversation');

  // Update topbar
  const topbar = document.getElementById('topbar-title');
  if (topbar) topbar.textContent = tab.title || '会话';

  // Update sidebar selection
  document.querySelectorAll('.conversation-agent-card').forEach((c) => {
    c.classList.remove('selected');
  });
  const card = document.querySelector(`.conversation-agent-card[data-conv-id="${tab.conversationId}"]`);
  if (card) card.classList.add('selected');

  renderTabBar();

  // Load messages via tabbed content container
  activateTabContent(tab.conversationId, index);
}

/**
 * Show the content for the active tab conversation.
 * Creates/activates the per-conversation DOM container.
 * @param {string} conversationId
 * @param {number} index
 */
function activateTabContent(conversationId, index) {
  // Hide all tab content panels
  document.querySelectorAll('.tab-conversation-content').forEach((el) => {
    el.style.display = 'none';
  });

  const targetId = `tab-conv-${conversationId}`;
  let panel = document.getElementById(targetId);

  const messagesContainer = document.getElementById('conversation-messages');
  if (!messagesContainer) return;

  if (!panel) {
    panel = document.createElement('div');
    panel.id = targetId;
    panel.className = 'tab-conversation-content';
    panel.style.display = 'block';
    messagesContainer.appendChild(panel);
    // Load messages for this conversation
    chatComponent.loadAndRenderForTab(conversationId, panel);
  } else {
    panel.style.display = 'block';
  }

  // Re-bind message input for the conversation detail
  setTimeout(() => messageInput.init(), 100);
}

/**
 * Open a conversation in a tab (or activate existing).
 * @param {string} conversationId
 * @param {string} title
 */
export function openTab(conversationId, title) {
  if (!conversationId) return;

  const tabs = state.get('openTabs') || [];

  // Check if already open
  const existingIndex = tabs.findIndex((t) => t.conversationId === conversationId);
  if (existingIndex >= 0) {
    activateTab(existingIndex);
    return;
  }

  // Add new tab
  tabs.push({ conversationId, title: title || '新会话', isDirty: false });
  state.set('openTabs', tabs);
  state.set('activeTabIndex', tabs.length - 1);

  // Show conversation detail
  const detail = document.getElementById('conversation-detail');
  if (detail) detail.classList.add('active');

  // Update state
  state.set('currentConversationId', conversationId);
  state.set('currentPage', 'conversation');

  // Update topbar
  const topbar = document.getElementById('topbar-title');
  if (topbar) topbar.textContent = title || '会话';

  renderTabBar();
  activateTabContent(conversationId, tabs.length - 1);

  persistTabs();
}

/**
 * Close a tab by index.
 * @param {number} index
 */
export function closeTab(index) {
  const tabs = state.get('openTabs') || [];
  if (tabs.length === 0 || index < 0 || index >= tabs.length) return;

  const closedConvId = tabs[index].conversationId;

  // Remove tab content panel
  const panel = document.getElementById(`tab-conv-${closedConvId}`);
  if (panel) panel.remove();

  tabs.splice(index, 1);
  state.set('openTabs', tabs);

  if (tabs.length === 0) {
    state.set('activeTabIndex', -1);
    state.set('currentConversationId', null);
    // Hide conversation detail
    const detail = document.getElementById('conversation-detail');
    if (detail) detail.classList.remove('active');
    const topbar = document.getElementById('topbar-title');
    if (topbar) topbar.textContent = '新建任务';
  } else {
    const newIndex = Math.min(index, tabs.length - 1);
    state.set('activeTabIndex', newIndex);
    activateTab(newIndex);
  }

  renderTabBar();
  persistTabs();
}

/**
 * Add a new empty tab (Ctrl+N).
 */
export function addTab() {
  const convId = genId();
  const tabs = state.get('openTabs') || [];
  tabs.push({ conversationId: convId, title: '新会话', isDirty: false });
  state.set('openTabs', tabs);
  state.set('activeTabIndex', tabs.length - 1);
  state.set('currentConversationId', convId);
  state.set('currentPage', 'conversation');

  // Show conversation detail
  const detail = document.getElementById('conversation-detail');
  if (detail) detail.classList.add('active');

  const topbar = document.getElementById('topbar-title');
  if (topbar) topbar.textContent = '新会话';

  renderTabBar();
  activateTabContent(convId, tabs.length - 1);

  persistTabs();
}

/**
 * Update the title of the currently active tab.
 * @param {string} title
 */
export function updateActiveTabTitle(title) {
  const tabs = state.get('openTabs') || [];
  const index = state.get('activeTabIndex');
  if (index >= 0 && index < tabs.length) {
    tabs[index].title = title || '新会话';
    state.set('openTabs', tabs);
    renderTabBar();
    persistTabs();
  }
}

/**
 * Navigate to the next tab (Ctrl+Tab).
 */
export function nextTab() {
  const tabs = state.get('openTabs') || [];
  if (tabs.length <= 1) return;
  const current = state.get('activeTabIndex') || 0;
  const next = (current + 1) % tabs.length;
  activateTab(next);
}

/**
 * Navigate to the previous tab (Ctrl+Shift+Tab).
 */
export function prevTab() {
  const tabs = state.get('openTabs') || [];
  if (tabs.length <= 1) return;
  const current = state.get('activeTabIndex') || 0;
  const prev = (current - 1 + tabs.length) % tabs.length;
  activateTab(prev);
}

/**
 * Get the panel element for the active tab's conversation.
 * @returns {HTMLElement|null}
 */
export function getActiveTabPanel() {
  const convId = state.get('currentConversationId');
  if (!convId) return document.getElementById('conversation-messages');
  return document.getElementById(`tab-conv-${convId}`) || document.getElementById('conversation-messages');
}

export default { init, renderTabBar, openTab, activateTab, closeTab, addTab, nextTab, prevTab, updateActiveTabTitle, getActiveTabPanel };
