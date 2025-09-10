
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, MessageCircle } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function MessagingSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <MessageCircle className="h-8 w-8" /> Messaging Settings
        </h1>
        <p className="text-muted-foreground">Control who can send you direct messages.</p>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Private Messages</CardTitle>
            <CardDescription>Choose who is allowed to send you private messages.</CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup defaultValue="everyone" className="space-y-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="everyone" id="everyone" />
                    <Label htmlFor="everyone" className="font-normal flex-1">
                        Everyone
                        <p className="text-xs text-muted-foreground">Allow anyone on the platform to message you.</p>
                    </Label>
                </div>
                 <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="following" id="following" />
                    <Label htmlFor="following" className="font-normal flex-1">
                        People you follow
                         <p className="text-xs text-muted-foreground">Only users that you follow can message you.</p>
                    </Label>
                </div>
                 <div className="flex items-center space-x-3 p-4 border rounded-lg">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="font-normal flex-1">
                        No one
                         <p className="text-xs text-muted-foreground">Turn off private messages entirely.</p>
                    </Label>
                </div>
            </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
