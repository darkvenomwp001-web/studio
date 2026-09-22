'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Loader2, 
    ArrowLeft, 
    ShieldCheck, 
    Eye, 
    Lock, 
    Database, 
    Cloud,
    UserCheck,
    MessageCircle,
    UserX,
    EyeOff
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type PrivacyScope = 'everyone' | 'following' | 'none';

export default function PrivacySettingsPage() {
  const { user, loading, updateUserProfile, authLoading } = useAuth();
  const router = useRouter();
  
  const [localPrivacy, setLocalPrivacy] = useState(user?.privacySettings || {
    lastSeen: 'everyone',
    onlineStatus: 'everyone',
    profilePhoto: 'everyone',
    stories: 'everyone',
    readReceipts: true
  });

  const updatePrivacy = async (key: string, value: any) => {
    const updated = { ...localPrivacy, [key]: value };
    setLocalPrivacy(updated);
    await updateUserProfile({ privacySettings: updated });
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
            <ShieldCheck className="h-10 w-10 text-emerald-500" /> Privacy Hub
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Manage your visibility and interaction node settings.</p>
      </header>
      
      <div className="grid gap-8">
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10 p-8">
                <CardTitle className="text-xl flex items-center gap-3">
                    <Lock className="h-6 w-6 text-emerald-500" /> Signal Visibility
                </CardTitle>
                <CardDescription>Control who can see your archival activity.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="space-y-6">
                    <div className="flex items-center justify-between gap-6">
                        <div className="space-y-1">
                            <Label className="text-sm font-bold">Last Active Signal</Label>
                            <p className="text-xs text-muted-foreground">Who can see when you were last online.</p>
                        </div>
                        <Select value={localPrivacy.lastSeen} onValueChange={(v: PrivacyScope) => updatePrivacy('lastSeen', v)}>
                            <SelectTrigger className="w-32 rounded-xl bg-background border-none shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="everyone">Everyone</SelectItem>
                                <SelectItem value="following">Following</SelectItem>
                                <SelectItem value="none">Nobody</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="opacity-10" />

                    <div className="flex items-center justify-between gap-6">
                        <div className="space-y-1">
                            <Label className="text-sm font-bold">Active Now Status</Label>
                            <p className="text-xs text-muted-foreground">Show your live glowing indicator in threads.</p>
                        </div>
                        <Select value={localPrivacy.onlineStatus} onValueChange={(v: PrivacyScope) => updatePrivacy('onlineStatus', v)}>
                            <SelectTrigger className="w-32 rounded-xl bg-background border-none shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="everyone">Everyone</SelectItem>
                                <SelectItem value="following">Following</SelectItem>
                                <SelectItem value="none">Nobody</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator className="opacity-10" />

                    <div className="flex items-center justify-between gap-6">
                        <div className="space-y-1">
                            <Label className="text-sm font-bold">Profile Identity Visual</Label>
                            <p className="text-xs text-muted-foreground">Who can see your high-res avatar.</p>
                        </div>
                        <Select value={localPrivacy.profilePhoto} onValueChange={(v: PrivacyScope) => updatePrivacy('profilePhoto', v)}>
                            <SelectTrigger className="w-32 rounded-xl bg-background border-none shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                <SelectItem value="everyone">Everyone</SelectItem>
                                <SelectItem value="following">Following</SelectItem>
                                <SelectItem value="none">Nobody</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Messaging Protocol</CardTitle>
                <CardDescription>Configure interaction rules for discussion threads.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-border/20">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold">Read Receipts</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Signal others when you've read their transmission</p>
                    </div>
                    <Switch 
                        checked={localPrivacy.readReceipts} 
                        onCheckedChange={(v) => updatePrivacy('readReceipts', v)} 
                    />
                </div>
                <div className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                        <Label className="text-sm font-bold">Thread Invitations</Label>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-tight">Who can add you to group discussions</p>
                    </div>
                    <Select defaultValue="following">
                        <SelectTrigger className="w-32 rounded-xl bg-background border-none shadow-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-none shadow-2xl">
                            <SelectItem value="everyone">Everyone</SelectItem>
                            <SelectItem value="following">Following</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
      </div>

      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Privacy Calibration Node & bull; D4RKV3NOM Core</p>
      </footer>
    </div>
  );
}