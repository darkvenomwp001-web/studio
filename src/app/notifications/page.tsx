'use client';

import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, UserPlus, BookOpenText, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NotificationType } from '@/types';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsPage() {
  const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead, loading, authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();


  if (loading && !user) { // Initial page load check
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading notifications...</p>
        </div>
    );
  }

  if (!user && !loading) { // After loading, if still no user
    router.push('/auth/signin'); // Redirect if not logged in
    return (
        <div className="text-center py-10">
            <p>Redirecting to sign in...</p>
        </div>
    );
  }
  
  const handleNotificationClick = async (notification: NotificationType) => {
    if (!notification.isRead) {
      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        toast({ title: "Error", description: "Failed to mark notification as read.", variant: "destructive"});
      }
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (notifications.every(n => n.isRead)) {
        toast({ title: "All Read", description: "No unread notifications to mark." });
        return;
    }
    try {
        await markAllNotificationsAsRead();
    } catch (error) {
        toast({ title: "Error", description: "Failed to mark all notifications as read.", variant: "destructive"});
    }
  };

  const getNotificationIcon = (type: NotificationType['type']) => {
    switch (type) {
      case 'new_follower':
        return <UserPlus className="h-5 w-5 text-blue-500" />;
      case 'new_chapter':
      case 'story_update':
        return <BookOpenText className="h-5 w-5 text-green-500" />;
      case 'comment_reply':
      case 'mention':
        return <CheckCircle className="h-5 w-5 text-purple-500" />; 
      case 'announcement':
        return <Bell className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center justify-center gap-3">
          <Bell className="h-10 w-10" /> Notifications
        </h1>
        <p className="text-muted-foreground">Stay updated with the latest activities.</p>
      </header>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>All Notifications</CardTitle>
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={authLoading || notifications.every(n => n.isRead)}>
              {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mark all as read
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {authLoading && notifications.length === 0 ? ( // Show loader if auth is loading and no notifs yet
             <div className="text-center py-10 text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            <ul className="space-y-3">
              {notifications.map((notif) => (
                <li
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 rounded-md border cursor-pointer transition-all hover:shadow-md ${
                    notif.isRead ? 'bg-background/50 opacity-70' : 'bg-card hover:bg-muted/30'
                  } flex items-start gap-4`}
                >
                  <div className="flex-shrink-0 pt-1">
                    {notif.actor?.avatarUrl ? (
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={notif.actor.avatarUrl} alt={notif.actor.username} data-ai-hint="profile person"/>
                        <AvatarFallback>{notif.actor.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm leading-snug ${!notif.isRead ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }) : 'A while ago'}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="flex-shrink-0 self-center ml-auto">
                      <div className="w-2.5 h-2.5 bg-primary rounded-full" title="Unread"></div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-6">No notifications yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
