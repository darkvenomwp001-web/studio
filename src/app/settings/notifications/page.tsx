
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, Bell } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function NotificationsSettingsPage() {
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
            <Bell className="h-8 w-8" /> Notification Settings
        </h1>
        <p className="text-muted-foreground">Choose what you want to be notified about.</p>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>Receive push notifications for important updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label htmlFor="push-everything" className="font-normal flex-1">
                    Everything
                    <p className="text-xs text-muted-foreground">Receive all notifications as push alerts.</p>
                </Label>
                <Switch id="push-everything" />
            </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Receive emails for important updates you might have missed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-2 rounded-lg">
                <Label htmlFor="email-followers" className="font-normal">New Followers</Label>
                <Switch id="email-followers" defaultChecked />
            </div>
            <Separator />
             <div className="flex items-center justify-between p-2 rounded-lg">
                <Label htmlFor="email-comments" className="font-normal">Comments and Replies</Label>
                <Switch id="email-comments" defaultChecked />
            </div>
             <Separator />
             <div className="flex items-center justify-between p-2 rounded-lg">
                <Label htmlFor="email-letters" className="font-normal">New Letters & Responses</Label>
                <Switch id="email-letters" defaultChecked />
            </div>
            <Separator />
             <div className="flex items-center justify-between p-2 rounded-lg">
                <Label htmlFor="email-announcements" className="font-normal">News and Announcements</Label>
                <Switch id="email-announcements" />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
