'use client';

import { MoonStar, SunMedium } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/Button';

type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'bugsense-theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const resolved = resolveTheme();
    applyTheme(resolved);
    setTheme(resolved);
    setReady(true);
  }, []);

  function handleToggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    setTheme(next);
  }

  return (
    <Button
      aria-label={ready ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      onClick={handleToggle}
      size="sm"
      variant="ghost"
      icon={theme === 'dark' ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
    >
      {theme === 'dark' ? 'Light' : 'Dark'}
    </Button>
  );
}

function resolveTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}
