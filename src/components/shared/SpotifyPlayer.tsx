
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Music } from 'lucide-react';

export default function SpotifyPlayer({ trackUrl }: { trackUrl?: string }) {
  
  if (!trackUrl) {
    // This is a fallback for when the component is used as a placeholder
    return (
       <Card className="bg-gradient-to-br from-green-900/50 via-card to-card shadow-lg border-green-500/20">
          <CardContent className="p-4 flex items-center justify-center gap-4">
              <Music className="h-6 w-6 text-green-400" />
              <div className="text-center">
                  <h4 className="font-bold text-lg leading-tight text-foreground">Profile Song</h4>
                  <p className="text-sm text-muted-foreground">No song selected</p>
              </div>
          </CardContent>
      </Card>
    );
  }

  const getTrackId = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // Expected path: /track/TRACK_ID
      if (pathParts[1] === 'track' && pathParts[2]) {
        return pathParts[2];
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const trackId = getTrackId(trackUrl);

  if (!trackId) {
    return (
      <Card className="bg-destructive/10 border-destructive/50">
        <CardContent className="p-3 text-center">
          <p className="text-sm font-semibold text-destructive-foreground">Invalid Spotify URL</p>
          <p className="text-xs text-muted-foreground">Please provide a valid Spotify track URL.</p>
        </CardContent>
      </Card>
    );
  }

  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;

  return (
    <div className="w-full">
      <iframe
        style={{ borderRadius: '12px' }}
        src={embedUrl}
        width="100%"
        height="152"
        frameBorder="0"
        allowFullScreen={false}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title="Spotify Embed Player"
      ></iframe>
    </div>
  );
}
