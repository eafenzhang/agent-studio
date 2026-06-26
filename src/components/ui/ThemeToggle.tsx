import { useUIStore } from '../../stores/ui-store';
import { useTranslation } from 'react-i18next';

const THEME_CYCLE: Array<{ next: 'light' | 'dark' | 'auto'; icon: string }> = [
  { next: 'dark', icon: '☀' },   // sun
  { next: 'auto', icon: '☽' },   // moon
  { next: 'light', icon: '⚙' },  // gear
];

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const handleCycle = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
    setTheme(nextTheme);
  };

  const display = THEME_CYCLE.find((c) => {
    if (theme === 'light') return c.next === 'dark';
    if (theme === 'dark') return c.next === 'auto';
    return c.next === 'light';
  }) || THEME_CYCLE[0];

  const tooltipLabel = theme === 'light' ? t('settings.themeLight') : theme === 'dark' ? t('settings.themeDark') : t('settings.themeAuto');

  return (
    <button
      onClick={handleCycle}
      title={tooltipLabel}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--wb-color-text-secondary)',
        cursor: 'pointer',
        fontSize: 15,
        lineHeight: 1,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {display.icon}
    </button>
  );
}
