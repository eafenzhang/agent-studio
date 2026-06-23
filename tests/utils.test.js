/**
 * Tests for utils.js - Utility Functions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to import after jsdom is set up
import {
  escapeHtml,
  formatTime,
  formatClock,
  formatSize,
  debounce,
  groupConversationsByDate,
  genId,
  truncate,
  colorFromString,
  getInitials,
  showToast,
  toggleDropdown,
  selectDropdown,
} from '../src/utils.js';

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert("xss")&lt;/script&gt;'
    );
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('should not escape double quotes (textContent/innerHTML behavior)', () => {
    // Note: textContent/innerHTML escapes <, >, & but NOT " or '
    // This is standard DOM behavior
    expect(escapeHtml('"hello"')).toBe('"hello"');
  });

  it('should return empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should convert non-string to string', () => {
    expect(escapeHtml(123)).toBe('123');
  });

  it('should handle plain text without changes', () => {
    expect(escapeHtml('hello world')).toBe('hello world');
  });
});

describe('formatTime', () => {
  it('should return empty string for falsy input', () => {
    expect(formatTime(null)).toBe('');
    expect(formatTime(undefined)).toBe('');
    expect(formatTime(0)).toBe('');
  });

  it('should return "刚刚" for time less than 1 minute ago', () => {
    const now = Date.now();
    expect(formatTime(now - 30000)).toBe('刚刚');
  });

  it('should return "X 分钟前" for time less than 1 hour ago', () => {
    const now = Date.now();
    expect(formatTime(now - 5 * 60000)).toBe('5 分钟前');
  });

  it('should return "X 小时前" for time less than 1 day ago', () => {
    const now = Date.now();
    expect(formatTime(now - 3 * 3600000)).toBe('3 小时前');
  });

  it('should return "昨天" for time between 1 and 2 days ago', () => {
    const now = Date.now();
    expect(formatTime(now - 86400000 - 3600000)).toBe('昨天');
  });

  it('should return "X 天前" for time more than 2 days ago', () => {
    const now = Date.now();
    expect(formatTime(now - 5 * 86400000)).toBe('5 天前');
  });
});

describe('formatClock', () => {
  it('should return empty string for falsy input', () => {
    expect(formatClock(null)).toBe('');
    expect(formatClock(undefined)).toBe('');
  });

  it('should format time as HH:MM', () => {
    const date = new Date(2025, 0, 1, 9, 5);
    expect(formatClock(date)).toBe('09:05');
  });

  it('should format time as HH:MM for afternoon', () => {
    const date = new Date(2025, 0, 1, 14, 30);
    expect(formatClock(date)).toBe('14:30');
  });
});

describe('formatSize', () => {
  it('should return empty string for falsy input', () => {
    expect(formatSize(0)).toBe('');
    expect(formatSize(null)).toBe('');
  });

  it('should format bytes', () => {
    expect(formatSize(500)).toBe('500 B');
  });

  it('should format kilobytes', () => {
    expect(formatSize(2048)).toBe('2.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should debounce function calls', () => {
    vi.useRealTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(fn).toHaveBeenCalledTimes(1);
        resolve();
      }, 150);
    });
  });

  it('should pass arguments to the debounced function', () => {
    vi.useRealTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced('arg1', 'arg2');

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        resolve();
      }, 100);
    });
  });

  it('should reset timer on subsequent calls', () => {
    vi.useRealTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();

    return new Promise((resolve) => {
      setTimeout(() => {
        expect(fn).not.toHaveBeenCalled();
        debounced();
        resolve();
      }, 50);
    }).then(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(fn).not.toHaveBeenCalled();
          resolve();
        }, 50);
      });
    }).then(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(fn).toHaveBeenCalledTimes(1);
          resolve();
        }, 100);
      });
    });
  });
});

describe('groupConversationsByDate', () => {
  it('should group conversations into today, yesterday, earlier', () => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const conversations = [
      { id: '1', name: 'Today conv', updatedAt: now - 60000 }, // 1 minute ago (robust near midnight)
      { id: '2', name: 'Yesterday conv', updatedAt: todayStart.getTime() - 3600000 }, // yesterday
      { id: '3', name: 'Older conv', updatedAt: now - 5 * 86400000 }, // 5 days ago
    ];

    const groups = groupConversationsByDate(conversations);

    expect(groups.today).toHaveLength(1);
    expect(groups.yesterday).toHaveLength(1);
    expect(groups.earlier).toHaveLength(1);
  });

  it('should handle empty array', () => {
    const groups = groupConversationsByDate([]);
    expect(groups.today).toEqual([]);
    expect(groups.yesterday).toEqual([]);
    expect(groups.earlier).toEqual([]);
  });

  it('should support updatedAt field (camelCase)', () => {
    const now = Date.now();
    const conversations = [
      { id: '1', updatedAt: now - 30000 },
    ];

    const groups = groupConversationsByDate(conversations);
    expect(groups.today).toHaveLength(1);
  });

  it('should support createdAt as fallback', () => {
    const now = Date.now();
    const conversations = [
      { id: '1', createdAt: now - 30000 },
    ];

    const groups = groupConversationsByDate(conversations);
    expect(groups.today).toHaveLength(1);
  });

  it('should put conversations with no timestamp into earlier', () => {
    const conversations = [
      { id: '1', name: 'No timestamp' },
    ];

    const groups = groupConversationsByDate(conversations);
    // ts defaults to 0, which is 1970, so it goes to earlier
    expect(groups.earlier).toHaveLength(1);
  });
});

describe('genId', () => {
  it('should generate a unique string ID', () => {
    const id1 = genId();
    const id2 = genId();
    expect(id1).not.toBe(id2);
    expect(typeof id1).toBe('string');
    expect(id1.length).toBeGreaterThan(0);
  });
});

describe('truncate', () => {
  it('should return empty string for falsy input', () => {
    expect(truncate(null)).toBe('');
    expect(truncate('')).toBe('');
  });

  it('should return text as-is if shorter than maxLen', () => {
    expect(truncate('hello', 80)).toBe('hello');
  });

  it('should truncate and add ellipsis', () => {
    expect(truncate('hello world this is a long text', 10)).toBe('hello worl...');
  });

  it('should use default maxLen of 80', () => {
    const longText = 'a'.repeat(100);
    const result = truncate(longText);
    expect(result).toBe('a'.repeat(80) + '...');
  });
});

describe('colorFromString', () => {
  it('should return a hex color string', () => {
    const color = colorFromString('test');
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('should return consistent color for the same input', () => {
    expect(colorFromString('hello')).toBe(colorFromString('hello'));
  });

  it('should return different colors for different inputs', () => {
    // Not guaranteed but highly likely for different strings
    const colors = new Set();
    for (let i = 0; i < 20; i++) {
      colors.add(colorFromString(`string-${i}`));
    }
    expect(colors.size).toBeGreaterThan(1);
  });
});

describe('getInitials', () => {
  it('should return "?" for empty/null name', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(null)).toBe('?');
    expect(getInitials(undefined)).toBe('?');
  });

  it('should return uppercase first character', () => {
    expect(getInitials('alice')).toBe('A');
    expect(getInitials('Bob')).toBe('B');
  });
});

describe('showToast', () => {
  it('should create a toast element if it does not exist', () => {
    document.body.innerHTML = '';
    showToast('Test message');
    const toast = document.getElementById('toast-notification');
    expect(toast).not.toBeNull();
    expect(toast.textContent).toBe('Test message');
    expect(toast.classList.contains('show')).toBe(true);
  });

  it('should reuse existing toast element', () => {
    document.body.innerHTML = '<div id="toast-notification" class="toast-notification"></div>';
    showToast('New message');
    const toasts = document.querySelectorAll('#toast-notification');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].textContent).toBe('New message');
  });
});

describe('toggleDropdown', () => {
  it('should open a closed dropdown', () => {
    document.body.innerHTML = `
      <div class="chat-dropdown-menu" id="test-menu"></div>
    `;
    toggleDropdown('test-menu');
    const menu = document.getElementById('test-menu');
    expect(menu.classList.contains('open')).toBe(true);
  });

  it('should close an open dropdown', () => {
    document.body.innerHTML = `
      <div class="chat-dropdown-menu open" id="test-menu"></div>
    `;
    toggleDropdown('test-menu');
    const menu = document.getElementById('test-menu');
    expect(menu.classList.contains('open')).toBe(false);
  });

  it('should close other dropdowns when opening one', () => {
    document.body.innerHTML = `
      <div class="chat-dropdown-menu open" id="menu1"></div>
      <div class="chat-dropdown-menu" id="menu2"></div>
    `;
    toggleDropdown('menu2');
    expect(document.getElementById('menu1').classList.contains('open')).toBe(false);
    expect(document.getElementById('menu2').classList.contains('open')).toBe(true);
  });

  it('should do nothing if menu does not exist', () => {
    toggleDropdown('non-existent');
    // Should not throw
  });
});

describe('selectDropdown', () => {
  it('should update the label text', () => {
    document.body.innerHTML = `
      <span id="test-label">Old</span>
      <div class="chat-dropdown-menu">
        <div class="chat-dropdown-item active">Old</div>
        <div class="chat-dropdown-item">New</div>
      </div>
    `;
    const newItem = document.querySelectorAll('.chat-dropdown-item')[1];
    selectDropdown('test-label', 'New Value', newItem);
    expect(document.getElementById('test-label').textContent).toBe('New Value');
  });

  it('should set active class on selected item and remove from others', () => {
    document.body.innerHTML = `
      <span id="test-label">Old</span>
      <div class="chat-dropdown-menu">
        <div class="chat-dropdown-item active">Old</div>
        <div class="chat-dropdown-item">New</div>
      </div>
    `;
    const newItem = document.querySelectorAll('.chat-dropdown-item')[1];
    selectDropdown('test-label', 'New', newItem);

    expect(document.querySelectorAll('.chat-dropdown-item')[0].classList.contains('active')).toBe(false);
    expect(document.querySelectorAll('.chat-dropdown-item')[1].classList.contains('active')).toBe(true);
  });

  it('should close the dropdown menu', () => {
    document.body.innerHTML = `
      <span id="test-label">Old</span>
      <div class="chat-dropdown-menu open">
        <div class="chat-dropdown-item">New</div>
      </div>
    `;
    const item = document.querySelector('.chat-dropdown-item');
    selectDropdown('test-label', 'New', item);
    expect(document.querySelector('.chat-dropdown-menu').classList.contains('open')).toBe(false);
  });
});
