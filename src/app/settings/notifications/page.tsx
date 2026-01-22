

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, ArrowLeft, Bell, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function NotificationsSettingsPage() {
  const { user, loading, enablePushNotifications, notificationPermission, authLoading, fcmToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

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
  
  const copyToClipboard = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      toast({ title: "Copied!", description: "FCM token copied to clipboard." });
    }
  };

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
            <CardDescription>Receive real-time pop-up notifications outside the app, even when you're not on the site.</CardDescription>
        </CardHeader>
        <CardContent>
            {notificationPermission === 'granted' && (
                 <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                    <CheckCircle className="h-5 w-5" />
                    <p>Push notifications are enabled on this device.</p>
                </div>
            )}
             {notificationPermission === 'denied' && (
                <div className="text-destructive">
                    <p>You have blocked push notifications. You'll need to enable them in your browser settings to receive them.</p>
                </div>
            )}
             {notificationPermission === 'default' && (
                <Button onClick={enablePushNotifications} disabled={authLoading}>
                    {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Enable Push Notifications
                </Button>
            )}
        </CardContent>
      </Card>
      
      {fcmToken && (
        <Card>
            <CardHeader>
                <CardTitle>Test Your Notifications</CardTitle>
                <CardDescription>Use the token below to send a test push notification from the Firebase Console.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="fcm-token">Your Current FCM Token</Label>
                    <div className="flex gap-2">
                        <Input id="fcm-token" value={fcmToken} readOnly />
                        <Button variant="outline" onClick={copyToClipboard}>Copy</Button>
                    </div>
                </div>
                <div className="prose prose-sm dark:prose-invert text-muted-foreground">
                    <h4>How to Test:</h4>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>Go to your Firebase project and navigate to <strong>Engage &gt; Messaging</strong>.</li>
                        <li>Click "Create your first campaign" or "New campaign", and select "Notifications".</li>
                        <li>Enter a title and text for your test notification.</li>
                        <li>On the "Send test message" panel on the right, paste the token above into the "Add an FCM registration token" field and click "Test".</li>
                        <li>You should receive the notification on this device.</li>
                    </ol>
                </div>
            </CardContent>
        </Card>
      )}

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
