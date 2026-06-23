export function initKeyboard(): void;
export function register(shortcut: string, callback: () => void): void;
export function unregister(shortcut: string, callback?: () => void): void;
