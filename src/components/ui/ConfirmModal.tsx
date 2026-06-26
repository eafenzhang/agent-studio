import { useState, useEffect, useCallback } from 'react';

type ConfirmState = {
  message: string;
  title?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
} | null;

let _confirmState: ConfirmState = null;
let _listeners: Array<() => void> = [];

function notify() {
  _listeners.forEach((fn) => fn());
}

/**
 * Promise-based confirm dialog. Usage:
 *   if (await showConfirm('确定要删除吗？')) { ... }
 *   if (await showConfirm({ message: '确定吗？', danger: true })) { ... }
 */
export function showConfirm(
  options: string | { message: string; danger?: boolean; title?: string }
): Promise<boolean> {
  const msg = typeof options === 'string' ? options : options.message;
  const danger = typeof options === 'object' && options.danger;
  const title = typeof options === 'object' ? options.title : undefined;

  return new Promise((resolve) => {
    _confirmState = { message: msg, danger, title, resolve };
    notify();
  });
}

export default function ConfirmModal() {
  const [, setTick] = useState(0);
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<{ message: string; danger?: boolean; title?: string } | null>(null);

  useEffect(() => {
    const listener = () => {
      if (_confirmState) {
        setState({ message: _confirmState.message, danger: _confirmState.danger, title: _confirmState.title });
        setVisible(true);
      }
    };
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  }, []);

  const handleClose = useCallback((result: boolean) => {
    setVisible(false);
    const s = _confirmState;
    _confirmState = null;
    setTimeout(() => {
      if (s) s.resolve(result);
      setState(null);
    }, 150);
  }, []);

  // Handle keyboard
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, handleClose]);

  if (!visible || !state) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
      }}
      onClick={() => handleClose(false)}
    >
      <div
        style={{
          background: 'var(--cb-main-area-background, #fff)',
          borderRadius: 12,
          width: 360,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {state.title && (
          <div style={{ padding: '20px 24px 0', fontSize: 15, fontWeight: 600, color: 'var(--cb-text-primary)' }}>
            {state.title}
          </div>
        )}
        <div style={{ padding: state.title ? '12px 24px 8px' : '24px 24px 12px', fontSize: 13, color: 'var(--cb-text-secondary)', lineHeight: 1.6 }}>
          {state.message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 24px 16px' }}>
          <button
            onClick={() => handleClose(false)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 13,
              color: 'var(--cb-text-secondary)',
              cursor: 'pointer',
              border: 'none',
              background: 'transparent',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            取消
          </button>
          <button
            onClick={() => handleClose(true)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              border: 'none',
              background: state.danger ? '#ff4d4f' : 'var(--cb-button-primary)',
              color: '#fff',
            }}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
