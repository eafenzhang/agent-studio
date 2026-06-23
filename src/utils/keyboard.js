/**
 * Agent Studio Desktop - Global Keyboard Shortcut Registry
 * Unified keydown listener with scope and compositing awareness.
 */

const shortcutRegistry = new Map();

/**
 * Register a keyboard shortcut handler.
 * @param {string} keyCombo - e.g. 'Ctrl+N', 'Ctrl+Shift+K', 'Escape'
 * @param {Function} handler - callback receiving the KeyboardEvent
 * @param {string} scope - 'global' (always fires) or scope hint for future use
 */
export function register(keyCombo, handler, scope = 'global') {
  if (!keyCombo || typeof handler !== 'function') return;
  shortcutRegistry.set(keyCombo, { handler, scope });
}

/**
 * Unregister a keyboard shortcut.
 * @param {string} keyCombo
 */
export function unregister(keyCombo) {
  shortcutRegistry.delete(keyCombo);
}

/**
 * Build a canonical key string from a KeyboardEvent.
 * @param {KeyboardEvent} e
 * @returns {string}
 */
export function buildKeyString(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  // Ignore bare modifier key-down
  if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return '';
  // Normalize certain key names
  const key = e.key === 'Escape' ? 'Escape' : e.key === 'Tab' ? 'Tab' : e.key;
  parts.push(key);
  return parts.join('+');
}

/**
 * Initialize the global keyboard listener. Call once in app init.
 */
export function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    // Skip when IME is composing
    if (e.isComposing) return;

    const target = e.target;
    const isInput =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable;

    // Ctrl+Enter in textarea is special — send message
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isInput) {
      const handler = shortcutRegistry.get('Ctrl+Enter');
      if (handler) {
        e.preventDefault();
        handler.handler(e);
      }
      return;
    }

    // Inside input fields, only allow Ctrl+Enter; skip everything else
    if (isInput && !e.ctrlKey && !e.metaKey) return;

    const key = buildKeyString(e);
    if (!key) return;

    const entry = shortcutRegistry.get(key);
    if (entry) {
      e.preventDefault();
      entry.handler(e);
    }
  });
}

export default { register, unregister, initKeyboard, buildKeyString };
