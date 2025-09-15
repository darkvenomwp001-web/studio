
'use client';

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Loader2, UserPlus, BookOpenText, Mail, MailCheck, Inbox as InboxIcon, Send, Search, Paperclip, Smile, Sparkles, HelpCircle, Vote, Award, MoreHorizontal, ArrowLeft } from 'lucide-react';
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
    const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead, loading, authLoading } = useAuth();
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
            case 'achievement_unlocked': return <Award className="h-5 w-5 text-yellow-500" />;
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
             <div className="text-center py-10 text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                Loading notifications...
            </div>
        );
    }
    
    return (
        <Card className="shadow-lg bg-transparent border-0 max-w-3xl mx-auto">
            <CardHeader className="flex flex-row justify-between items-center px-4 pt-4 pb-2 md:px-6">
                <CardTitle className="text-2xl font-headline">Activity</CardTitle>
                {notifications.some(n => !n.isRead) && (
                    <Button variant="link" size="sm" onClick={handleMarkAllRead} disabled={authLoading}>
                        Mark all as read
                    </Button>
                )}
            </CardHeader>
            <CardContent className="p-0">
                {notifications.length > 0 ? (
                    <div className="space-y-4">
                        {Object.entries(groupedNotifications).map(([group, notifs]) => 
                         notifs.length > 0 && (
                            <div key={group}>
                                <h3 className="font-semibold text-sm text-muted-foreground px-4 md:px-6 mb-2">{group}</h3>
                                <ul className="space-y-0.5">
                                    {notifs.map((notif) => (
                                        <li
                                            key={notif.id}
                                            onClick={() => handleNotificationClick(notif)}
                                            className={cn(
                                                `p-3 mx-2 rounded-lg cursor-pointer transition-all hover:bg-muted/60 flex items-center gap-4`,
                                                !notif.isRead && 'bg-primary/10'
                                            )}
                                        >
                                        <div className="relative flex-shrink-0">
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
                                             <div className="absolute -bottom-1 -right-1 bg-card p-0.5 rounded-full">
                                                {getNotificationIcon(notif.type)}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm leading-snug text-foreground/90">
                                                <span className="font-semibold">{notif.actor.displayName || notif.actor.username}</span> {notif.message.replace(`${notif.actor.displayName || notif.actor.username}`, '').trim()}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                            {notif.timestamp ? formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true }) : 'A while ago'}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="flex-shrink-0 self-center ml-auto">
                                                <div className="w-2 h-2 bg-primary rounded-full" title="Unread"></div>
                                            </div>
                                        )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )
                        )}
                    </div>
                ) : (
                    <div className="text-center py-16 text-muted-foreground space-y-3">
                        <Bell className="h-12 w-12 mx-auto" />
                        <p>No notifications yet.</p>
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
      toast({ 
          title: "Could Not Load Messages", 
          description: "There was an error fetching your conversations. This is often due to missing database indexes. Please check your browser's developer console for a link to create the required index in Firebase.", 
          variant: "destructive",
          duration: 10000
      });
      setIsLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [currentUser, toast, authLoading]);

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
      toast({ title: "Error fetching messages", description: error.message, variant: "destructive" });
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeConversation, toast]);

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
      toast({ title: "Search Error", description: "Could not perform user search. Ensure Firestore indexes are set up.", variant: "destructive" });
    } finally {
      setIsSearchingUsers(false);
    }
  };
  
  const debouncedSearch = useCallback(debounce(performUserSearch, 500), [currentUser, toast]);

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
        const currentUserSummary: AppUserType = {
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
        <div className="flex flex-col md:flex-row h-[calc(100vh-12rem)] md:h-auto md:min-h-[600px] border bg-card rounded-lg shadow-xl overflow-hidden">
            <aside className={cn(
                "w-full md:w-[320px] lg:w-[380px] border-r flex flex-col bg-background/50 transition-all duration-300",
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            )}>
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-2xl font-headline font-bold">{currentUser?.displayName || 'Messages'}</h2>
                        <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <UserPlus className="h-5 w-5" />
                                <span className="sr-only">New Message</span>
                            </Button>
                        </DialogTrigger>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search messages..." className="pl-10 h-9 rounded-full bg-muted border-none" />
                    </div>
                </div>
                 <div className="p-2 border-b">
                   <StatusFeature />
                </div>
                <ScrollArea className="flex-1">
                    {isLoadingConversations ? (
                        <div className="p-4 text-center text-muted-foreground flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground space-y-3">
                            <MessageSquare className="h-10 w-10 mx-auto"/>
                            <h3 className="font-semibold text-foreground">No conversations yet</h3>
                            <p className="text-sm">Start a new message to begin a conversation.</p>
                        </div>
                    ) : (
                    conversations.map(conv => {
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
                            className={cn( `flex items-start gap-3 p-3 cursor-pointer border-l-4`, 
                            isActive ? 'bg-primary/10 border-primary' : 'border-transparent hover:bg-muted/50'
                            )}
                            onClick={() => handleSelectConversation(conv)}
                        >
                            <div className="relative">
                                {otherParticipant && (
                                    <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                                    <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} data-ai-hint="profile person" />
                                    <AvatarFallback>{otherParticipant.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background"></div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-center">
                                    <h3 className={cn(`font-semibold truncate`, isActive ? 'text-primary' : 'text-foreground')}>
                                        {otherParticipant?.displayName || otherParticipant?.username || 'Unknown User'}
                                    </h3>
                                    <span className={cn(`text-xs whitespace-nowrap`, isUnread ? 'text-primary font-bold' : 'text-muted-foreground')}>
                                        {lastMessageDisplayTime}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className={cn(`text-sm truncate`, isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
                                        {conv.lastMessage?.senderId === currentUser?.id && conv.lastMessage?.content && "You: "}
                                        {conv.lastMessage?.content || 'No messages yet.'}
                                    </p>
                                    {isUnread && <div className="w-2.5 h-2.5 bg-primary rounded-full flex-shrink-0 ml-2"></div>}
                                </div>
                            </div>
                        </div>
                        );
                    })
                    )}
                </ScrollArea>
            </aside>

            <main className={cn(
                "flex-1 flex-col bg-background",
                mobileView === 'chat' ? 'flex' : 'hidden md:flex'
            )}>
                {activeConversation ? (
                    <>
                    <header className="p-3 border-b bg-card flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                             <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileView('list')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            {getOtherParticipant(activeConversation) && (
                                <Avatar>
                                    <AvatarImage src={getOtherParticipant(activeConversation)!.avatarUrl} alt={getOtherParticipant(activeConversation)!.username} data-ai-hint="profile person" />
                                    <AvatarFallback>{getOtherParticipant(activeConversation)!.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                                </Avatar>
                            )}
                            <div>
                                <h3 className="font-semibold text-lg">{getOtherParticipant(activeConversation)?.displayName || getOtherParticipant(activeConversation)?.username || 'Unknown User'}</h3>
                                <p className="text-xs text-green-500 font-medium">Online</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-5 w-5" />
                        </Button>
                    </header>
                    
                    <ScrollArea className="flex-1 p-4 space-y-4">
                        {isLoadingMessages ? (
                            <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-10 flex flex-col items-center gap-4 text-muted-foreground">
                                <MessageSquare className="w-16 h-16"/>
                                <h3 className="font-semibold text-lg text-foreground">Start the Conversation</h3>
                                <p>No messages here yet. Break the ice!</p>
                                <Button onClick={handleGenerateStarters} disabled={isGeneratingStarters}>
                                    {isGeneratingStarters ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2" />}
                                    Get Conversation Starters
                                </Button>
                                {conversationStarters.length > 0 && (
                                    <div className="mt-4 space-y-2 text-left">
                                        {conversationStarters.map((starter, i) => (
                                            <Button key={i} variant="outline" size="sm" className="w-full text-wrap h-auto" onClick={() => setNewMessageContent(starter)}>{starter}</Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                        messages.map(msg => {
                            const senderInfo = msg.senderId && activeConversation.participantInfo ? activeConversation.participantInfo[msg.senderId] : undefined;
                            const isCurrentUserSender = msg.senderId === currentUser?.id;
                            
                            return (
                            <div key={msg.id} className={cn("flex items-end gap-2 max-w-[80%] sm:max-w-[70%]", isCurrentUserSender ? "self-end flex-row-reverse" : "self-start")}>
                                {!isCurrentUserSender && senderInfo && (
                                    <Avatar className="h-8 w-8 self-end">
                                        <AvatarImage src={senderInfo?.avatarUrl} data-ai-hint="profile person" />
                                        <AvatarFallback>{senderInfo?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("p-3 rounded-2xl shadow-sm", isCurrentUserSender ? "rounded-br-none bg-primary text-primary-foreground" : "rounded-bl-none bg-card text-foreground")}>
                                <p className="text-sm whitespace-pre-line">{msg.content}</p>
                                </div>
                            </div>
                            );
                        })
                        )}
                        {/* Typing indicator could go here */}
                        <div ref={messagesEndRef} />
                    </ScrollArea>

                    <footer className="p-2 border-t bg-card">
                        <div className="flex items-center gap-2">
                           {/* AI Suggestions Button */}
                           <Tooltip>
                              <TooltipTrigger asChild>
                                 <Button type="button" variant="ghost" size="icon"><Sparkles className="h-5 w-5 text-muted-foreground" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>AI Reply Suggestions</p></TooltipContent>
                           </Tooltip>
                           <div className="relative flex-1">
                              <Input type="text" placeholder="Type a message..." className="flex-1 bg-background focus-visible:ring-primary rounded-full px-4 pr-10" value={newMessageContent} onChange={(e) => setNewMessageContent(e.target.value)} disabled={isSendingMessage} onKeyDown={(e) => e.key === 'Enter' && !isSendingMessage && handleSendMessage()} />
                              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={() => toast({title: "Emoji picker coming soon!"})}><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                           </div>
                           <Button type="button" size="icon" className="bg-primary hover:bg-primary/90 rounded-full flex-shrink-0" disabled={isSendingMessage || !newMessageContent.trim()} onClick={handleSendMessage}>
                              {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                           </Button>
                        </div>
                    </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-background">
                    <MessageSquare className="h-24 w-24 text-muted-foreground/30 mb-6" />
                    <h2 className="text-2xl font-headline font-semibold mb-2">Select a Conversation</h2>
                    <p className="text-muted-foreground">Select a conversation from the list or start a new one.</p>
                    </div>
                )}
            </main>
        </div>
        </TooltipProvider>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>Type a username to find users and start messaging.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
                <Input
                id="search-username" value={searchUsername} onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Enter username..." disabled={isCreatingConversation} className="flex-grow"
                />
                {isSearchingUsers && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            </div>
            {searchedUsers.length > 0 && (
            <ScrollArea className="max-h-60 mt-2">
                <div className="space-y-2">
                {searchedUsers.map(user => (
                    <div 
                    key={user.id} className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => !isCreatingConversation && handleStartNewConversation(user)} aria-disabled={isCreatingConversation}
                    >
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="profile person" /><AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback></Avatar>
                        <span>{user.displayName || user.username}</span>
                    </div>
                    {isCreatingConversation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 text-primary" />}
                    </div>
                ))}
                </div>
            </ScrollArea>
            )}
            {searchUsername.trim().length > 0 && !isSearchingUsers && searchedUsers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">No users found matching "{searchUsername}".</p>
            )}
            <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isCreatingConversation}>Close</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}

export default function UnifiedInboxPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'messages'; // Default to messages

    if (loading && !user) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Inbox...</p>
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
        <div className="max-w-7xl mx-auto space-y-4">
             <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
                    <TabsTrigger value="messages"><MessageSquare className="mr-2 h-4 w-4" /> Messages</TabsTrigger>
                    <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Activity</TabsTrigger>
                </TabsList>
                <TabsContent value="notifications" className="mt-4">
                    <NotificationsList />
                </TabsContent>
                <TabsContent value="messages" className="mt-4">
                    <MessagesClient />
                </TabsContent>
            </Tabs>
        </div>
    );
}

