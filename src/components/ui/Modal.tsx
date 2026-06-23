import { type ReactNode, useEffect, useCallback } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = '480px',
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="tw-fixed tw-inset-0 tw-bg-[rgba(0,0,0,0.3)] tw-z-[200] tw-flex tw-items-center tw-justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="tw-bg-white tw-border tw-border-[var(--cb-border)] tw-rounded-lg tw-overflow-hidden tw-shadow-[0_8px_24px_rgba(0,0,0,0.12)] tw-w-full tw-max-h-[85vh] tw-flex tw-flex-col"
        style={{ maxWidth }}
      >
        {title && (
          <div className="tw-flex tw-items-center tw-justify-between tw-px-5 tw-py-3 tw-border-b tw-border-[var(--cb-border-subtle)]">
            <h3 className="tw-text-sm tw-font-semibold tw-text-[var(--cb-text-primary)]">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="tw-w-7 tw-h-7 tw-flex tw-items-center tw-justify-center tw-rounded-md tw-text-[var(--wb-color-text-secondary)] hover:tw-bg-[rgba(0,0,0,0.04)] tw-transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="tw-flex-1 tw-overflow-y-auto tw-px-5 tw-py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
