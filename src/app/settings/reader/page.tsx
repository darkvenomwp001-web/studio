'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, BookMarked, MousePointer2, Smartphone, Zap, Eye, Timer, Vibration, MousePointer } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ReaderSettingsPage() {
  const { user, loading, updateUserProfile, authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState(user?.readerSettings || {
    swipeToNavigate: true,
    navigationStyle: 'horizontal',
    autoNextChapter: false,
    lineFocus: false,
    autoScroll: false,
    hapticFeedback: true,
    showReadingTime: true
  });

  useEffect(() => {
    if (user?.readerSettings) {
      setLocalSettings(user.readerSettings);
    }
  }, [user?.readerSettings]);

  const updateReaderSetting = async (key: string, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    
    try {
      await updateUserProfile({ readerSettings: updated });
    } catch (error) {
      toast({ 
        title: "Update Failed", 
        description: "Failed to save reading preferences.", 
        variant: "destructive" 
      });
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-foreground flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-primary" /> Reader Preferences
        </h1>
        <p className="text-muted-foreground text-sm">Fine-tune your reading comfort and interactions.</p>
      </header>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5 text-primary" /> Core Controls</CardTitle>
                <CardDescription>Essential movements for moving through the archives.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="swipe-toggle" className="text-sm font-bold block">Swipe to Navigate</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Turn pages with a simple flick</p>
                    </div>
                    <Switch id="swipe-toggle" checked={localSettings.swipeToNavigate} onCheckedChange={(v) => updateReaderSetting('swipeToNavigate', v)} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="auto-next" className="text-sm font-bold block">Auto-Next Chapter</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Seamlessly load the next part</p>
                    </div>
                    <Switch id="auto-next" checked={localSettings.autoNextChapter} onCheckedChange={(v) => updateReaderSetting('autoNextChapter', v)} />
                </div>
            </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Zap className="h-5 w-5 text-yellow-500" /> Immersive Experience</CardTitle>
                <CardDescription>Real-time features designed for deep reading focus.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="line-focus" className="text-sm font-bold block">Line-Focus Mode</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Highlights only the active line</p>
                    </div>
                    <Switch id="line-focus" checked={localSettings.lineFocus} onCheckedChange={(v) => updateReaderSetting('lineFocus', v)} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="auto-scroll" className="text-sm font-bold block">Hands-Free Scrolling</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Text moves at your preferred speed</p>
                    </div>
                    <Switch id="auto-scroll" checked={localSettings.autoScroll} onCheckedChange={(v) => updateReaderSetting('autoScroll', v)} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="haptic-fb" className="text-sm font-bold block">Haptic Feedback</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Feel the pulse of every page turn</p>
                    </div>
                    <Switch id="haptic-fb" checked={localSettings.hapticFeedback} onCheckedChange={(v) => updateReaderSetting('hapticFeedback', v)} />
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="read-time" className="text-sm font-bold block">Reading Time Node</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Show estimated time left in chapter</p>
                    </div>
                    <Switch id="read-time" checked={localSettings.showReadingTime} onCheckedChange={(v) => updateReaderSetting('showReadingTime', v)} />
                </div>
            </CardContent>
        </Card>
      </div>

      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">User Experience Node & bull; D4RKV3NOM Core</p>
      </footer>
    </div>
  );
}
