/**
 * Agent Studio Desktop - Sidebar Component
 * Renders conversation list with date grouping, search, and context menu
 */

import * as api from '../api.js';
import state from '../state.js';
import { escapeHtml, formatTime, groupConversationsByDate, debounce, showToast } from '../utils.js';
import * as chatService from '../services/chat-service.js';
import * as chatComponent from './chat.js';
import * as messageInput from './message-input.js';
import * as tabs from './tabs.js';

let searchQuery = '';
let initialized = false;

// ===== P1: Pin / Archive persistence via localStorage =====
const PIN_KEY = 'agent-studio-pinned';
const ARCHIVE_KEY = 'agent-studio-archived';

function getPinned() {
  try { return JSON.parse(localStorage.getItem(PIN_KEY) || '[]'); } catch (_) { return []; }
}
function setPinned(ids) {
  try { localStorage.setItem(PIN_KEY, JSON.stringify(ids)); } catch (_) { /* ignore */ }
}
function getArchived() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch (_) { return []; }
}
function setArchived(ids) {
  try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(ids)); } catch (_) { /* ignore */ }
}

/**
 * Toggle pin status for a conversation.
 * @param {string} convId
 */
function togglePin(convId) {
  const pinned = getPinned();
  const idx = pinned.indexOf(convId);
  if (idx >= 0) {
    pinned.splice(idx, 1);
    showToast('已取消置顶');
  } else {
    pinned.push(convId);
    showToast('已置顶');
  }
  setPinned(pinned);
  state.set('pinnedConversations', pinned);
  loadConversations();
}

/**
 * Toggle archive status for a conversation.
 * @param {string} convId
 */
function toggleArchive(convId) {
  const archived = getArchived();
  const idx = archived.indexOf(convId);
  if (idx >= 0) {
    archived.splice(idx, 1);
    showToast('已取消归档');
  } else {
    archived.push(convId);
    showToast('已归档');
  }
  setArchived(archived);
  state.set('archivedConversations', archived);
  loadConversations();
}

/**
 * Initialize the sidebar component
 */
export function init() {
  if (initialized) return;
  initialized = true;

  // Load persisted pin/archive state
  state.set('pinnedConversations', getPinned());
  state.set('archivedConversations', getArchived());

  loadConversations();
  bindSidebarEvents();
  bindSearch();

  // Subscribe to conversation changes
  state.subscribe('conversationsChanged', () => {
    loadConversations();
  });
}

/**
 * Load conversations from API and render in sidebar
 */
export async function loadConversations() {
  const container = document.getElementById('recent-conversations');
  const countEl = document.getElementById('conversation-count');
  if (!container) return;

  // P1: Skeleton screen while loading
  container.innerHTML = Array.from({ length: 5 }, (_, i) => {
    const widths = ['90%', '70%', '85%', '60%', '75%'];
    return `<div class="skeleton skeleton-line" style="width:${widths[i]};margin:8px;height:14px;"></div>`;
  }).join('');

  try {
    const result = await api.getConversations();
    const conversations = result?.items || result || [];
    state.set('conversations', conversations);

    if (countEl) countEl.textContent = conversations.length;

    renderConversations(container, conversations);
  } catch (err) {
    console.error('Load conversations error:', err);
    container.innerHTML = '<div style="padding:8px;color:var(--wb-color-text-disabled);font-size:12px;">加载失败</div>';
  }
}

/**
 * Render conversations with date grouping, pin/archive support.
 * @param {HTMLElement} container
 * @param {Array} conversations
 */
function renderConversations(container, conversations) {
  if (!conversations || conversations.length === 0) {
    container.innerHTML = '<div style="padding:8px;color:var(--wb-color-text-disabled);font-size:12px;">暂无对话</div>';
    return;
  }

  const pinned = getPinned();
  const archived = getArchived();

  // Separate pinned, normal, archived
  const pinnedConvs = [];
  const normalConvs = [];
  const archivedConvs = [];

  conversations.forEach((c) => {
    if (searchQuery) {
      const title = (c.name || c.title || '新对话').toLowerCase();
      if (!title.includes(searchQuery.toLowerCase())) {
        // Still include if pinned, but skip archived when searching
        if (!pinned.includes(c.id)) return;
      }
    }
    if (pinned.includes(c.id)) {
      pinnedConvs.push(c);
    } else if (archived.includes(c.id)) {
      archivedConvs.push(c);
    } else {
      normalConvs.push(c);
    }
  });

  // Exclude archived from search (keep them in the archived section)
  if (searchQuery) {
    // Remove archived from results unless they match search
    const filteredArchived = archivedConvs.filter((c) => {
      const title = (c.name || c.title || '新对话').toLowerCase();
      return title.includes(searchQuery.toLowerCase());
    });
    archivedConvs.length = 0;
    archivedConvs.push(...filteredArchived);
  }

  let html = '';

  // Render pinned section
  if (pinnedConvs.length > 0) {
    html += `<div class="conversation-section" style="margin-bottom:4px;">`;
    html += `<div class="conversation-section-label" style="cursor:default;font-size:10px;padding:4px 8px;color:var(--wb-color-text-disabled);text-transform:uppercase;">📌 置顶</div>`;
    pinnedConvs.forEach((conv) => renderConvCard(conv));
    html += `</div>`;
  }

  // Render normal conversations grouped by date
  if (normalConvs.length > 0) {
    const groups = groupConversationsByDate(normalConvs);
    const groupLabels = { today: '今天', yesterday: '昨天', earlier: '更早' };

    Object.entries(groups).forEach(([key, items]) => {
      if (items.length === 0) return;
      html += `<div class="conversation-section" style="margin-bottom:4px;">`;
      html += `<div class="conversation-section-label" style="cursor:default;font-size:10px;padding:4px 8px;color:var(--wb-color-text-disabled);text-transform:uppercase;">${groupLabels[key]}</div>`;
      items.forEach((conv) => renderConvCard(conv));
      html += `</div>`;
    });
  }

  // Render archived section (collapsed)
  if (archivedConvs.length > 0) {
    const archiveId = 'archive-section-' + Date.now();
    html += `<div class="conversation-section" style="margin-bottom:4px;">`;
    html += `<div class="conversation-section-label archive-toggle" data-archive-target="${archiveId}" style="cursor:pointer;font-size:10px;padding:4px 8px;color:var(--wb-color-text-disabled);text-transform:uppercase;display:flex;align-items:center;gap:4px;">`;
    html += `<span class="archive-chevron">▶</span> 已归档 (${archivedConvs.length})`;
    html += `</div>`;
    html += `<div id="${archiveId}" class="archive-items" style="display:none;">`;
    archivedConvs.forEach((conv) => renderConvCard(conv));
    html += `</div></div>`;
  }

  if (!html) {
    html = '<div style="padding:8px;color:var(--wb-color-text-disabled);font-size:12px;">未找到匹配的对话</div>';
  }

  container.innerHTML = html;

  // Bind archive toggle
  container.querySelectorAll('.archive-toggle').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.dataset.archiveTarget;
      const target = document.getElementById(targetId);
      if (target) {
        const isHidden = target.style.display === 'none';
        target.style.display = isHidden ? '' : 'none';
        const chevron = toggle.querySelector('.archive-chevron');
        if (chevron) chevron.textContent = isHidden ? '▼' : '▶';
      }
    });
  });

  // Bind card click events
  container.querySelectorAll('.conversation-agent-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      const convId = card.dataset.convId;
      const titleEl = card.querySelector('.conversation-agent-card__title');
      const title = titleEl ? titleEl.textContent : '会话';
      openConvPage(convId, title);
    });

    // Right-click context menu for pin/archive
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const convId = card.dataset.convId;
      showContextMenu(e.clientX, e.clientY, convId);
    });
  });

  // Bind action buttons
  container.querySelectorAll('[data-action="rename"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const currentTitle = btn.dataset.title;
      handleRename(id, currentTitle);
    });
  });

  container.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      handleDelete(id);
    });
  });
}

/**
 * Generate HTML for a single conversation card.
 * @param {Object} conv
 * @returns {string}
 */
function renderConvCard(conv) {
  const title = escapeHtml(conv.name || conv.title || '新对话');
  const time = formatTime(conv.updatedAt);
  const isActive = state.get('currentConversationId') === conv.id;
  const isPinned = getPinned().includes(conv.id);

  return `
    <div class="conversation-agent-card ${isActive ? 'selected' : ''}" data-conv-id="${conv.id}">
      <div class="conversation-agent-card__info">
        <div class="conversation-agent-card__title">${isPinned ? '📌 ' : ''}${title}</div>
        ${time ? `<div class="conversation-agent-card__meta">${time}</div>` : ''}
      </div>
      <div class="conversation-agent-card__actions">
        <button class="card-action-btn" data-action="rename" data-id="${conv.id}" data-title="${escapeHtml(conv.name || conv.title || '新会话')}" title="重命名">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:12px;height:12px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-action-btn" data-action="delete" data-id="${conv.id}" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="width:12px;height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Show a right-click context menu for pin/archive.
 * @param {number} x
 * @param {number} y
 * @param {string} convId
 */
function showContextMenu(x, y, convId) {
  // Remove any existing context menu
  const existing = document.getElementById('sidebar-context-menu');
  if (existing) existing.remove();

  const pinned = getPinned();
  const archived = getArchived();
  const isPinned = pinned.includes(convId);
  const isArchived = archived.includes(convId);

  const menu = document.createElement('div');
  menu.id = 'sidebar-context-menu';
  menu.style.cssText = `
    position:fixed;left:${x}px;top:${y}px;z-index:9999;
    background:var(--cb-bg-secondary, #fff);border:1px solid var(--cb-border-subtle, #e0e0e0);
    border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.12);padding:4px 0;min-width:140px;
  `;
  menu.innerHTML = `
    <div class="context-menu-item" data-action="ctxPin" data-conv-id="${convId}" style="padding:6px 12px;cursor:pointer;font-size:12px;color:var(--cb-text-primary);">${isPinned ? '📌 取消置顶' : '📌 置顶'}</div>
    <div class="context-menu-item" data-action="ctxArchive" data-conv-id="${convId}" style="padding:6px 12px;cursor:pointer;font-size:12px;color:var(--cb-text-primary);">${isArchived ? '📂 取消归档' : '📦 归档'}</div>
  `;
  document.body.appendChild(menu);

  // Bind actions
  menu.querySelector('[data-action="ctxPin"]').addEventListener('click', () => {
    togglePin(convId);
    menu.remove();
  });
  menu.querySelector('[data-action="ctxArchive"]').addEventListener('click', () => {
    toggleArchive(convId);
    menu.remove();
  });

  // Close on outside click
  const closeHandler = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeHandler);
    }
  };
  setTimeout(() => document.addEventListener('click', closeHandler), 0);
}

/**
 * Open a conversation page (now uses tabs).
 * @param {string} convId
 * @param {string} convTitle
 */
export function openConvPage(convId, convTitle) {
  // Delegate to tabs component
  tabs.openTab(convId, convTitle);
}

/**
 * Handle rename conversation
 * @param {string} id
 * @param {string} currentTitle
 */
async function handleRename(id, currentTitle) {
  const newTitle = prompt('请输入新的会话名称:', currentTitle);
  if (!newTitle || newTitle.trim() === currentTitle) return;

  await chatService.renameConversation(id, newTitle.trim());
  loadConversations();
}

/**
 * Handle delete conversation
 * @param {string} id
 */
async function handleDelete(id) {
  if (!confirm('确定要删除此会话吗？')) return;
  await chatService.deleteConversation(id);

  // If deleting current conversation, go back to home
  if (state.get('currentConversationId') === id) {
    state.set('currentConversationId', null);
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    const home = document.getElementById('page-home');
    if (home) home.classList.add('active');
    const topbar = document.getElementById('topbar-title');
    if (topbar) topbar.textContent = '新建任务';
  }

  loadConversations();
}

/**
 * Bind sidebar events
 */
function bindSidebarEvents() {
  // New task button (home tab)
  const newTaskBtn = document.querySelector('.conversation-list-tab-button[data-page="home"], .conversation-list-tab-button-box.active');
  // Already handled by app.js page switching

  // Sidebar toggle
  const toggleBtn = document.getElementById('topbar-expand-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleSidebar);
  }
}

/**
 * Toggle sidebar collapse
 */
let sidebarCollapsed = false;
export function toggleSidebar() {
  const sb = document.querySelector('.conversation-list');
  const btn = document.getElementById('topbar-expand-btn');
  sidebarCollapsed = !sidebarCollapsed;
  if (sb) {
    sb.classList.toggle('collapsed', sidebarCollapsed);
  }
  if (btn) {
    btn.style.display = sidebarCollapsed ? 'flex' : 'none';
  }
  state.set('sidebarCollapsed', sidebarCollapsed);
}

/**
 * Bind search box
 */
function bindSearch() {
  // Create a search input in the sidebar if it doesn't exist
  let searchInput = document.getElementById('sidebar-search');
  if (!searchInput) {
    const content = document.querySelector('.conversation-list-content');
    if (content) {
      const searchDiv = document.createElement('div');
      searchDiv.style.cssText = 'padding:0 0 8px;';
      searchDiv.innerHTML = `
        <div class="artifact-search" style="max-width:none;width:100%;margin:0;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="sidebar-search" placeholder="搜索对话..." style="font-size:12px;" />
        </div>
      `;
      content.insertBefore(searchDiv, content.firstChild);
      searchInput = document.getElementById('sidebar-search');
    }
  }

  if (searchInput) {
    const debouncedSearch = debounce(() => {
      searchQuery = searchInput.value.trim();
      const conversations = state.get('conversations') || [];
      const container = document.getElementById('recent-conversations');
      if (container) {
        renderConversations(container, conversations);
      }
    }, 200);
    searchInput.addEventListener('input', debouncedSearch);
  }
}

export default { init, loadConversations, openConvPage, toggleSidebar };
