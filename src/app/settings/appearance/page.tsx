'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
    Loader2, 
    ArrowLeft, 
    Palette, 
    Moon, 
    Sun, 
    Monitor, 
    Zap, 
    EyeOff, 
    Sparkles, 
    Wand2, 
    Check, 
    Coffee, 
    Music, 
    Wind, 
    Maximize2, 
    BoxSelect, 
    Library,
    Contrast,
    Activity,
    Layers
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const accentColors = [
    { id: 'default', name: 'LitVerse Blue', emoji: '🌀' },
    { id: 'strawberry', name: 'Strawberry Silk', emoji: '🍓' },
    { id: 'ube', name: 'Ube Latte', emoji: '☕' },
    { id: 'matcha', name: 'Matcha Latte', emoji: '🍵' },
    { id: 'lavender', name: 'Lavender Haze', emoji: '🔮' },
    { id: 'honey', name: 'Golden Honey', emoji: '🍯' },
    { id: 'ube-overload', name: 'Ube Overload', emoji: '🍦' },
    { id: 'kalamansi-shot', name: 'Kalamansi Shot', emoji: '🍋' },
    { id: 'halo-halo', name: 'Halo-Halo', emoji: '🍧' },
    { id: 'taho-warmth', name: 'Taho Warmth', emoji: '🥤' },
    { id: 'chocnut', name: 'Chocnut', emoji: '🍫' },
];

export default function AppearanceSettingsPage() {
  const { user, loading, updateUserProfile, authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  const [localSettings, setLocalSettings] = useState(user?.appearanceSettings || {
    accentColor: 'default',
    fontFamily: 'sans',
    density: 'cozy',
    glassmorphism: true,
    oledMode: false,
    motionLevel: 'full',
    vignetteMode: false,
    highContrast: false,
    parchmentMode: false,
    cornerStyle: 'rounded',
    ambientSound: 'none'
  });

  useEffect(() => {
    if (user?.appearanceSettings) {
      setLocalSettings(user.appearanceSettings);
    }
  }, [user?.appearanceSettings]);

  const updateAppearance = async (key: string, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    
    try {
        await updateUserProfile({
            appearanceSettings: updated
        });
    } catch (error) {
        toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="flex flex-col space-y-2">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
            <Palette className="h-10 w-10 text-primary" /> Visual Styles
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Redesign your archive with custom themes and effects.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
            <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> Master Theme</CardTitle>
                    <CardDescription>Global lighting calibration.</CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-3">
                        {['light', 'dark', 'system'].map((t) => (
                            <div key={t}>
                                <RadioGroupItem value={t} id={`theme-${t}`} className="peer sr-only" />
                                <Label htmlFor={`theme-${t}`} className="flex flex-col items-center justify-center rounded-2xl border-2 border-muted bg-background p-4 hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">
                                    {t === 'light' ? <Sun className="mb-1 h-5 w-5 text-orange-500" /> : t === 'dark' ? <Moon className="mb-1 h-5 w-5 text-blue-500" /> : <Monitor className="mb-1 h-5 w-5" />}
                                    <span className="capitalize text-[10px] font-bold uppercase">{t}</span>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Color Calibration</CardTitle>
                    <CardDescription>Choose your unique signal color.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-48">
                        <div className="grid grid-cols-4 gap-2 pr-4">
                            {accentColors.map((acc) => (
                                <button
                                    key={acc.id}
                                    onClick={() => updateAppearance('accentColor', acc.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-1 p-3 rounded-2xl border-2 transition-all",
                                        localSettings.accentColor === acc.id ? "border-primary bg-primary/5" : "border-transparent bg-muted/30"
                                    )}
                                >
                                    <span className="text-2xl">{acc.emoji}</span>
                                    <span className="text-[8px] uppercase font-black truncate w-full text-center">{acc.name}</span>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card className="rounded-[2rem] border-border/40 shadow-xl bg-card/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> Vital Effects</CardTitle>
                    <CardDescription>Unique visual enhancements for your session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                        <div className="space-y-0.5">
                            <Label htmlFor="vignette" className="text-sm font-bold block">Dynamic Vignette</Label>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Soft focus edges for immersion</p>
                        </div>
                        <Switch id="vignette" checked={localSettings.vignetteMode} onCheckedChange={(v) => updateAppearance('vignetteMode', v)} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                        <div className="space-y-0.5">
                            <Label htmlFor="contrast" className="text-sm font-bold block">High Contrast</Label>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Sharpen text and signal nodes</p>
                        </div>
                        <Switch id="contrast" checked={localSettings.highContrast} onCheckedChange={(v) => updateAppearance('highContrast', v)} />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                        <div className="space-y-0.5">
                            <Label htmlFor="motion" className="text-sm font-bold block">Reduced Motion</Label>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Minimize animations for comfort</p>
                        </div>
                        <Switch id="motion" checked={localSettings.motionLevel === 'reduced'} onCheckedChange={(v) => updateAppearance('motionLevel', v ? 'reduced' : 'full')} />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                        <div className="space-y-0.5">
                            <Label htmlFor="glass" className="text-sm font-bold block">Glassmorphism</Label>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Morphic blur effects on menus</p>
                        </div>
                        <Switch id="glass" checked={localSettings.glassmorphism} onCheckedChange={(v) => updateAppearance('glassmorphism', v)} />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Visual Calibration Hub & bull; D4RKV3NOM Core</p>
      </footer>
    </div>
  );
}
