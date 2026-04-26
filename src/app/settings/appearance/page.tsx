
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Palette, Moon, Sun, Monitor, Type, LayoutGrid, Zap, EyeOff, Sparkles, Wand2, Check, Coffee } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const accentColors = [
    { id: 'default', name: 'LitVerse Blue', color: 'bg-blue-500' },
    { id: 'ube', name: 'Ube Latte', color: 'bg-[#A188D3]' },
    { id: 'matcha', name: 'Matcha Latte', color: 'bg-[#96AD6B]' },
    { id: 'chocolate', name: 'Rich Chocolate', color: 'bg-[#4B2E1D]' },
    { id: 'hazel', name: 'Hazel Latte', color: 'bg-[#C4A484]' },
    { id: 'tangerine', name: 'Tangerine Latte', color: 'bg-[#FF8C00]' },
    { id: 'blueberry', name: 'Blueberry Cool', color: 'bg-[#4A90E2]' },
    { id: 'mint', name: 'Fresh Mint', color: 'bg-[#AEE1E1]' },
];

export default function AppearanceSettingsPage() {
  const { user, loading, updateUserProfile, authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  // Local state for immediate UI feedback
  const [localSettings, setLocalSettings] = useState(user?.appearanceSettings || {
    accentColor: 'default',
    fontFamily: 'sans',
    density: 'cozy',
    glassmorphism: true,
    oledMode: false,
    motionLevel: 'full',
    autoDim: false
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
        console.error("Failed to update appearance:", error);
        toast({ title: "Update Failed", description: "Your preference wasn't saved to your profile.", variant: "destructive" });
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-10 px-4 pb-24 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
            <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Button>
            <h1 className="text-3xl font-headline font-bold text-foreground flex items-center gap-3">
                <Palette className="h-8 w-8 text-primary" /> Appearance
            </h1>
            <p className="text-muted-foreground text-sm">Personalize your reading and navigation experience.</p>
        </div>
        {(authLoading) && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </header>
      
      <div className="grid gap-6">
        {/* Theme Selector */}
        <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Sun className="h-4 w-4 text-orange-500" /> Interface Theme</CardTitle>
                <CardDescription>Select a base theme for the application.</CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-3">
                    {['light', 'dark', 'system'].map((t) => (
                        <div key={t}>
                            <RadioGroupItem value={t} id={`theme-${t}`} className="peer sr-only" />
                            <Label htmlFor={`theme-${t}`} className="flex flex-col items-center justify-center rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all">
                                {t === 'light' ? <Sun className="mb-2 h-5 w-5" /> : t === 'dark' ? <Moon className="mb-2 h-5 w-5" /> : <Monitor className="mb-2 h-5 w-5" />}
                                <span className="capitalize text-xs font-medium">{t}</span>
                            </Label>
                        </div>
                    ))}
                </RadioGroup>
            </CardContent>
        </Card>

        {/* Cafe-inspired Accent Palette */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Coffee className="h-4 w-4 text-primary" /> The Cafe Palette</CardTitle>
                <CardDescription>Choose a delicious accent color to spice up your interface.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {accentColors.map((acc) => (
                        <button
                            key={acc.id}
                            onClick={() => updateAppearance('accentColor', acc.id)}
                            className={cn(
                                "flex flex-col items-center gap-2 group p-4 rounded-2xl border-2 transition-all relative overflow-hidden",
                                localSettings.accentColor === acc.id ? "border-primary bg-primary/5 shadow-md" : "border-transparent bg-muted/30 hover:bg-muted/50"
                            )}
                        >
                            <div className={cn("h-10 w-10 rounded-full shadow-inner ring-4 ring-background", acc.color)} />
                            <span className="text-[10px] uppercase tracking-tighter font-bold">{acc.name}</span>
                            {localSettings.accentColor === acc.id && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-0.5 rounded-full">
                                    <Check className="h-3 w-3" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>

        {/* Typography & Density */}
        <div className="grid sm:grid-cols-2 gap-6">
            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><Type className="h-4 w-4" /> UI Typography</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={localSettings.fontFamily} onValueChange={(v) => updateAppearance('fontFamily', v)} className="grid grid-cols-2 gap-2">
                        <div>
                            <RadioGroupItem value="sans" id="font-sans" className="peer sr-only" />
                            <Label htmlFor="font-sans" className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary transition-all font-sans">Sans</Label>
                        </div>
                        <div>
                            <RadioGroupItem value="serif" id="font-serif" className="peer sr-only" />
                            <Label htmlFor="font-serif" className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary transition-all font-serif">Serif</Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2"><LayoutGrid className="h-4 w-4" /> Navigation Density</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={localSettings.density} onValueChange={(v) => updateAppearance('density', v)} className="grid grid-cols-2 gap-2">
                        <div>
                            <RadioGroupItem value="cozy" id="dens-cozy" className="peer sr-only" />
                            <Label htmlFor="dens-cozy" className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary transition-all">Cozy</Label>
                        </div>
                        <div>
                            <RadioGroupItem value="compact" id="dens-compact" className="peer sr-only" />
                            <Label htmlFor="dens-compact" className="flex flex-col items-center p-3 border-2 rounded-lg cursor-pointer peer-data-[state=checked]:border-primary transition-all">Compact</Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>

        {/* Enhancements */}
        <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2"><Wand2 className="h-4 w-4 text-purple-500" /> Modern Enhancements</CardTitle>
                <CardDescription>Fine-tune the visual effects and performance of LitVerse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 divide-y divide-border/50">
                <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                        <Label className="text-base cursor-pointer" htmlFor="glass">Glassmorphism Effects</Label>
                        <p className="text-xs text-muted-foreground">Enable background blur on headers and cards.</p>
                    </div>
                    <Switch id="glass" checked={localSettings.glassmorphism} onCheckedChange={(v) => updateAppearance('glassmorphism', v)} />
                </div>
                
                <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2 cursor-pointer" htmlFor="oled">OLED Stealth Mode <Moon className="h-3 w-3 text-blue-500"/></Label>
                        <p className="text-xs text-muted-foreground">Use pure black backgrounds in dark mode for OLED screens.</p>
                    </div>
                    <Switch id="oled" checked={localSettings.oledMode} onCheckedChange={(v) => updateAppearance('oledMode', v)} />
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2">Motion Dynamics <Zap className="h-3 w-3 text-yellow-500"/></Label>
                        <p className="text-xs text-muted-foreground">Toggle between fluid motion and snappy performance.</p>
                    </div>
                    <RadioGroup value={localSettings.motionLevel} onValueChange={(v) => updateAppearance('motionLevel', v)} className="flex gap-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="full" id="motion-full" />
                            <Label htmlFor="motion-full" className="text-xs cursor-pointer">Fluid</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="reduced" id="motion-red" />
                            <Label htmlFor="motion-red" className="text-xs cursor-pointer">Snappy</Label>
                        </div>
                    </RadioGroup>
                </div>

                <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                        <Label className="text-base flex items-center gap-2 cursor-pointer" htmlFor="autodim">Auto-Reading Dim <EyeOff className="h-3 w-3 text-red-500"/></Label>
                        <p className="text-xs text-muted-foreground">Reduce UI distractions automatically when reading a chapter.</p>
                    </div>
                    <Switch id="autodim" checked={localSettings.autoDim} onCheckedChange={(v) => updateAppearance('autoDim', v)} />
                </div>
            </CardContent>
        </Card>
      </div>
      
      <div className="pt-6">
        <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => router.push('/')}>
            Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
