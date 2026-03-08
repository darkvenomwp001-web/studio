'use client';

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Loader2, UserPlus, BookOpenText, Mail, MailCheck, Inbox as InboxIcon, Send, Search, Smile, Sparkles, ArrowLeft, MoreHorizontal, CheckCheck, Plus, Users } from 'lucide-react';
import { formatDistanceToNow, isToday, isThisWeek } from 'date-fns';
import type { NotificationType, Conversation, Message, UserSummary, User as AppUserType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  limit,
  getDocs,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { getConversationStarters } from '@/app/actions/aiActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StatusFeature from '@/components/status/StatusFeature';
import { Separator } from '@/components/ui/separator';

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

function NotificationsList() {
    const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead, authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

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
            case 'new_follower': return <UserPlus className="h-5 w-5 text-blue-500" />;
            case 'new_chapter':
            case 'story_update': return <BookOpenText className="h-5 w-5 text-green-500" />;
            case 'comment_reply':
            case 'mention': return <MessageSquare className="h-5 w-5 text-purple-500" />; 
            case 'new_letter': return <Mail className="h-5 w-5 text-cyan-500" />;
            case 'letter_response': return <MailCheck className="h-5 w-5 text-teal-500" />;
            case 'achievement_unlocked': return <Bell className="h-5 w-5 text-yellow-500" />;
            case 'announcement': return <Bell className="h-5 w-5 text-orange-500" />;
            default: return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };
    
    const groupNotifications = (notifs: NotificationType[]) => {
        const groups: { [key: string]: NotificationType[] } = {
            Today: [],
            "This Week": [],
            "Earlier": [],
        };

        notifs.forEach(notif => {
            const date = (notif.timestamp as any)?.toDate ? (notif.timestamp as any).toDate() : new Date(notif.timestamp);
            if (isToday(date)) {
                groups.Today.push(notif);
            } else if (isThisWeek(date)) {
                groups["This Week"].push(notif);
            } else {
                groups.Earlier.push(notif);
            }
        });

        return groups;
    };

    const groupedNotifications = groupNotifications(notifications);

    if (authLoading && notifications.length === 0) {
        return (
             <div className="text-center py-20 text-muted-foreground flex flex-col items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="font-headline font-semibold">Updating activity feed...</p>
            </div>
        );
    }
    
    return (
        <Card className="shadow-none bg-transparent border-0 max-w-3xl mx-auto">
            <CardHeader className="flex flex-row justify-between items-center px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-2xl font-headline font-bold">Activity</CardTitle>
                {notifications.some(n => !n.isRead) && (
                    <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={authLoading} className="text-primary hover:text-primary/80">
                        Mark all as read
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-0">
                {notifications.length > 0 ? (
                    <div className="space-y-6 pb-20">
                        {Object.entries(groupedNotifications).map(([group, notifs]) => 
                         notifs.length > 0 && (
                            <div key={group}>
                                <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/60 px-4 md:px-6 mb-3">{group}</h3>
                                <div className="space-y-1">
                                    {notifs.map((notif) => (
                                        <div
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={cn(
                                                "p-4 mx-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-4 group",
                                                !notif.isRead ? 'bg-primary/5 hover:bg-primary/10 border border-primary/10' : 'hover:bg-muted/50 border border-transparent'
                                            )}
                                        >
                                        <div className="relative flex-shrink-0">
                                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm group-hover:scale-105 transition-transform">
                                                <AvatarImage src={notif.actor.avatarUrl} alt={notif.actor.username} data-ai-hint="profile person"/>
                                                <AvatarFallback className="bg-muted text-primary font-bold">{notif.actor.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                             <div className="absolute -bottom-1 -right-1 bg-card p-1 rounded-full shadow-sm ring-2 ring-background">
                                                {getNotificationIcon(notif.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm leading-snug text-foreground/90">
                                                <span className="font-bold text-foreground">@{notif.actor.username}</span> {notif.message.replace(`${notif.actor.displayName || notif.actor.username}`, '').trim()}
                                            </p>
                                            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-tighter mt-1">
                                            {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }) : 'A while ago'}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="flex-shrink-0 self-center ml-auto">
                                                <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" title="Unread"></div>
                                            </div>
                                        )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                         )
                        )}
                    </div>
                ) : (
                    <div className="text-center py-24 text-muted-foreground space-y-4">
                        <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="font-headline text-lg font-bold text-foreground">All caught up!</h3>
                        <p className="text-sm max-w-[200px] mx-auto">No new activity to show right now. Go explore some stories!</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MessagesClient() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');
  
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const [isNewConversationDialogOpen, setIsNewConversationDialogOpen] = useState(false);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<UserSummary[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isQueryHandled, setIsQueryHandled] = useState(false);

  const [isGeneratingStarters, startStarterTransition] = useTransition();
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!currentUser?.id) {
      if (!authLoading) setIsLoadingConversations(false);
      return;
    }

    setIsLoadingConversations(true);
    const q = query(
      collection(db, 'conversations'),
      where('participantIds', 'array-contains', currentUser.id),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedConversations = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Conversation));
      setConversations(fetchedConversations);
      setIsLoadingConversations(false);
    }, (error) => {
      console.error("Error fetching conversations: ", error);
      setIsLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesQuery = query(
      collection(db, 'conversations', activeConversation.id, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50) 
    );

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const fetchedMessages = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Message));
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error(`Error fetching messages for ${activeConversation.id}: `, error);
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeConversation]);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setConversationStarters([]);
    setMobileView('chat');
  };

  const handleSendMessage = async () => {
    if (!currentUser || !activeConversation || !newMessageContent.trim()) return;

    setIsSendingMessage(true);
    const messageData = {
      senderId: currentUser.id,
      content: newMessageContent.trim(),
      timestamp: serverTimestamp(),
    };

    try {
      const messageRef = await addDoc(collection(db, 'conversations', activeConversation.id, 'messages'), messageData);
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: {
          id: messageRef.id,
          content: messageData.content,
          senderId: messageData.senderId,
          timestamp: serverTimestamp(), 
        },
        updatedAt: serverTimestamp(),
      });
      setNewMessageContent('');
    } catch (error) {
      console.error("Error sending message: ", error);
      toast({ title: "Error sending message", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const getOtherParticipant = (conversation: Conversation): AppUserType | undefined => {
    if (!currentUser || !conversation.participantIds || !conversation.participantInfo) return undefined;
    const otherId = conversation.participantIds.find(id => id !== currentUser.id);
    return otherId ? conversation.participantInfo[otherId] : undefined;
  };

  const performUserSearch = async (searchTerm: string) => {
    if (!searchTerm.trim() || !currentUser) {
      setSearchedUsers([]);
      setIsSearchingUsers(false);
      return;
    }
    setIsSearchingUsers(true);
    setSearchedUsers([]); 
    try {
      const usersRef = collection(db, 'users');
      const usernameQuery = query(
        usersRef, where('username', '>=', searchTerm.trim()), where('username', '<=', searchTerm.trim() + '\uf8ff'), orderBy('username'), limit(5)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      let usersFound = usernameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUserType));
      
      const uniqueUsers = new Map<string, UserSummary>();
      usersFound
        .filter(u => u.id !== currentUser.id) 
        .forEach(u => uniqueUsers.set(u.id, { 
            id: u.id, username: u.username, displayName: u.displayName || u.username, avatarUrl: u.avatarUrl
        }));
      setSearchedUsers(Array.from(uniqueUsers.values()));
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearchingUsers(false);
    }
  };
  
  const debouncedSearch = useCallback(debounce(performUserSearch, 500), [currentUser]);

  useEffect(() => {
    if (searchUsername.trim().length > 0) {
      setIsSearchingUsers(true);
      debouncedSearch(searchUsername);
    } else {
      setSearchedUsers([]); 
      setIsSearchingUsers(false);
    }
  }, [searchUsername, debouncedSearch]);


  const handleStartNewConversation = useCallback(async (targetUser: UserSummary) => {
    if (!currentUser) return;
    setIsCreatingConversation(true);

    try {
      const sortedParticipantIds = [currentUser.id, targetUser.id].sort();
      const existingConvQuery = query(
        collection(db, 'conversations'), where('participantIds', '==', sortedParticipantIds), limit(1) 
      );
      const existingConvSnapshot = await getDocs(existingConvQuery);

      if (!existingConvSnapshot.empty) {
        const existingConv = { id: existingConvSnapshot.docs[0].id, ...existingConvSnapshot.docs[0].data() } as Conversation;
        handleSelectConversation(existingConv);
        setIsNewConversationDialogOpen(false);
        setSearchUsername(''); 
        setSearchedUsers([]);
      } else {
        const newConversationRef = doc(collection(db, 'conversations'));
        const currentUserSummary: UserSummary = {
            id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName || currentUser.username, avatarUrl: currentUser.avatarUrl,
        };
        const newConversationData: Omit<Conversation, 'id'> = {
          participantIds: sortedParticipantIds,
          participantInfo: { [currentUser.id]: currentUserSummary, [targetUser.id]: targetUser },
          updatedAt: serverTimestamp(),
          lastMessage: { id: '', content: 'Conversation started.', senderId: '', timestamp: serverTimestamp() },
          isGroup: false,
        };
        await setDoc(newConversationRef, newConversationData);
        const newConvSnap = await getDoc(newConversationRef);
        if (newConvSnap.exists()) handleSelectConversation({id: newConvSnap.id, ...newConvSnap.data()} as Conversation);
        setIsNewConversationDialogOpen(false);
        setSearchUsername('');
        setSearchedUsers([]);
      }
    } catch (error) {
      console.error("Error starting new conversation:", error);
      toast({ title: "Error", description: "Could not start new conversation.", variant: "destructive" });
    } finally {
      setIsCreatingConversation(false);
    }
  }, [currentUser, toast]);

  const handleGenerateStarters = () => {
    if (!activeConversation) return;
    const otherParticipant = getOtherParticipant(activeConversation);
    if (!otherParticipant || !currentUser) return;
    
    startStarterTransition(async () => {
        const result = await getConversationStarters({
            user1_bio: currentUser.bio,
            user2_bio: otherParticipant.bio,
        });
        if ('error' in result) {
            toast({ title: 'AI Error', description: result.error, variant: 'destructive'});
        } else {
            setConversationStarters(result.starters);
        }
    });
  };


  useEffect(() => {
    const startConversationWithId = searchParams.get('startConversationWith');
    if (startConversationWithId && currentUser && !isLoadingConversations && !isQueryHandled) {
      setIsQueryHandled(true);
      const existingConversation = conversations.find(c => c.participantIds.includes(startConversationWithId));
      if (existingConversation) {
        if (activeConversation?.id !== existingConversation.id) handleSelectConversation(existingConversation);
        return;
      }
      const fetchAndStart = async () => {
        const userDocRef = doc(db, 'users', startConversationWithId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const targetUser: UserSummary = {
            id: userSnap.id, username: userSnap.data().username, displayName: userSnap.data().displayName, avatarUrl: userSnap.data().avatarUrl,
          };
          await handleStartNewConversation(targetUser);
        } else {
          toast({ title: "User not found", description: "Could not find the user to start a conversation with.", variant: "destructive" });
        }
      };
      fetchAndStart();
    }
  }, [searchParams, currentUser, isLoadingConversations, conversations, handleStartNewConversation, toast, isQueryHandled, activeConversation?.id]);
  
    useEffect(() => {
        if (!activeConversation) {
            setMobileView('list');
        }
    }, [activeConversation]);

    return (
        <Dialog open={isNewConversationDialogOpen} onOpenChange={(isOpen) => {
            setIsNewConversationDialogOpen(isOpen);
            if (!isOpen) { setSearchUsername(''); setSearchedUsers([]); }
        }}>
        <TooltipProvider>
        <div className="flex h-[calc(100vh-12rem)] md:h-auto md:min-h-[700px] border rounded-3xl bg-card shadow-2xl overflow-hidden mb-10">
            <aside className={cn(
                "w-full md:w-[340px] lg:w-[400px] border-r flex flex-col bg-background/40 backdrop-blur-xl transition-all duration-300",
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            )}>
                <div className="p-6 border-b space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-headline font-bold tracking-tight">Messages</h2>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-primary hover:text-primary-foreground transition-all">
                                <UserPlus className="h-5 w-5" />
                                <span className="sr-only">New Message</span>
                            </Button>
                        </DialogTrigger>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search people..." className="pl-10 h-10 rounded-full bg-muted/50 border-none focus-visible:ring-primary/50" />
                    </div>
                </div>
                 <div className="p-2 px-4 border-b">
                   <StatusFeature />
                </div>
                <ScrollArea className="flex-1">
                    {isLoadingConversations ? (
                        <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-50">Syncing inbox...</span>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground space-y-4">
                            <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                <MessageSquare className="h-8 w-8 text-muted-foreground/40"/>
                            </div>
                            <h3 className="font-headline font-bold text-foreground">No chats yet</h3>
                            <p className="text-sm">Start a new message to begin a conversation with your community.</p>
                        </div>
                    ) : (
                    <div className="space-y-0.5 p-2">
                        {conversations.map(conv => {
                            const otherParticipant = getOtherParticipant(conv);
                            const lastMessageTimestampServer = conv.lastMessage?.timestamp as any; 
                            let lastMessageDisplayTime = '';
                            if (lastMessageTimestampServer && typeof lastMessageTimestampServer.toDate === 'function') {
                                lastMessageDisplayTime = formatDistanceToNow(lastMessageTimestampServer.toDate(), { addSuffix: true });
                            }
                            const isActive = activeConversation?.id === conv.id;
                            const isUnread = conv.lastMessage?.senderId !== currentUser?.id && !conv.lastMessage?.isRead;

                            return (
                            <div 
                                key={conv.id} 
                                className={cn( 
                                    "flex items-center gap-4 p-4 cursor-pointer rounded-2xl transition-all group relative", 
                                    isActive ? 'bg-primary/10' : 'hover:bg-muted/50'
                                )}
                                onClick={() => handleSelectConversation(conv)}
                            >
                                <div className="relative">
                                    {otherParticipant && (
                                        <Avatar className="h-14 w-14 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                                            <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} data-ai-hint="profile person" />
                                            <AvatarFallback className="bg-muted text-primary font-bold">{otherParticipant.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={cn("font-bold truncate text-sm", isActive ? 'text-primary' : 'text-foreground')}>
                                            {otherParticipant?.displayName || `@${otherParticipant?.username}` || 'Unknown User'}
                                        </h3>
                                        <span className={cn("text-[10px] font-semibold uppercase tracking-tighter", isUnread ? 'text-primary' : 'text-muted-foreground/60')}>
                                            {lastMessageDisplayTime}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={cn("text-xs truncate", isUnread ? 'text-foreground font-bold' : 'text-muted-foreground')}>
                                            {conv.lastMessage?.senderId === currentUser?.id && <span className="font-bold opacity-50 mr-1">You:</span>}
                                            {conv.lastMessage?.content || 'Started a conversation'}
                                        </p>
                                        {isUnread && <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 ml-2 shadow-[0_0_8px_rgba(var(--primary),0.5)]"></div>}
                                    </div>
                                </div>
                                {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full"></div>}
                            </div>
                            );
                        })}
                    </div>
                    )}
                </ScrollArea>
            </aside>

            <main className={cn(
                "flex-1 flex-col bg-background",
                mobileView === 'chat' ? 'flex' : 'hidden md:flex'
            )}>
                {activeConversation ? (
                    <>
                    <header className="p-4 border-b bg-card/50 backdrop-blur-md flex items-center justify-between gap-3 shadow-sm z-10">
                        <div className="flex items-center gap-3 overflow-hidden">
                             <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setMobileView('list')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            {getOtherParticipant(activeConversation) && (
                                <Link href={`/profile/${getOtherParticipant(activeConversation)!.id}`}>
                                    <Avatar className="h-10 w-10 border shadow-sm hover:scale-105 transition-transform">
                                        <AvatarImage src={getOtherParticipant(activeConversation)!.avatarUrl} alt={getOtherParticipant(activeConversation)!.username} data-ai-hint="profile person" />
                                        <AvatarFallback className="bg-muted text-primary font-bold">{getOtherParticipant(activeConversation)!.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                                    </Avatar>
                                </Link>
                            )}
                            <div className="truncate">
                                <h3 className="font-bold text-base truncate">
                                    {getOtherParticipant(activeConversation)?.displayName || `@${getOtherParticipant(activeConversation)?.username}` || 'Unknown User'}
                                </h3>
                                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </div>
                    </header>
                    
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-6">
                            {isLoadingMessages ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-20 flex flex-col items-center gap-6 text-muted-foreground">
                                    <div className="bg-muted/20 p-6 rounded-full">
                                        <Sparkles className="w-12 h-12 text-primary/40"/>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-headline text-xl font-bold text-foreground">Start the Conversation</h3>
                                        <p className="text-sm max-w-xs mx-auto">Don't be shy! Send a message or use AI to break the ice.</p>
                                    </div>
                                    <Button onClick={handleGenerateStarters} disabled={isGeneratingStarters} className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                        {isGeneratingStarters ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2" />}
                                        Get AI Icebreakers
                                    </Button>
                                    {conversationStarters.length > 0 && (
                                        <div className="mt-4 grid gap-2 w-full max-w-sm">
                                            {conversationStarters.map((starter, i) => (
                                                <Button key={i} variant="outline" size="sm" className="w-full text-wrap h-auto text-left justify-start p-3 rounded-2xl hover:bg-primary/5 transition-all" onClick={() => setNewMessageContent(starter)}>
                                                    "{starter}"
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                            <div className="flex flex-col gap-4">
                                {messages.map((msg, index) => {
                                    const senderInfo = msg.senderId && activeConversation.participantInfo ? activeConversation.participantInfo[msg.senderId] : undefined;
                                    const isCurrentUserSender = msg.senderId === currentUser?.id;
                                    const isNextSameSender = messages[index + 1]?.senderId === msg.senderId;
                                    
                                    return (
                                    <div key={msg.id} className={cn(
                                        "flex items-end gap-2 max-w-[85%] sm:max-w-[70%]", 
                                        isCurrentUserSender ? "self-end flex-row-reverse" : "self-start",
                                        !isNextSameSender ? "mb-4" : "mb-0.5"
                                    )}>
                                        {!isCurrentUserSender && !isNextSameSender && senderInfo && (
                                            <Avatar className="h-8 w-8 self-end flex-shrink-0 shadow-sm">
                                                <AvatarImage src={senderInfo?.avatarUrl} data-ai-hint="profile person" />
                                                <AvatarFallback className="bg-muted text-[10px] font-bold">{senderInfo?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                                            </Avatar>
                                        )}
                                        {(!isCurrentUserSender && isNextSameSender) && <div className="w-8" />}
                                        <div className={cn(
                                            "p-3.5 rounded-2xl shadow-sm text-sm whitespace-pre-line leading-relaxed", 
                                            isCurrentUserSender 
                                                ? "bg-primary text-primary-foreground rounded-br-none" 
                                                : "bg-muted text-foreground rounded-bl-none"
                                        )}>
                                            {msg.content}
                                            <div className={cn(
                                                "text-[9px] font-bold uppercase tracking-tighter mt-1 opacity-60 flex items-center justify-end gap-1",
                                                isCurrentUserSender ? "text-primary-foreground" : "text-muted-foreground"
                                            )}>
                                                {msg.timestamp?.toDate ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: false }) : 'Now'}
                                                {isCurrentUserSender && <CheckCheck className="h-3 w-3" />}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <footer className="p-4 border-t bg-card/50 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                           <Tooltip>
                              <TooltipTrigger asChild>
                                 <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-primary/10 hover:text-primary"><Sparkles className="h-5 w-5" /></Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-primary text-primary-foreground font-bold">AI Reply Magic</TooltipContent>
                           </Tooltip>
                           <div className="relative flex-1 group">
                              <Input 
                                type="text" 
                                placeholder="Write something amazing..." 
                                className="flex-1 bg-background focus-visible:ring-primary/20 rounded-2xl px-5 pr-12 h-12 border-none shadow-inner" 
                                value={newMessageContent} 
                                onChange={(e) => setNewMessageContent(e.target.value)} 
                                disabled={isSendingMessage} 
                                onKeyDown={(e) => e.key === 'Enter' && !isSendingMessage && handleSendMessage()} 
                              />
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary" onClick={() => toast({title: "Visual selector coming soon!"})}><Smile className="h-5 w-5" /></Button>
                              </div>
                           </div>
                           <Button 
                            type="button" 
                            size="icon" 
                            className="bg-primary hover:bg-primary/90 rounded-full h-12 w-12 flex-shrink-0 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" 
                            disabled={isSendingMessage || !newMessageContent.trim()} 
                            onClick={handleSendMessage}
                           >
                              {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                           </Button>
                        </div>
                    </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-background/20 backdrop-blur-sm">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-primary/10 rounded-full blur-2xl animate-pulse"></div>
                            <MessageSquare className="h-24 w-24 text-primary/30 relative z-10" />
                        </div>
                        <h2 className="text-3xl font-headline font-bold mb-3 tracking-tight">Your Direct Feed</h2>
                        <p className="text-muted-foreground max-w-sm leading-relaxed">Select a thread from the sidebar to view your messages and reconnect with fellow writers.</p>
                        <DialogTrigger asChild>
                            <Button className="mt-8 rounded-full px-8 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20">
                                <Plus className="mr-2 h-5 w-5" /> Start a New Thread
                            </Button>
                        </DialogTrigger>
                    </div>
                )}
            </main>
        </div>
        </TooltipProvider>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
            <DialogHeader className="p-6 bg-muted/30 border-b">
                <DialogTitle className="text-2xl font-headline font-bold">New Thread</DialogTitle>
                <DialogDescription className="text-sm">Connect with anyone on the platform by their unique handle.</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="search-username" 
                        value={searchUsername} 
                        onChange={(e) => setSearchUsername(e.target.value)}
                        placeholder="Search by username..." 
                        disabled={isCreatingConversation} 
                        className="pl-10 h-12 rounded-2xl bg-muted/50 border-none"
                    />
                    {isSearchingUsers && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
                </div>
                
                <ScrollArea className="max-h-[300px] -mx-2 px-2">
                    {searchedUsers.length > 0 ? (
                        <div className="space-y-2">
                            {searchedUsers.map(u => (
                                <div 
                                    key={u.id} 
                                    className="flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-primary/20 hover:bg-primary/5 cursor-pointer transition-all group"
                                    onClick={() => !isCreatingConversation && handleStartNewConversation(u)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                            <AvatarImage src={u.avatarUrl} alt={u.username} data-ai-hint="profile person" />
                                            <AvatarFallback className="bg-muted font-bold text-primary">{u.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-bold text-sm">@{u.username}</p>
                                            <p className="text-xs text-muted-foreground">{u.displayName}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                        {isCreatingConversation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    ) : searchUsername.trim().length > 0 && !isSearchingUsers ? (
                        <div className="py-10 text-center text-muted-foreground italic">
                            No users found matching "@{searchUsername}"
                        </div>
                    ) : (
                        <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <Users className="h-10 w-10 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Search for contributors</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
            <DialogFooter className="p-4 bg-muted/20 border-t">
                <DialogClose asChild><Button type="button" variant="outline" className="rounded-full px-6" disabled={isCreatingConversation}>Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}

export default function UnifiedInboxPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'messages'; 

    if (loading && !user) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-headline font-bold text-xl animate-pulse">Syncing your literary universe...</p>
            </div>
        );
    }
    
    if (!user && !loading) {
        router.push('/auth/signin');
        return null;
    }

    const handleTabChange = (value: string) => {
        router.push(`/notifications?tab=${value}`, { scroll: false });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pt-6">
             <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
                <div className="flex justify-center mb-6">
                    <TabsList className="grid grid-cols-2 w-full max-w-[400px] h-12 bg-muted/50 rounded-full p-1 border shadow-sm">
                        <TabsTrigger value="messages" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold transition-all gap-2">
                            <MessageSquare className="h-4 w-4" /> 
                            Threads
                        </TabsTrigger>
                        <TabsTrigger value="notifications" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold transition-all gap-2">
                            <Bell className="h-4 w-4" /> 
                            Activity
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                <TabsContent value="notifications" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
                    <NotificationsList />
                </TabsContent>
                
                <TabsContent value="messages" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
                    <MessagesClient />
                </TabsContent>
            </Tabs>
        </div>
    );
}
