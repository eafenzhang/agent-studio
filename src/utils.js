/**
 * Agent Studio Desktop - Utility Functions
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

/**
 * Format a timestamp into a human-readable relative time
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export function formatTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 86400000 * 2) return '昨天';
  return `${Math.floor(diff / 86400000)} 天前`;
}

/**
 * Format an absolute timestamp as HH:MM
 * @param {string|number|Date} timestamp
 * @returns {string}
 */
export function formatClock(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Format file size in human-readable units
 * @param {number} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Debounce a function call
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Group conversations by date (today / yesterday / earlier)
 * @param {Array} conversations
 * @returns {Object} { today: [], yesterday: [], earlier: [] }
 */
export function groupConversationsByDate(conversations) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  const groups = { today: [], yesterday: [], earlier: [] };

  conversations.forEach((conv) => {
    const ts = conv.updatedAt || conv.createdAt || 0;
    const date = new Date(ts);
    if (date >= todayStart) {
      groups.today.push(conv);
    } else if (date >= yesterdayStart) {
      groups.yesterday.push(conv);
    } else {
      groups.earlier.push(conv);
    }
  });

  return groups;
}

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('已复制到剪贴板');
    return true;
  } catch {
    // Fallback for older browsers / Tauri webview
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showToast('已复制到剪贴板');
      return true;
    } catch {
      showToast('复制失败');
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Show a toast notification
 * @param {string} msg
 * @param {number} duration
 */
export function showToast(msg, duration = 2500) {
  let t = document.getElementById('toast-notification');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-notification';
    t.className = 'toast-notification';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.classList.remove('show');
  }, duration);
}

/**
 * Toggle a dropdown menu (closes all others first)
 * @param {string} menuId
 */
export function toggleDropdown(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;
  const wasOpen = menu.classList.contains('open');
  document.querySelectorAll('.chat-dropdown-menu').forEach((m) => {
    m.classList.remove('open');
  });
  if (!wasOpen) menu.classList.add('open');
}

/**
 * Select a dropdown item: update label and close menu
 * @param {string} labelId
 * @param {string} value
 * @param {HTMLElement} el
 */
export function selectDropdown(labelId, value, el) {
  const label = document.getElementById(labelId);
  if (label) label.textContent = value;
  const menu = el.closest('.chat-dropdown-menu');
  if (menu) {
    menu.querySelectorAll('.chat-dropdown-item').forEach((i) => {
      i.classList.remove('active');
    });
    el.classList.add('active');
    menu.classList.remove('open');
  }
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Truncate text to a max length with ellipsis
 * @param {string} text
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(text, maxLen = 80) {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen) + '...';
}

/**
 * Get a color from a string hash (for avatar backgrounds)
 * @param {string} str
 * @returns {string}
 */
export function colorFromString(str) {
  const colors = [
    '#6c4dff', '#00b96b', '#ff6b6b', '#ffa940',
    '#36cfc9', '#f759ab', '#9254de', '#597ef7',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Get initials from a name
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

/**
 * Escape a string for safe use in HTML attributes (data-* and quoted attrs)
 * @param {string} str
 * @returns {string}
 */
export function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export default {
  escapeHtml,
  escapeAttr,
  formatTime,
  formatClock,
  formatSize,
  debounce,
  groupConversationsByDate,
  copyToClipboard,
  showToast,
  toggleDropdown,
  selectDropdown,
  genId,
  truncate,
  colorFromString,
  getInitials,
};
