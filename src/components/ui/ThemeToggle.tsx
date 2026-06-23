import { useUIStore } from '../../stores/ui-store';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import SettingsBrightnessIcon from '@mui/icons-material/SettingsBrightness';

const themeCycle: Array<{ next: 'light' | 'dark' | 'auto'; icon: JSX.Element; tooltip: string }> = [
  { next: 'dark', icon: <LightModeIcon sx={{ fontSize: 16 }} />, tooltip: '浅色模式' },
  { next: 'auto', icon: <DarkModeIcon sx={{ fontSize: 16 }} />, tooltip: '深色模式' },
  { next: 'light', icon: <SettingsBrightnessIcon sx={{ fontSize: 16 }} />, tooltip: '自动模式' },
];

export default function ThemeToggle() {
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

  return (
    <Tooltip title={display.tooltip}>
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
