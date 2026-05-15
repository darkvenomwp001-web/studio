
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
    Type, 
    LayoutGrid, 
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
    HeartPulse
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from 'next-themes';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

const accentColors = [
    { id: 'default', name: 'LitVerse Blue', color: 'text-blue-500' },
    { id: 'strawberry', name: 'Strawberry Silk', color: 'text-[#F472B6]' },
    { id: 'ube', name: 'Ube Latte', color: 'text-[#A188D3]' },
    { id: 'matcha', name: 'Matcha Latte', color: 'text-[#96AD6B]' },
    { id: 'lavender', name: 'Lavender Haze', color: 'text-[#C084FC]' },
    { id: 'honey', name: 'Golden Honey', color: 'text-[#FACC15]' },
    { id: 'chocolate', name: 'Rich Mocha', color: 'text-[#4B2E1D]' },
    { id: 'hazel', name: 'Hazel Fusion', color: 'text-[#C4A484]' },
    { id: 'tangerine', name: 'Tangerine Pop', color: 'text-[#FF8C00]' },
    { id: 'blueberry', name: 'Blueberry Rush', color: 'text-[#4A90E2]' },
    { id: 'mint', name: 'Minty Cloud', color: 'text-[#AEE1E1]' },
    { id: 'charcoal', name: 'Midnight Ash', color: 'text-[#374151]' },
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
    autoDim: false,
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
        console.error("Failed to update appearance:", error);
        toast({ title: "Update Failed", description: "Your preference wasn't saved.", variant: "destructive" });
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
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
            <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Button>
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
                <Palette className="h-10 w-10 text-primary" /> Appearance
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Curate your perfect literary atmosphere with real-time immersive features.</p>
        </div>
        {(authLoading) && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
      </header>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-8">
            {/* Identity & Theme */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 w-6 bg-primary rounded-full" />
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Core Style</h2>
                </div>
                
                <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-xl">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> Application Theme</CardTitle>
                        <CardDescription>Select the fundamental color mode for your session.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-3">
                            {['light', 'dark', 'system'].map((t) => (
                                <div key={t}>
                                    <RadioGroupItem value={t} id={`theme-${t}`} className="peer sr-only" />
                                    <Label htmlFor={`theme-${t}`} className="flex flex-col items-center justify-center rounded-2xl border-2 border-muted bg-background p-5 hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all shadow-sm">
                                        {t === 'light' ? <Sun className="mb-2 h-5 w-5 text-orange-500" /> : t === 'dark' ? <Moon className="mb-2 h-5 w-5 text-blue-500" /> : <Monitor className="mb-2 h-5 w-5" />}
                                        <span className="capitalize text-[10px] font-bold uppercase tracking-widest">{t}</span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Cafe Palette */}
                <Card className="border-border/40 shadow-xl overflow-hidden bg-card/40 backdrop-blur-sm">
                    <CardHeader className="pb-4 bg-muted/20 border-b border-border/40">
                        <CardTitle className="text-lg flex items-center gap-2"><Coffee className="h-4 w-4 text-primary" /> LitVerse Cafe Palette</CardTitle>
                        <CardDescription>Choose a delicious accent flavor for buttons and highlights.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                            {accentColors.map((acc) => (
                                <button
                                    key={acc.id}
                                    onClick={() => updateAppearance('accentColor', acc.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 group p-4 rounded-[2.5rem] border-2 transition-all relative overflow-hidden",
                                        localSettings.accentColor === acc.id ? "border-primary bg-primary/10 shadow-2xl scale-110" : "border-transparent bg-muted/40 hover:bg-muted/60"
                                    )}
                                >
                                    <div className={cn("h-10 w-10 flex items-center justify-center transition-transform group-hover:scale-125", acc.color)}>
                                        <Coffee className="h-full w-full fill-current opacity-80" />
                                    </div>
                                    <span className="text-[7px] uppercase tracking-tighter font-black text-center leading-none mt-1">{acc.name}</span>
                                    {localSettings.accentColor === acc.id && (
                                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-0.5 rounded-full shadow-md animate-in zoom-in-50 duration-500">
                                            <Check className="h-2 w-2" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* Immersive Reading Section */}
            <section className="space-y-4 pt-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 w-6 bg-accent rounded-full" />
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Immersive Reading</h2>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    {/* Parchment Mode */}
                    <Card className="border-border/40 shadow-md bg-card/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><Library className="h-4 w-4 text-amber-600" /> Parchment Mode</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground leading-relaxed">Adds a realistic analog paper grain to reduce eye strain during long sessions.</p>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-dashed border-border/60">
                                <span className="text-[10px] font-bold uppercase tracking-widest">Enable Texture</span>
                                <Switch checked={localSettings.parchmentMode} onCheckedChange={(v) => updateAppearance('parchmentMode', v)} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ambient Soundscapes */}
                    <Card className="border-border/40 shadow-md bg-card/30">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2"><Music className="h-4 w-4 text-purple-500" /> Reading Focus</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-muted-foreground">Toggle real-time atmospheric sounds to block out distractions while you read.</p>
                            <RadioGroup value={localSettings.ambientSound} onValueChange={(v: any) => updateAppearance('ambientSound', v)} className="grid grid-cols-3 gap-2">
                                {['none', 'lofi', 'rain'].map(s => (
                                    <Label key={s} htmlFor={`snd-${s}`} className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-transparent bg-muted/40 cursor-pointer transition-all hover:bg-muted/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary/5">
                                        <RadioGroupItem value={s} id={`snd-${s}`} className="sr-only" />
                                        <span className="text-[9px] font-bold uppercase tracking-tighter">{s === 'none' ? <X className="h-4 w-4 mb-1" /> : s === 'lofi' ? <Music className="h-4 w-4 mb-1 text-primary" /> : <Wind className="h-4 w-4 mb-1 text-blue-500" />}</span>
                                        <span className="text-[8px] font-bold uppercase">{s}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </CardContent>
                    </Card>
                </div>

                {/* Corner Styles */}
                <Card className="border-border/40 shadow-md bg-card/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><BoxSelect className="h-4 w-4 text-green-500" /> App Corner Dynamics</CardTitle>
                        <CardDescription>Determine the "roundness" of all interface elements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={localSettings.cornerStyle} onValueChange={(v: any) => updateAppearance('cornerStyle', v)} className="grid grid-cols-3 gap-4">
                            {[
                                { id: 'minimal', label: 'Minimal', desc: 'Sharp edges' },
                                { id: 'rounded', label: 'Rounded', desc: 'Standard flow' },
                                { id: 'organic', label: 'Organic', desc: 'Extra soft' },
                            ].map(s => (
                                <div key={s.id}>
                                    <RadioGroupItem value={s.id} id={`radius-${s.id}`} className="sr-only" />
                                    <Label htmlFor={`radius-${s.id}`} className="flex flex-col items-center justify-center rounded-2xl border-2 border-muted bg-background p-4 hover:bg-accent cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 transition-all shadow-sm group">
                                        <div className={cn(
                                            "w-8 h-8 border-2 border-muted-foreground/30 mb-2 transition-all group-hover:border-primary",
                                            s.id === 'minimal' ? 'rounded-none' : s.id === 'rounded' ? 'rounded-lg' : 'rounded-2xl'
                                        )} />
                                        <span className="text-[10px] font-bold uppercase mb-0.5">{s.label}</span>
                                        <span className="text-[8px] text-muted-foreground/60 text-center leading-none">{s.desc}</span>
                                    </Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>
            </section>
        </div>

        <div className="lg:col-span-5 space-y-8">
            {/* Visual Preview Card */}
            <section className="sticky top-24 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <div className="h-1 w-6 bg-green-500 rounded-full" />
                    <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Real-time Preview</h2>
                </div>
                
                <Card className={cn(
                    "border-border/40 shadow-2xl overflow-hidden transition-all duration-700 transform-gpu",
                    localSettings.glassmorphism && "bg-card/40 backdrop-blur-3xl",
                    localSettings.parchmentMode && "parchment-mode",
                    localSettings.cornerStyle === 'minimal' ? 'rounded-none' : localSettings.cornerStyle === 'organic' ? 'rounded-[3rem]' : 'rounded-3xl'
                )}>
                    <CardHeader className="p-8 pb-4">
                        <Badge className="w-fit mb-4 bg-primary text-primary-foreground font-bold text-[9px] uppercase tracking-[0.2em]">Sample Manuscript</Badge>
                        <CardTitle className="text-2xl font-headline font-bold leading-tight">The Midnight Paradox</CardTitle>
                        <CardDescription>A snippet from the archives...</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 pt-0 space-y-6">
                        <p className={cn(
                            "text-base leading-relaxed text-foreground/80",
                            localSettings.fontFamily === 'serif' ? 'font-serif' : 'font-sans'
                        )}>
                            "The rain drummed against the library windows, echoing the rhythmic ticking of a clock that shouldn't have been there. She reached for the glowing volume, her fingers brushing the worn parchment..."
                        </p>
                        <div className="flex items-center gap-3">
                            <Button className="rounded-full px-6 h-10 font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Resume Study</Button>
                            <Button variant="ghost" className="rounded-full h-10 w-10"><HeartPulse className="h-4 w-4 text-red-500"/></Button>
                        </div>
                    </CardContent>
                    <footer className="p-6 bg-muted/20 border-t border-border/20 flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/20" />
                            <div className="space-y-1">
                                <div className="h-2 w-12 bg-muted rounded-full" />
                                <div className="h-1.5 w-8 bg-muted/40 rounded-full" />
                            </div>
                         </div>
                         <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    </footer>
                </Card>

                {/* Performance & UX Toggle List */}
                <Card className="border-border/40 shadow-md bg-card/20">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest"><Wand2 className="h-4 w-4 text-primary" /> Studio Enhancements</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 divide-y divide-border/20">
                        {[
                            { id: 'glassmorphism', label: 'Glassmorphism', desc: 'Cinematic blur effects', icon: Wand2 },
                            { id: 'oledMode', label: 'OLED Stealth', desc: 'Pure black backgrounds', icon: Moon },
                            { id: 'autoDim', label: 'Auto-Dim HUD', desc: 'Reduce distractions while reading', icon: EyeOff },
                        ].map(item => (
                            <div key={item.id} className="flex items-center justify-between py-4">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold cursor-pointer" htmlFor={item.id}>{item.label}</Label>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{item.desc}</p>
                                </div>
                                <Switch id={item.id} checked={(localSettings as any)[item.id]} onCheckedChange={(v) => updateAppearance(item.id, v)} />
                            </div>
                        ))}
                        
                        <div className="py-4 space-y-4">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-bold flex items-center gap-2">Motion Dynamics <Zap className="h-3 w-3 text-yellow-500"/></Label>
                                <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Balance between fluid motion and performance.</p>
                            </div>
                            <RadioGroup value={localSettings.motionLevel} onValueChange={(v) => updateAppearance('motionLevel', v)} className="flex gap-2">
                                <div className="flex-1">
                                    <RadioGroupItem value="full" id="motion-full" className="sr-only" />
                                    <Label htmlFor="motion-full" className={cn("flex items-center justify-center h-9 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer", localSettings.motionLevel === 'full' ? "bg-primary text-white border-primary" : "bg-muted/30 border-transparent")}>Fluid</Label>
                                </div>
                                <div className="flex-1">
                                    <RadioGroupItem value="reduced" id="motion-red" className="sr-only" />
                                    <Label htmlFor="motion-red" className={cn("flex items-center justify-center h-9 rounded-xl border text-[10px] font-bold uppercase transition-all cursor-pointer", localSettings.motionLevel === 'reduced' ? "bg-primary text-white border-primary" : "bg-muted/30 border-transparent")}>Snappy</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
      </div>
      
      <footer className="pt-10 flex flex-col sm:flex-row gap-4">
        <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold uppercase text-xs tracking-widest shadow-sm hover:bg-muted/50" onClick={() => router.push('/')}>
            Return to Dashboard
        </Button>
        <Button className="flex-1 h-14 rounded-2xl font-bold uppercase text-xs tracking-widest bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95" onClick={() => router.push('/settings')}>
            Back to Account Hub
        </Button>
      </footer>
    </div>
  );
}
