import React from 'react';

export const ProjectsPage: React.FC = () => {
  return (
    <div className="page active page-fade-in">
      <div className="not-available">
        <div className="not-available-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="not-available-title">暂未开放</div>
        <div className="not-available-desc">项目功能正在开发中，未来将支持多项目协作、任务管理和团队共享。</div>
        <div className="not-available-badge">Coming Soon</div>
      </div>
    </div>
  );
};
