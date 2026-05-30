'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Music, Play, Pause, Disc } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

interface MusicPlayerProps {
  trackUrl?: string;
}

export default function SpotifyPlayer({ trackUrl }: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (!trackUrl) {
    return (
       <Card className="bg-gradient-to-br from-zinc-900/50 via-card to-card shadow-lg border-zinc-800/20">
          <CardContent className="p-4 flex items-center justify-center gap-4">
              <Music className="h-6 w-6 text-primary/40" />
              <div className="text-center">
                  <h4 className="font-bold text-sm uppercase tracking-widest text-foreground">Archive Track</h4>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">No song active</p>
              </div>
          </CardContent>
      </Card>
    );
  }

  // Detect Source Protocol
  const isSpotify = trackUrl.includes('spotify.com');
  const isDirectAudio = trackUrl.includes('apple.com') || trackUrl.endsWith('.mp3') || trackUrl.endsWith('.m4a') || trackUrl.includes('preview');

  if (isSpotify) {
    const getTrackId = (url: string) => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        if (pathParts[1] === 'track' && pathParts[2]) return pathParts[2];
        return null;
      } catch (e) { return null; }
    };
    const trackId = getTrackId(trackUrl);
    if (!trackId) return null;
    const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    return (
      <div className="w-full">
        <iframe
          style={{ borderRadius: '12px' }}
          src={embedUrl}
          width="100%"
          height="80"
          frameBorder="0"
          allowFullScreen={false}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Embed Player"
        ></iframe>
      </div>
    );
  }

  if (isDirectAudio) {
    const togglePlay = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    };

    return (
      <Card className="bg-black/20 backdrop-blur-xl border-white/10 shadow-2xl overflow-hidden rounded-2xl group">
        <CardContent className="p-4 flex items-center gap-4">
            <audio 
              ref={audioRef} 
              src={trackUrl} 
              onEnded={() => setIsPlaying(false)}
              className="hidden" 
            />
            <Button 
              size="icon" 
              className={cn(
                "rounded-full h-12 w-12 shrink-0 shadow-lg transition-all active:scale-95",
                isPlaying ? "bg-primary text-white" : "bg-white/10 text-white hover:bg-white/20"
              )}
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current ml-1" />}
            </Button>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <Disc className={cn("h-3 w-3 text-primary", isPlaying && "animate-spin")} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">High-Fidelity Audio</span>
                </div>
                <p className="text-sm font-bold text-white truncate leading-tight">Digital Archive Node</p>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter truncate">30-Second Immersive Preview</p>
            </div>

            <div className="hidden sm:flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-0.5 bg-primary/40 rounded-full transition-all",
                    isPlaying ? "animate-pulse" : "h-1"
                  )} 
                  style={{ 
                    height: isPlaying ? `${Math.random() * 20 + 10}px` : '4px',
                    animationDelay: `${i * 0.1}s` 
                  }}
                />
              ))}
            </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
