import React from 'react';

interface TopBarProps {
  title: string;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  sidebarCollapsed,
  onToggleSidebar,
}) => {
  return (
    <div className="workbuddy-topbar">
      <div className="workbuddy-topbar-left">
        {sidebarCollapsed && (
          <button
            className="workbuddy-topbar-btn"
            onClick={onToggleSidebar}
            aria-label="展开侧栏"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
              <polyline points="13 9 16 12 13 15" />
            </svg>
          </button>
        )}
        <span className="workbuddy-topbar-title">{title}</span>
      </div>
      <div className="workbuddy-topbar-actions">
        <button className="workbuddy-topbar-btn" aria-label="搜索">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
        <button className="workbuddy-topbar-btn" aria-label="分享">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </div>
  );
};
