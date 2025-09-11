
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import { Play, Pause, SkipBack, SkipForward, Music, ListMusic, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SpotifyPlayer() {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(30);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    toast({
      title: "Feature Unavailable",
      description: "This is a UI prototype. Music playback is not implemented.",
    });
  };

  const handleSkip = () => {
    setProgress(0);
    toast({
      title: "Feature Unavailable",
      description: "This is a UI prototype. Music playback is not implemented.",
    });
  };

  return (
    <Card className="bg-gradient-to-br from-green-900/50 via-card to-card shadow-lg border-green-500/20">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image src="https://picsum.photos/seed/spotify/128" alt="Album Art" layout="fill" data-ai-hint="album cover music" />
                </div>
                <div>
                    <h4 className="font-bold text-lg leading-tight text-foreground">lofi hip hop radio</h4>
                    <p className="text-sm text-muted-foreground">Lofi Girl</p>
                </div>
            </div>

            <div className="w-full sm:w-auto flex flex-col items-center gap-2 flex-grow-[2] max-w-md">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSkip}>
                        <SkipBack className="h-6 w-6" />
                    </Button>
                    <Button 
                        variant="default" 
                        size="icon" 
                        className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
                        onClick={handlePlayPause}
                    >
                        {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7" />}
                    </Button>
                     <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSkip}>
                        <SkipForward className="h-6 w-6" />
                    </Button>
                </div>
                <div className="w-full flex items-center gap-2 text-xs text-muted-foreground">
                    <span>1:12</span>
                    <Slider 
                        defaultValue={[progress]} 
                        max={100} 
                        step={1} 
                        onValueChange={(value) => setProgress(value[0])}
                        className="w-full"
                    />
                    <span>3:45</span>
                </div>
            </div>

             <div className="flex items-center gap-2 flex-1 justify-end">
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <ListMusic className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Volume2 className="h-5 w-5" />
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}
