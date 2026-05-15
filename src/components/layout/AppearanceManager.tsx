
'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AppearanceManager() {
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user?.appearanceSettings) return;

    const settings = user.appearanceSettings;
    const root = document.documentElement;
    const body = document.body;

    // Apply Accent Color
    root.setAttribute('data-accent', settings.accentColor || 'default');

    // Apply Corner Radius
    root.setAttribute('data-radius', settings.cornerStyle || 'rounded');

    // Apply Parchment Mode
    if (settings.parchmentMode) {
      body.classList.add('parchment-mode');
    } else {
      body.classList.remove('parchment-mode');
    }

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

    // Apply Ambient Sound
    const playSound = async (type: string) => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
            audioRef.current.volume = 0.2;
        }

        if (type === 'none') {
            audioRef.current.pause();
            return;
        }

        const source = type === 'lofi' 
            ? 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' // Placeholder Lo-fi
            : 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'; // Placeholder Rain

        if (audioRef.current.src !== source) {
            audioRef.current.src = source;
        }
        
        try {
            await audioRef.current.play();
        } catch (e) {
            console.warn("Autoplay blocked. Sound will start on user interaction.");
        }
    };

    playSound(settings.ambientSound || 'none');

    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

  }, [user?.appearanceSettings]);

  return null;
}
