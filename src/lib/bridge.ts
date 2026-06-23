/**
 * Agent Studio Desktop - CustomEvent Bridge
 * Bidirectional communication between legacy JS and React Zustand stores.
 *
 * Usage:
 *   - Legacy JS dispatches CustomEvents, React listens via initLegacyBridge()
 *   - React calls notifyLegacy() to dispatch CustomEvents for legacy JS to handle
 */

import { useUIStore } from '../stores/ui-store';

// ===== Legacy → React: Event handlers =====

interface LegacySwitchPageEvent extends CustomEvent {
  detail: { page: string };
}

interface LegacyOpenConversationEvent extends CustomEvent {
  detail: { convId: string; title: string };
}

interface LegacySetThemeEvent extends CustomEvent {
  detail: { theme: 'light' | 'dark' | 'auto' };
}

/** Build a hash-based path compatible with react-router HashRouter. */
function toHashPath(page: string): string {
  return page === 'home' ? '#/' : `#/${page}`;
}

/**
 * Initialize the legacy-to-React bridge.
 * Call once during app initialization (in main.tsx).
 */
export function initLegacyBridge(): void {
  // Page switching from legacy navigation
  window.addEventListener('legacy:switchPage', ((e: LegacySwitchPageEvent) => {
    const { page } = e.detail;
    if (page) {
      useUIStore.getState().setPage(page);
      // Navigate programmatically by updating the hash (HashRouter compatible)
      const hashPath = toHashPath(page);
      if (window.location.hash !== hashPath) {
        window.location.hash = hashPath;
      }
    }
  }) as EventListener);

  // Open a conversation tab from legacy code
  window.addEventListener('legacy:openConversation', ((e: LegacyOpenConversationEvent) => {
    const { convId, title } = e.detail;
    if (convId) {
      useUIStore.getState().openTab(convId, title || convId);
    }
  }) as EventListener);

  // Theme change from legacy code
  window.addEventListener('legacy:setTheme', ((e: LegacySetThemeEvent) => {
    const { theme } = e.detail;
    if (theme) {
      useUIStore.getState().setTheme(theme);
    }
  }) as EventListener);

  console.log('[Bridge] Legacy-to-React bridge initialized');
}

// ===== React → Legacy: Notifications =====

/**
 * Notify legacy JS code of a React-side event.
 *
 * @param event - Event name (suffixed with 'react:' prefix)
 * @param detail - Event payload
 */
export function notifyLegacy(event: string, detail: unknown): void {
  window.dispatchEvent(new CustomEvent(`react:${event}`, { detail }));
}

/**
 * Common bridge events that React can dispatch to legacy code.
 */
export const BRIDGE_EVENTS = {
  PAGE_CHANGED: 'pageChanged',
  TAB_OPENED: 'tabOpened',
  TAB_CLOSED: 'tabClosed',
  THEME_CHANGED: 'themeChanged',
  CONNECTION_STATUS: 'connectionStatus',
} as const;
