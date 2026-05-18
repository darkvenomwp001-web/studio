'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, BookMarked, MousePointer2, Smartphone, Zap } from 'lucide-react';
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
    autoNextChapter: false
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
    <div className="max-w-2xl mx-auto space-y-8 py-10 px-4 pb-32">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
        </Button>
        <h1 className="text-3xl font-headline font-bold text-foreground flex items-center gap-3">
            <BookMarked className="h-8 w-8 text-primary" /> Reader Preferences
        </h1>
        <p className="text-muted-foreground text-sm">Configure gestures and interactive reading protocols.</p>
      </header>

      <div className="space-y-6">
        <Card className="rounded-[2rem] border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5 text-primary" /> Gesture Navigation</CardTitle>
                <CardDescription>Control how you navigate through manuscripts using touch gestures.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="swipe-toggle" className="text-sm font-bold block">Swipe to Navigate</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Swipe between parts/chapters</p>
                    </div>
                    <Switch id="swipe-toggle" checked={localSettings.swipeToNavigate} onCheckedChange={(v) => updateReaderSetting('swipeToNavigate', v)} />
                </div>

                {localSettings.swipeToNavigate && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Gesture Style</Label>
                        <RadioGroup 
                            value={localSettings.navigationStyle} 
                            onValueChange={(v: any) => updateReaderSetting('navigationStyle', v)}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="horizontal" id="style-horiz" className="sr-only" />
                                <Label htmlFor="style-horiz" className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all cursor-pointer text-center gap-3",
                                    localSettings.navigationStyle === 'horizontal' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/40 hover:bg-muted/60"
                                )}>
                                    <div className="flex items-center gap-2">
                                        <ArrowLeft className="h-4 w-4 opacity-40" />
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><MousePointer2 className="h-4 w-4 text-primary" /></div>
                                        <ArrowLeft className="h-4 w-4 opacity-40 rotate-180" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-widest block">Horizontal</span>
                                        <span className="text-[9px] text-muted-foreground leading-none">Traditional page swiping</span>
                                    </div>
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="vertical" id="style-vert" className="sr-only" />
                                <Label htmlFor="style-vert" className={cn(
                                    "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all cursor-pointer text-center gap-3",
                                    localSettings.navigationStyle === 'vertical' ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/40 hover:bg-muted/60"
                                )}>
                                    <div className="flex flex-col items-center gap-1">
                                        <ChevronUp className="h-4 w-4 opacity-40" />
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center"><MousePointer2 className="h-4 w-4 text-primary rotate-180" /></div>
                                        <ChevronDown className="h-4 w-4 opacity-40" />
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs font-bold uppercase tracking-widest block">Vertical</span>
                                        <span className="text-[9px] text-muted-foreground leading-none">Swipe up at the bottom</span>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}
            </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-border/40 shadow-lg bg-card/50 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg"><Zap className="h-5 w-5 text-yellow-500" /> Automation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                    <div className="space-y-0.5">
                        <Label htmlFor="auto-next" className="text-sm font-bold block">Auto-Next Chapter</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Load next part automatically when reaching end</p>
                    </div>
                    <Switch id="auto-next" checked={localSettings.autoNextChapter} onCheckedChange={(v) => updateReaderSetting('autoNextChapter', v)} />
                </div>
            </CardContent>
        </Card>
      </div>

      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Haptic Node Protocol & bull; D4RKV3NOM Core</p>
      </footer>
    </div>
  );
}
