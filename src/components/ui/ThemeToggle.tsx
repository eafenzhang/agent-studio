import { useUIStore } from '../../stores/ui-store';
import { useTranslation } from 'react-i18next';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

const themeCycle: Array<{ next: 'light' | 'dark' | 'auto'; icon: JSX.Element }> = [
  { next: 'dark', icon: <LightModeIcon sx={{ fontSize: 16 }} /> },
  { next: 'auto', icon: <DarkModeIcon sx={{ fontSize: 16 }} /> },
  { next: 'light', icon: <SettingsBrightnessIcon sx={{ fontSize: 16 }} /> },
];

export default function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const current = themeCycle.find((t) => t.next === theme) || themeCycle[0];
  const display = themeCycle.find((t) => {
    if (theme === 'light') return t.next === 'dark';
    if (theme === 'dark') return t.next === 'auto';
    return t.next === 'light';
  }) || themeCycle[0];

  const handleCycle = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
    setTheme(nextTheme);
  };

  const tooltipLabel = theme === 'light' ? t('settings.themeLight') : theme === 'dark' ? t('settings.themeDark') : t('settings.themeAuto');

  return (
    <Tooltip title={tooltipLabel}>
      <IconButton
        size="small"
        onClick={handleCycle}
        sx={{ width: 28, height: 28, color: 'var(--wb-color-text-secondary)' }}
      >
        {display.icon}
      </IconButton>
    </Tooltip>
  );
}
