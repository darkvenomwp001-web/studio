
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, MessageCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function MessagingSettingsPage() {
  const { user, loading, updateUserProfile, authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Local state to manage the radio group selection
  const [preference, setPreference] = useState<string>('everyone');

  useEffect(() => {
    if (user?.messagingPreference) {
      setPreference(user.messagingPreference);
    }
  }, [user?.messagingPreference]);

  const handlePreferenceChange = async (value: string) => {
    // Update local state immediately for fast feedback
    setPreference(value);
    
    try {
      // Synchronize with Firestore
      await updateUserProfile({ messagingPreference: value as any });
    } catch (error) {
      // Revert local state on failure
      if (user?.messagingPreference) {
        setPreference(user.messagingPreference);
      }
      toast({ 
        title: "Update Failed", 
        description: "We couldn't save your messaging preference. Please check your connection.", 
        variant: "destructive" 
      });
    }
  };

  if (loading && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !loading) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-primary" /> Messaging Settings
        </h1>
        <p className="text-muted-foreground">Control who can send you direct messages.</p>
      </header>
      
      <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
            <CardTitle>Private Messages</CardTitle>
            <CardDescription>Choose who is allowed to send you private messages.</CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup 
                value={preference} 
                onValueChange={handlePreferenceChange}
                disabled={authLoading}
                className="space-y-4"
            >
                <div 
                    className={cn(
                        "flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer group",
                        preference === 'everyone' ? 'bg-primary/5 border-primary/50 shadow-inner' : 'hover:bg-muted/50 border-transparent'
                    )} 
                    onClick={() => !authLoading && handlePreferenceChange('everyone')}
                >
                    <RadioGroupItem value="everyone" id="everyone" />
                    <Label htmlFor="everyone" className="font-normal flex-1 cursor-pointer">
                        <span className="font-semibold block text-base">Everyone</span>
                        <span className="text-xs text-muted-foreground">Allow anyone on the platform to message you.</span>
                    </Label>
                </div>
                 <div 
                    className={cn(
                        "flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer group",
                        preference === 'following' ? 'bg-primary/5 border-primary/50 shadow-inner' : 'hover:bg-muted/50 border-transparent'
                    )} 
                    onClick={() => !authLoading && handlePreferenceChange('following')}
                >
                    <RadioGroupItem value="following" id="following" />
                    <Label htmlFor="following" className="font-normal flex-1 cursor-pointer">
                        <span className="font-semibold block text-base">People you follow</span>
                         <span className="text-xs text-muted-foreground">Only users that you follow can message you.</span>
                    </Label>
                </div>
                 <div 
                    className={cn(
                        "flex items-center space-x-3 p-4 border rounded-lg transition-all cursor-pointer group",
                        preference === 'none' ? 'bg-primary/5 border-primary/50 shadow-inner' : 'hover:bg-muted/50 border-transparent'
                    )} 
                    onClick={() => !authLoading && handlePreferenceChange('none')}
                >
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="font-normal flex-1 cursor-pointer">
                        <span className="font-semibold block text-base">No one</span>
                         <span className="text-xs text-muted-foreground">Turn off private messages entirely.</span>
                    </Label>
                </div>
            </RadioGroup>
            
            {authLoading && (
                <div className="flex items-center justify-center mt-6 text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Syncing preferences...
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
