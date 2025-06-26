'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Loader2, CheckCircle, UserPlus, BookOpenText, Mail, MailCheck, Inbox as InboxIcon, Send, Search, Paperclip, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
            case 'new_follower':
                return <UserPlus className="h-5 w-5 text-blue-500" />;
            case 'new_chapter':
            case 'story_update':
                return <BookOpenText className="h-5 w-5 text-green-500" />;
            case 'comment_reply':
            case 'mention':
                return <CheckCircle className="h-5 w-5 text-purple-500" />; 
            case 'new_letter':
                return <Mail className="h-5 w-5 text-cyan-500" />;
            case 'letter_response':
                return <MailCheck className="h-5 w-5 text-teal-500" />;
            case 'announcement':
                return <Bell className="h-5 w-5 text-orange-500" />;
            default:
                return <Bell className="h-5 w-5 text-muted-foreground" />;
        }
    };

    if (authLoading && notifications.length === 0) {
        return (
             <div className="text-center py-10 text-muted-foreground flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-3" />
                Loading notifications...
            </div>
        );
    }
    
    return (
        <Card className="shadow-lg">
            <CardHeader className="flex flex-row justify-between items-center">
                <CardTitle className="text-lg">All Notifications</CardTitle>
                {notifications.length > 0 && (
                    <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={authLoading || notifications.every(n => n.isRead)}>
                    {authLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Mark all as read
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                {notifications.length > 0 ? (
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
      toast({ title: "Error fetching conversations", description: error.message, variant: "destructive" });
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
  
  const getOtherParticipant = (conversation: Conversation): UserSummary | undefined => {
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
        usersRef,
        where('username', '>=', searchTerm.trim()),
        where('username', '<=', searchTerm.trim() + '\uf8ff'), 
        orderBy('username'),
        limit(5)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      let usersFound = usernameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUserType));

      if (usersFound.length < 5) {
        const displayNameQuery = query(
          usersRef,
          where('displayName', '>=', searchTerm.trim()),
          where('displayName', '<=', searchTerm.trim() + '\uf8ff'),
          orderBy('displayName'),
          limit(5 - usersFound.length)
        );
        const displayNameSnapshot = await getDocs(displayNameQuery);
        const usersByDisplayName = displayNameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUserType));
        usersFound = [...usersFound, ...usersByDisplayName];
      }
      
      const uniqueUsers = new Map<string, UserSummary>();
      usersFound
        .filter(u => u.id !== currentUser.id) 
        .forEach(u => uniqueUsers.set(u.id, { 
            id: u.id,
            username: u.username,
            displayName: u.displayName || u.username,
            avatarUrl: u.avatarUrl
        }));

      const finalResults = Array.from(uniqueUsers.values());

      setSearchedUsers(finalResults);
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
        collection(db, 'conversations'),
        where('participantIds', '==', sortedParticipantIds),
        limit(1) 
      );
      
      const existingConvSnapshot = await getDocs(existingConvQuery);

      if (!existingConvSnapshot.empty) {
        const existingConv = { id: existingConvSnapshot.docs[0].id, ...existingConvSnapshot.docs[0].data() } as Conversation;
        setActiveConversation(existingConv);
        setIsNewConversationDialogOpen(false);
        setSearchUsername(''); 
        setSearchedUsers([]);
        toast({ title: "Conversation Exists", description: `Opened existing chat with ${targetUser.displayName || targetUser.username}.` });
      } else {
        const newConversationRef = doc(collection(db, 'conversations'));
        const currentUserSummary: UserSummary = {
            id: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName || currentUser.username,
            avatarUrl: currentUser.avatarUrl
        };
        const newConversationData: Omit<Conversation, 'id'> = {
          participantIds: sortedParticipantIds,
          participantInfo: {
            [currentUser.id]: currentUserSummary,
            [targetUser.id]: targetUser,
          },
          updatedAt: serverTimestamp(),
          lastMessage: {
            id: '',
            content: 'Conversation started.',
            senderId: '',
            timestamp: serverTimestamp(),
          },
        };
        await setDoc(newConversationRef, newConversationData);
        
        const newConvSnap = await getDoc(newConversationRef);
        if (newConvSnap.exists()) {
            setActiveConversation({id: newConvSnap.id, ...newConvSnap.data()} as Conversation);
        }

        setIsNewConversationDialogOpen(false);
        setSearchUsername('');
        setSearchedUsers([]);
        toast({ title: "Conversation Started", description: `You can now message ${targetUser.displayName || targetUser.username}.` });
      }
    } catch (error) {
      console.error("Error starting new conversation:", error);
      toast({ title: "Error", description: "Could not start new conversation.", variant: "destructive" });
    } finally {
      setIsCreatingConversation(false);
    }
  }, [currentUser, toast]);


  useEffect(() => {
    const startConversationWithId = searchParams.get('startConversationWith');
    if (startConversationWithId && currentUser && !isLoadingConversations && !isQueryHandled) {
      setIsQueryHandled(true);
      
      const existingConversation = conversations.find(c => c.participantIds.includes(startConversationWithId));
      if (existingConversation) {
        if (activeConversation?.id !== existingConversation.id) {
          setActiveConversation(existingConversation);
        }
        return;
      }

      const fetchAndStart = async () => {
        const userDocRef = doc(db, 'users', startConversationWithId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const targetUser: UserSummary = {
            id: userSnap.id,
            username: userSnap.data().username,
            displayName: userSnap.data().displayName,
            avatarUrl: userSnap.data().avatarUrl,
          };
          await handleStartNewConversation(targetUser);
        } else {
          toast({ title: "User not found", description: "Could not find the user to start a conversation with.", variant: "destructive" });
        }
      };
      
      fetchAndStart();
    }
  }, [searchParams, currentUser, isLoadingConversations, conversations, handleStartNewConversation, toast, isQueryHandled, activeConversation?.id]);

    return (
        <Dialog open={isNewConversationDialogOpen} onOpenChange={(isOpen) => {
            setIsNewConversationDialogOpen(isOpen);
            if (!isOpen) { 
                setSearchUsername('');
                setSearchedUsers([]);
            }
        }}>
        <div className="flex flex-col md:flex-row h-[calc(100vh-18rem)] border bg-card rounded-lg shadow-xl overflow-hidden">
            <aside className="w-full md:w-1/3 lg:w-1/4 border-r flex flex-col">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                <h2 className="text-xl font-headline font-semibold">Conversations</h2>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-primary">
                    <UserPlus className="h-5 w-5" />
                    <span className="sr-only">New Message</span>
                    </Button>
                </DialogTrigger>
                </div>
            </div>
            <ScrollArea className="flex-1">
                {isLoadingConversations ? (
                <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading...</div>
                ) : conversations.length === 0 ? (
                <p className="p-4 text-center text-muted-foreground">No conversations yet.</p>
                ) : (
                conversations.map(conv => {
                    const otherParticipant = getOtherParticipant(conv);
                    const lastMessageTimestampServer = conv.lastMessage?.timestamp as any; 
                    let lastMessageDisplayTime = '...';
                    if (lastMessageTimestampServer && typeof lastMessageTimestampServer.toDate === 'function') {
                      lastMessageDisplayTime = formatDistanceToNow(lastMessageTimestampServer.toDate(), { addSuffix: true });
                    }
                    const isActive = activeConversation?.id === conv.id;

                    return (
                    <div 
                        key={conv.id} 
                        className={cn(
                        `flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50`, 
                        isActive ? 'bg-primary/10 border-l-4 border-primary' : ''
                        )}
                        onClick={() => handleSelectConversation(conv)}
                    >
                        {otherParticipant && (
                            <Avatar className="h-12 w-12">
                            <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} data-ai-hint="profile person" />
                            <AvatarFallback>{otherParticipant.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                            </Avatar>
                        )}
                        <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                            <h3 className={cn(`font-semibold truncate`, isActive ? 'text-primary' : 'text-foreground')}>
                                {otherParticipant?.displayName || otherParticipant?.username || 'Unknown User'}
                            </h3>
                            <span className={cn(`text-xs whitespace-nowrap`, isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                              {lastMessageDisplayTime}
                            </span>
                        </div>
                        <p className={cn(`text-sm truncate`, isActive ? 'text-foreground/90' : 'text-muted-foreground')}>
                            {conv.lastMessage?.senderId === currentUser?.id && conv.lastMessage?.content && "You: "}
                            {conv.lastMessage?.content || 'No messages yet.'}
                        </p>
                        </div>
                    </div>
                    );
                })
                )}
            </ScrollArea>
            </aside>

            <main className="flex-1 flex flex-col bg-background">
            {activeConversation ? (
                <>
                <header className="p-4 border-b bg-card flex items-center gap-3 shadow-sm">
                    {getOtherParticipant(activeConversation) && (
                        <Avatar>
                        <AvatarImage src={getOtherParticipant(activeConversation)!.avatarUrl} alt={getOtherParticipant(activeConversation)!.username} data-ai-hint="profile person" />
                        <AvatarFallback>{getOtherParticipant(activeConversation)!.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                        </Avatar>
                    )}
                    <h3 className="font-semibold text-lg">{getOtherParticipant(activeConversation)?.displayName || getOtherParticipant(activeConversation)?.username || 'Unknown User'}</h3>
                </header>
                
                <ScrollArea className="flex-1 p-4 space-y-4">
                    {isLoadingMessages ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                    ) : messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10">No messages in this conversation yet. Say hi!</p>
                    ) : (
                    messages.map(msg => {
                        const senderInfo = msg.senderId && activeConversation.participantInfo ? activeConversation.participantInfo[msg.senderId] : undefined;
                        const isCurrentUserSender = msg.senderId === currentUser?.id;
                        const messageTimestampServer = msg.timestamp as any;
                        let messageDisplayTime = '';
                        if (messageTimestampServer && typeof messageTimestampServer.toDate === 'function') {
                          messageDisplayTime = formatDistanceToNow(messageTimestampServer.toDate(), {addSuffix: true});
                        }
                        return (
                        <div key={msg.id} className={cn("flex items-end gap-2", isCurrentUserSender && "justify-end")}>
                            {!isCurrentUserSender && senderInfo && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={senderInfo?.avatarUrl} data-ai-hint="profile person" />
                                    <AvatarFallback>{senderInfo?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                                </Avatar>
                            )}
                            <div 
                              className={cn("max-w-xs md:max-w-md p-3 rounded-lg shadow", isCurrentUserSender ? "rounded-br-none bg-primary text-primary-foreground" : "rounded-bl-none bg-muted text-foreground")}
                            >
                              <p className="text-sm whitespace-pre-line">{msg.content}</p>
                              {messageDisplayTime && (
                                <p className={cn("text-xs mt-1 text-right", isCurrentUserSender ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                  {messageDisplayTime}
                                </p>
                              )}
                            </div>
                            {isCurrentUserSender && currentUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={currentUser.avatarUrl} data-ai-hint="profile person" />
                                    <AvatarFallback>{currentUser.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            )}
                        </div>
                        );
                    })
                    )}
                    <div ref={messagesEndRef} />
                </ScrollArea>

                <footer className="p-4 border-t bg-card">
                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => toast({title: "Emoji picker coming soon!"})}><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => toast({title: "Attachment feature coming soon!"})}><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                      <Input type="text" placeholder="Type a message..." className="flex-1 bg-background focus-visible:ring-primary" value={newMessageContent} onChange={(e) => setNewMessageContent(e.target.value)} disabled={isSendingMessage} />
                      <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSendingMessage || !newMessageContent.trim()}>
                        {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </form>
                </footer>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="h-24 w-24 text-muted-foreground/50 mb-6" />
                <h2 className="text-2xl font-headline font-semibold mb-2">Select a Conversation</h2>
                <p className="text-muted-foreground">Select a conversation from the list or start a new one.</p>
                </div>
            )}
            </main>
        </div>
        
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
            <DialogTitle>Start New Conversation</DialogTitle>
            <DialogDescription>
                Type a username or display name to find users and start messaging.
            </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
            <div className="flex items-center gap-2">
                <Input
                id="search-username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                placeholder="Enter username or display name..."
                disabled={isCreatingConversation}
                className="flex-grow"
                />
                {isSearchingUsers && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </div>
            </div>
            {searchedUsers.length > 0 && (
            <ScrollArea className="max-h-60 mt-2">
                <div className="space-y-2">
                {searchedUsers.map(user => (
                    <div 
                    key={user.id} 
                    className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => !isCreatingConversation && handleStartNewConversation(user)}
                    aria-disabled={isCreatingConversation}
                    >
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="profile person" />
                        <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
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
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isCreatingConversation}>Close</Button>
            </DialogClose>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}


export default function UnifiedInboxPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'notifications';

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
        <div className="max-w-7xl mx-auto space-y-8">
            <header className="text-center">
                <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center justify-center gap-3">
                <InboxIcon className="h-10 w-10" /> Inbox
                </h1>
                <p className="text-muted-foreground">Stay updated with notifications and private messages.</p>
            </header>

            <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="notifications">
                         <Bell className="mr-2 h-4 w-4" /> Notifications
                    </TabsTrigger>
                    <TabsTrigger value="messages">
                        <MessageSquare className="mr-2 h-4 w-4" /> Messages
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="notifications" className="mt-6">
                    <NotificationsList />
                </TabsContent>
                <TabsContent value="messages" className="mt-6">
                    <MessagesClient />
                </TabsContent>
            </Tabs>
        </div>
    );
}
