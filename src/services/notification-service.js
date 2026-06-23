/**
 * Agent Studio Desktop - Desktop Notification Service (P1-4)
 * Uses browser Notification API (Tauri plugin not confirmed installed).
 * Throttles: max 1 notification per conversation per 10 seconds.
 */

/**
 * Send a desktop notification if the tab is not visible.
 * @param {string} title - notification title
 * @param {string} body - notification body text
 * @param {string} [conversationId] - optional conversation ID for throttling
 */
export function notify(title, body, conversationId) {
  // Only notify when the page is hidden
  if (document.visibilityState === 'visible') return;

  // Throttle: max once per 10s per conversation
  if (conversationId) {
    const key = `notify-${conversationId}`;
    const lastNotify = parseInt(sessionStorage.getItem(key) || '0', 10);
    if (Date.now() - lastNotify < 10000) return;
    try {
      sessionStorage.setItem(key, Date.now().toString());
    } catch (_) {
      // sessionStorage may be unavailable
    }
  }

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.ico' });
    } catch (_) {
      // Notification constructor may throw in some environments
    }
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        try {
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch (_) { /* ignore */ }
      }
    }).catch(() => {
      // Permission request rejected
    });
  }
}

export default { notify };
