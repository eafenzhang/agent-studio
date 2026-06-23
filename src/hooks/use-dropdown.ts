import { useState, useCallback, useEffect, useRef } from 'react';

export interface UseDropdownReturn {
  /** The currently open dropdown name, or `null` if all are closed. */
  open: string | null;
  /** Toggle the named dropdown. */
  toggle: (name: string) => void;
  /** Close any open dropdown. */
  close: () => void;
  /** Check whether the named dropdown is currently open. */
  isOpen: (name: string) => boolean;
  /** Attach this ref to the dropdown container so outside clicks close it. */
  ref: (node: HTMLDivElement | null) => void;
}

/**
 * Unified dropdown state hook.
 *
 * Manages a single open dropdown name — at most one dropdown is open at a time.
 * Automatically closes the dropdown when clicking outside the container or pressing Escape.
 *
 * Usage:
 *   const dropdown = useDropdown();
 *   <div ref={dropdown.ref}>
 *     <button onClick={() => dropdown.toggle('myMenu')}>Toggle</button>
 *     <div className={dropdown.isOpen('myMenu') ? 'open' : ''}>...</div>
 *   </div>
 */
export function useDropdown(): UseDropdownReturn {
  const [open, setOpen] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const toggle = useCallback((name: string) => {
    setOpen((prev) => (prev === name ? null : name));
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const isOpen = useCallback((name: string) => open === name, [open]);

  const ref = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
  }, []);

  // Close the active dropdown on clicks outside the container or on Escape.
  useEffect(() => {
    if (!open) return undefined;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(null);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(null);
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return { open, toggle, close, isOpen, ref };
}
