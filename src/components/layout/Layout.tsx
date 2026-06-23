import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../sidebar/Sidebar';
import ThemeToggle from '../ui/ThemeToggle';
import { useConversation } from '../../hooks/use-api';

export default function Layout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { convId } = useParams<{ convId: string }>();
  const { data: conversation } = useConversation(convId || '');

  const isChat = location.pathname.startsWith('/chat/');

  const pageTitles: Record<string, string> = {
    '/': t('home.title'),
    '/settings': t('settings.title'),
    '/experts': t('experts.title'),
    '/tools': t('tools.title'),
    '/artifacts': t('artifacts.title'),
    '/projects': t('projects.title'),
  };

  const title = isChat
    ? (conversation?.name || conversation?.title || '聊天')
    : (pageTitles[location.pathname] || t('app.title'));

  return (
    <div className="teams-container">
      <Sidebar />

      <div className="teams-content-wrapper">
        <div className="workbuddy-topbar">
          <div className="workbuddy-topbar-left">
            <span className="workbuddy-topbar-title">{title}</span>
          </div>
          <div className="workbuddy-topbar-actions">
            <ThemeToggle />
          </div>
        </div>
        <div className="chat-container">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
