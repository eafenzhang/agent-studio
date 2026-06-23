import React, { useRef, useState, useCallback } from 'react';
import { useClickOutside } from '../../hooks/useClickOutside';

interface DropdownItem {
  label: string;
  value?: string;
  /** 文字头像（首字母 / emoji） */
  avatar?: string;
  /** 图片头像 URL */
  avatarUrl?: string;
}

interface DropdownSection {
  sectionLabel?: string;
  items: DropdownItem[];
  dividerAfter?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  sections: DropdownSection[];
  activeValue?: string;
  onSelect?: (value: string) => void;
  multiSelect?: boolean;
  activeValues?: string[];
  onToggle?: (value: string) => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger, sections, activeValue, onSelect,
  multiSelect = false, activeValues = [], onToggle,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  useClickOutside(ref, close);

  const handleItemClick = (item: DropdownItem) => {
    if (multiSelect && onToggle) {
      onToggle(item.label);
    } else if (onSelect) {
      onSelect(item.label);
      setOpen(false);
    }
  };

  const isItemActive = (item: DropdownItem) => {
    if (multiSelect) return activeValues.includes(item.label);
    return activeValue === item.label;
  };

  return (
    <div className="chat-dropdown" ref={ref}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      <div className={`chat-dropdown-menu${open ? ' open' : ''}`}>
        {sections.map((section, si) => (
          <React.Fragment key={si}>
            {section.sectionLabel && (
              <div className="chat-dropdown-section">{section.sectionLabel}</div>
            )}
            {section.items.map((item, ii) => (
              <div key={ii}
                className={`chat-dropdown-item${isItemActive(item) ? ' active' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                {item.avatarUrl ? (
                  <img src={item.avatarUrl} alt="" style={{ width: 18, height: 18, borderRadius: 4, objectFit: 'contain', marginRight: 6, flexShrink: 0 }} />
                ) : item.avatar ? (
                  <span style={{ width: 18, height: 18, borderRadius: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, marginRight: 6, flexShrink: 0, background: 'var(--cb-tag-background)' }}>{item.avatar}</span>
                ) : null}
                <span className="chat-dropdown-item-label">{item.label}</span>
                <svg className="chat-dropdown-item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ))}
            {section.dividerAfter && <div className="chat-dropdown-divider" />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
