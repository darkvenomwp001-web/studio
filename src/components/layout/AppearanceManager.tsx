
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AppearanceManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.appearanceSettings) return;

    const settings = user.appearanceSettings;
    const root = document.documentElement;
    const body = document.body;

    // Apply Accent Color
    root.setAttribute('data-accent', settings.accentColor || 'default');

    // Apply OLED Mode
    if (settings.oledMode) {
      body.classList.add('oled-mode');
    } else {
      body.classList.remove('oled-mode');
    }

    // Apply Glassmorphism
    if (settings.glassmorphism) {
      body.classList.add('glass-enabled');
    } else {
      body.classList.remove('glass-enabled');
    }

    // Apply Typography
    if (settings.fontFamily === 'serif') {
      body.classList.add('font-serif-pref');
      body.classList.remove('font-sans-pref');
    } else {
      body.classList.add('font-sans-pref');
      body.classList.remove('font-serif-pref');
    }

    // Apply Density
    if (settings.density === 'compact') {
      body.classList.add('ui-compact');
    } else {
      body.classList.remove('ui-compact');
    }

  }, [user?.appearanceSettings]);

  return null; // This component handles side effects only
}
