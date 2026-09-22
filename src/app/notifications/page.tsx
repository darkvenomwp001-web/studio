'use client';

import { useState, useEffect, useCallback, useRef, useTransition, useMemo, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  MessageSquare, 
  Loader2, 
  UserPlus, 
  BookOpenText, 
  Mail, 
  MailCheck, 
  Search, 
  Sparkles, 
  ArrowLeft, 
  CheckCheck, 
  Plus, 
  Users, 
  Phone, 
  Video, 
  Smile, 
  Send,
  Trash2,
  User,
  ImageIcon,
  Mic,
  MoreHorizontal,
  Repeat,
  BellOff,
  X,
  Music,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, isToday, isThisWeek, isYesterday, format } from 'date-fns';
import type { NotificationType, Conversation, Message, UserSummary, User as AppUserType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
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
  limit,
  getDocs,
  getDoc,
  deleteDoc
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
  DialogTrigger,
  DialogClose,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { getConversationStarters } from '@/app/actions/aiActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StatusFeature from '@/components/status/StatusFeature';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

const parseSafeDate = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    if (timestamp.seconds !== undefined) return new Date(timestamp.seconds * 1000);
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
};

function NotificationsList() {
    const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead, authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [userStatuses, setUserStatuses] = useState<Record<string, 'online' | 'offline'>>({});

    useEffect(() => {
        const statusRef = ref(rtdb, 'status');
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const data = snapshot.val() || {};
            const statuses: Record<string, 'online' | 'offline'> = {};
            Object.keys(data).forEach(uid => { statuses[uid] = data[uid].state; });
            setUserStatuses(statuses);
        });
        return () => unsubscribe();
    }, []);

    const handleNotificationClick = async (notification: NotificationType) => {
        if (!notification.isRead) {
            try { await markNotificationAsRead(notification.id); } 
            catch (error) { toast({ title: "Update failed", variant: "destructive"}); }
        }
        if (notification.link) router.push(notification.link);
    };

    const handleMarkAllRead = async () => {
        if (notifications.every(n => n.isRead)) return;
        try { await markAllNotificationsAsRead(); } 
        catch (error) { toast({ title: "Update failed", variant: "destructive"}); }
    };

    const getNotificationIcon = (type: NotificationType['type']) => {
        switch (type) {
            case 'new_follower': return <UserPlus className="h-4 w-4 text-blue-500" />;
            case 'new_chapter':
            case 'story_update': return <BookOpenText className="h-4 w-4 text-green-500" />;
            case 'comment_reply':
            case 'mention': return <MessageSquare className="h-4 w-4 text-purple-500" />; 
            case 'new_letter': return <Mail className="h-4 w-4 text-cyan-500" />;
            case 'letter_response': return <MailCheck className="h-4 w-4 text-teal-500" />;
            case 'achievement_unlocked': return <Bell className="h-4 w-4 text-yellow-500" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };
    
    const filteredNotifications = useMemo(() => {
        if (!searchTerm.trim()) return notifications;
        const term = searchTerm.toLowerCase();
        return notifications.filter(n => n.message.toLowerCase().includes(term) || n.actor.username.toLowerCase().includes(term));
    }, [notifications, searchTerm]);

    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: NotificationType[] } = { Today: [], "This Week": [], "Earlier": [] };
        filteredNotifications.forEach(notif => {
            const date = parseSafeDate(notif.timestamp);
            if (!date) return;
            if (isToday(date)) groups.Today.push(notif);
            else if (isThisWeek(date)) groups["This Week"].push(notif);
            else groups.Earlier.push(notif);
        });
        return groups;
    }, [filteredNotifications]);

    return (
        <Card className="shadow-none bg-transparent border-0 max-w-3xl mx-auto w-full px-4">
            <CardHeader className="flex flex-col gap-4 px-0 pt-0 pb-6">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-3xl font-headline font-bold">Activity</CardTitle>
                    {notifications.some(n => !n.isRead) && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-primary font-black uppercase text-[10px] tracking-widest">
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search your activity..." 
                        className="pl-10 bg-muted/30 border-none h-11 rounded-2xl focus-visible:ring-primary/20" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                {filteredNotifications.length > 0 ? (
                    <div className="space-y-8 pb-32">
                        {Object.entries(groupedNotifications).map(([group, notifs]) => 
                         notifs.length > 0 && (
                            <div key={group} className="space-y-3">
                                <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 px-1">{group}</h3>
                                <div className="space-y-2">
                                    {notifs.map((notif) => {
                                        const date = parseSafeDate(notif.timestamp);
                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={cn(
                                                    "p-4 rounded-3xl cursor-pointer transition-all duration-300 flex items-center gap-4 group relative",
                                                    !notif.isRead ? 'bg-primary/5 border border-primary/10 shadow-sm' : 'hover:bg-muted/30 border border-transparent'
                                                )}
                                            >
                                                <div className="relative flex-shrink-0">
                                                    <Avatar className="h-12 w-12 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                                                        <AvatarImage src={notif.actor.avatarUrl} />
                                                        <AvatarFallback className="bg-muted text-primary font-bold">{notif.actor.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-1 -right-1 bg-card p-1 rounded-full shadow-lg ring-2 ring-background">
                                                        {getNotificationIcon(notif.type)}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm leading-snug text-foreground/90 font-medium">
                                                        <span className="font-black text-foreground">{notif.actor.displayName || `@${notif.actor.username}`}</span> {notif.message.replace(`${notif.actor.displayName || notif.actor.username}`, '').trim()}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-tight mt-1">
                                                        {date ? formatDistanceToNow(date, { addSuffix: true }) : 'Just now'}
                                                    </p>
                                                </div>
                                                {!notif.isRead && (
                                                    <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                         )
                        )}
                    </div>
                ) : (
                    <div className="text-center py-32 opacity-40">
                        <Bell className="h-12 w-12 mx-auto mb-4" />
                        <h3 className="font-bold text-sm uppercase tracking-widest">No activity found</h3>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MessagesClient() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
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
  const [sidebarSearch, setSidebarSearch] = useState('');

  const [isGeneratingStarters, startStarterTransition] = useTransition();
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [userStatuses, setUserStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [otherUserTyping, setOtherUserTyping] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  useEffect(() => {
    const statusRef = ref(rtdb, 'status');
    const unsub = onValue(statusRef, (snapshot) => {
        const data = snapshot.val() || {};
        const statuses: Record<string, 'online' | 'offline'> = {};
        Object.keys(data).forEach(uid => { statuses[uid] = data[uid].state; });
        setUserStatuses(statuses);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeConversation || !currentUser) return;
    const otherId = activeConversation.participantIds.find(id => id !== currentUser.id);
    if (!otherId) return;
    const typingRef = ref(rtdb, `typing/${activeConversation.id}/${otherId}`);
    return onValue(typingRef, (snapshot) => { setOtherUserTyping(!!snapshot.val()); });
  }, [activeConversation, currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const q = query(collection(db, 'conversations'), where('participantIds', 'array-contains', currentUser.id), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, 
      (snapshot) => {
        setConversations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation)));
        setIsLoadingConversations(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: 'conversations',
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoadingConversations(false);
      }
    );
  }, [currentUser]);

  useEffect(() => {
    if (!activeConversation?.id) { setMessages([]); return; }
    setIsLoadingMessages(true);
    const q = query(collection(db, 'conversations', activeConversation.id, 'messages'), orderBy('timestamp', 'asc'), limit(100));
    const unsub = onSnapshot(q, 
      (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message)));
        setIsLoadingMessages(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: `conversations/${activeConversation.id}/messages`,
          operation: 'list',
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
        setIsLoadingMessages(false);
      }
    );

    // Mark as Read Protocol
    if (currentUser && activeConversation.lastMessage?.senderId !== currentUser.id && activeConversation.lastMessage?.isRead === false) {
        updateDoc(doc(db, 'conversations', activeConversation.id), { 'lastMessage.isRead': true })
            .catch(async (error) => {
                 // Silent catch, standard read updates don't block UI
            });
    }

    return () => unsub();
  }, [activeConversation, currentUser]);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setConversationStarters([]);
    setMobileView('chat');
  };

  const handleSendMessage = async (contentInput?: string) => {
    const finalContent = contentInput || newMessageContent;
    if (!currentUser || !activeConversation || !finalContent.trim()) return;

    setIsSendingMessage(true);
    const messageData = {
      senderId: currentUser.id,
      content: finalContent.trim(),
      timestamp: serverTimestamp(),
      type: 'text',
    };

    const convRef = doc(db, 'conversations', activeConversation.id);
    const messagesColRef = collection(convRef, 'messages');

    try {
      const typingRef = ref(rtdb, `typing/${activeConversation.id}/${currentUser.id}`);
      remove(typingRef);
      
      const messageRef = await addDoc(messagesColRef, messageData);
      
      await updateDoc(convRef, {
        lastMessage: { 
          id: messageRef.id, 
          content: finalContent.trim(), 
          senderId: currentUser.id, 
          timestamp: serverTimestamp(), 
          isRead: false 
        },
        updatedAt: serverTimestamp(),
      });
      setNewMessageContent('');
    } catch (error: any) { 
        const permissionError = new FirestorePermissionError({
            path: `conversations/${activeConversation.id}/messages`,
            operation: 'create',
            requestResourceData: messageData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
    }
    finally { setIsSendingMessage(false); }
  };
  
  const getOtherParticipant = (conversation: Conversation): AppUserType | undefined => {
    if (!currentUser) return undefined;
    const otherId = conversation.participantIds.find(id => id !== currentUser.id);
    return otherId ? (conversation.participantInfo[otherId] as any) : undefined;
  };

  const performUserSearch = async (searchTerm: string) => {
    if (!searchTerm.trim() || !currentUser) { setSearchedUsers([]); return; }
    setIsSearchingUsers(true);
    try {
      const q = query(collection(db, 'users'), where('username', '>=', searchTerm.trim().toLowerCase()), where('username', '<=', searchTerm.trim().toLowerCase() + '\uf8ff'), limit(5));
      const snapshot = await getDocs(q);
      setSearchedUsers(snapshot.docs.filter(d => d.id !== currentUser.id).map(d => ({ id: d.id, ...d.data() } as UserSummary)));
    } catch (error) {
        // Handle search error silently
    } finally { setIsSearchingUsers(false); }
  };
  
  const debouncedSearch = useCallback(debounce(performUserSearch, 500), [currentUser]);

  useEffect(() => {
    if (searchUsername.trim()) debouncedSearch(searchUsername);
    else setSearchedUsers([]);
  }, [searchUsername, debouncedSearch]);

  const handleStartNewConversation = async (targetUser: UserSummary) => {
    if (!currentUser) return;
    const participants = [currentUser.id, targetUser.id].sort();
    const q = query(collection(db, 'conversations'), where('participantIds', '==', participants));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
      handleSelectConversation({ id: snap.docs[0].id, ...snap.docs[0].data() } as Conversation);
    } else {
      const newConvData = {
        participantIds: participants,
        participantInfo: { 
            [currentUser.id]: { id: currentUser.id, username: currentUser.username, avatarUrl: currentUser.avatarUrl }, 
            [targetUser.id]: { id: targetUser.id, username: targetUser.username, avatarUrl: targetUser.avatarUrl, displayName: targetUser.displayName } 
        },
        updatedAt: serverTimestamp(),
        lastMessage: { id: '', content: 'Thread started.', senderId: '', timestamp: serverTimestamp(), isRead: true },
        isGroup: false,
      };

      try {
        const newConv = await addDoc(collection(db, 'conversations'), newConvData);
        handleSelectConversation({ id: newConv.id, ...newConvData } as any);
      } catch (error) {
        const permissionError = new FirestorePermissionError({
            path: 'conversations',
            operation: 'create',
            requestResourceData: newConvData,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }
    }
    setIsNewConversationDialogOpen(false);
  };

  const handleDeleteConversation = async (convId: string) => {
      if (!confirm("Are you sure you want to delete this thread?")) return;
      const convRef = doc(db, 'conversations', convId);
      deleteDoc(convRef)
        .then(() => {
            toast({ title: "Thread deleted" });
            if (activeConversation?.id === convId) {
                setActiveConversation(null);
                setMobileView('list');
            }
        })
        .catch(async (error) => {
            const permissionError = new FirestorePermissionError({
                path: convRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const filteredConversations = useMemo(() => {
    if (!sidebarSearch.trim()) return conversations;
    const term = sidebarSearch.toLowerCase();
    return conversations.filter(conv => {
        const other = getOtherParticipant(conv);
        return other?.username.toLowerCase().includes(term) || other?.displayName?.toLowerCase().includes(term);
    });
  }, [conversations, sidebarSearch, currentUser]);

  return (
    <div className="flex h-[calc(100vh-14rem)] md:h-[800px] border-none sm:border rounded-none sm:rounded-[3rem] bg-card sm:shadow-3xl overflow-hidden mb-10 border-border/40 w-full max-w-7xl mx-auto">
        <aside className={cn(
            "w-full md:w-[360px] border-r flex flex-col bg-background/40 backdrop-blur-xl transition-all duration-300",
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        )}>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-headline font-bold">Threads</h2>
                    <Button variant="outline" size="icon" className="rounded-full shadow-sm" onClick={() => setIsNewConversationDialogOpen(true)}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Search chats..." 
                        className="pl-10 h-11 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/40" 
                        value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="px-3 pb-20 space-y-1">
                    {filteredConversations.map(conv => {
                        const other = getOtherParticipant(conv);
                        const isActive = activeConversation?.id === conv.id;
                        const isUnread = conv.lastMessage?.senderId !== currentUser?.id && conv.lastMessage?.isRead === false;
                        const isOnline = other ? userStatuses[other.id] === 'online' : false;
                        const date = parseSafeDate(conv.updatedAt);

                        return (
                            <div 
                                key={conv.id} 
                                onClick={() => handleSelectConversation(conv)}
                                className={cn(
                                    "flex items-center gap-4 p-4 cursor-pointer rounded-[2rem] transition-all group relative transform-gpu active:scale-[0.98]",
                                    isActive ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'hover:bg-muted/50'
                                )}
                            >
                                <div className="relative">
                                    <Avatar className="h-14 w-14 border-2 border-background shadow-md">
                                        <AvatarImage src={other?.avatarUrl} />
                                        <AvatarFallback className="bg-muted text-primary font-bold">{other?.username.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                                    </Avatar>
                                    {isOnline && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm animate-pulse" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className="font-black text-sm truncate">@{other?.username || 'user'}</h3>
                                        <span className={cn("text-[9px] font-bold uppercase tracking-tighter opacity-60", isActive ? "text-white/80" : "text-muted-foreground")}>
                                            {date ? formatDistanceToNow(date, { addSuffix: false }) : ''}
                                        </span>
                                    </div>
                                    <p className={cn("text-xs truncate", isActive ? "text-white/70" : "text-muted-foreground", isUnread && "font-black text-foreground")}>
                                        {conv.lastMessage?.content || 'Started a conversation'}
                                    </p>
                                </div>
                                {isUnread && !isActive && (
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"></div>
                                )}
                            </div>
                        );
                    })}
                    {filteredConversations.length === 0 && !isLoadingConversations && (
                        <div className="text-center py-10 opacity-30 italic text-xs">No active threads.</div>
                    )}
                </div>
            </ScrollArea>
        </aside>

        <main className={cn(
            "flex-1 flex flex-col bg-background h-full max-w-full overflow-hidden",
            mobileView === 'chat' ? 'flex' : 'hidden md:flex'
        )}>
            {activeConversation ? (
                <>
                    <header className="p-4 border-b bg-card/40 backdrop-blur-xl flex items-center justify-between gap-3 shadow-sm z-10">
                        <div className="flex items-center gap-3 min-w-0">
                            <Button variant="ghost" size="icon" className="md:hidden shrink-0" onClick={() => setMobileView('list')}>
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            {getOtherParticipant(activeConversation) && (
                                <Link href={`/profile/${getOtherParticipant(activeConversation)!.id}`} className="relative shrink-0">
                                    <Avatar className="h-10 w-10 border shadow-sm">
                                        <AvatarImage src={getOtherParticipant(activeConversation)!.avatarUrl} />
                                        <AvatarFallback className="font-bold">{getOtherParticipant(activeConversation)!.username.substring(0,2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {userStatuses[getOtherParticipant(activeConversation)!.id] === 'online' && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                                    )}
                                </Link>
                            )}
                            <div className="truncate">
                                <h3 className="font-black text-sm md:text-base truncate">@{getOtherParticipant(activeConversation)?.username || 'user'}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary leading-none">
                                    {otherUserTyping ? "Writing..." : (userStatuses[getOtherParticipant(activeConversation)?.id || ''] === 'online' ? "Online" : "Away")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="rounded-full h-10 w-10"><Phone className="h-5 w-5" /></Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10"><MoreHorizontal className="h-5 w-5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl w-48">
                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2" onClick={() => handleDeleteConversation(activeConversation.id)}>
                                        <Trash2 className="h-4 w-4" /> Delete Thread
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    
                    <ScrollArea className="flex-1 p-6">
                        <div className="flex flex-col gap-1.5 pb-10">
                            {messages.map((msg, index) => {
                                const isMe = msg.senderId === currentUser?.id;
                                const isNextSame = messages[index + 1]?.senderId === msg.senderId;
                                const isPrevSame = messages[index - 1]?.senderId === msg.senderId;
                                return (
                                    <div key={msg.id} className={cn(
                                        "flex flex-col max-w-[85%] sm:max-w-[70%] group",
                                        isMe ? "self-end items-end" : "self-start items-start",
                                        !isNextSame && "mb-4"
                                    )}>
                                        <div className={cn(
                                            "p-4 text-sm shadow-sm transition-all transform-gpu hover:scale-[1.01]",
                                            isMe ? "bg-primary text-white rounded-[2rem] rounded-br-lg" : "bg-muted text-foreground rounded-[2rem] rounded-bl-lg",
                                            isPrevSame && (isMe ? "rounded-tr-[2rem]" : "rounded-tl-[2rem]"),
                                            isNextSame && (isMe ? "rounded-br-[2rem]" : "rounded-bl-[2rem]")
                                        )}>
                                            <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <footer className="p-4 border-t bg-card/40 backdrop-blur-xl">
                        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-3 w-full">
                            <div className="flex shrink-0 gap-1">
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary hover:bg-primary/10"><ImageIcon className="h-5 w-5" /></Button>
                                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary hover:bg-primary/10"><Mic className="h-5 w-5" /></Button>
                            </div>
                            <Input 
                                placeholder="Write a message..." 
                                className="flex-1 h-12 bg-background/50 border-none rounded-2xl shadow-inner px-5 focus-visible:ring-primary/40" 
                                value={newMessageContent} 
                                onChange={(e) => {
                                    setNewMessageContent(e.target.value);
                                    if (activeConversation && currentUser) {
                                        const r = ref(rtdb, `typing/${activeConversation.id}/${currentUser.id}`);
                                        if (e.target.value.trim()) set(r, true); else remove(r);
                                    }
                                }} 
                            />
                            <Button type="submit" disabled={isSendingMessage || !newMessageContent.trim()} className="rounded-full h-12 w-12 bg-primary shadow-xl shadow-primary/30 shrink-0 transform-gpu active:scale-90">
                                {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </Button>
                        </form>
                    </footer>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-20">
                    <MessageSquare className="h-32 w-32 mb-8" />
                    <h2 className="text-3xl font-headline font-bold">Select a thread</h2>
                </div>
            )}
        </main>

        <Dialog open={isNewConversationDialogOpen} onOpenChange={setIsNewConversationDialogOpen}>
            <DialogContent className="rounded-[3rem] border-none shadow-3xl bg-background/95 backdrop-blur-3xl p-8 max-w-md">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-headline font-bold">New Thread</DialogTitle>
                    <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-60">Send a direct message</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Enter handle..." 
                            value={searchUsername} 
                            onChange={e => setSearchUsername(e.target.value)} 
                            className="pl-12 h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-lg"
                        />
                    </div>
                    <ScrollArea className="h-60 border-t border-border/20 pt-4">
                        <div className="space-y-2">
                            {searchedUsers.map(u => (
                                <div key={u.id} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-all text-left cursor-pointer" onClick={() => handleStartNewConversation(u)}>
                                    <Avatar className="border shadow-sm"><AvatarImage src={u.avatarUrl} /></Avatar>
                                    <span className="font-black text-sm">@{u.username}</span>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}

export default function UnifiedInboxPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'messages'; 

    if (loading) return <div className="flex flex-col justify-center items-center min-h-screen gap-4"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-sm uppercase tracking-widest animate-pulse opacity-40">Updating inbox...</p></div>;
    if (!user) { router.push('/auth/signin'); return null; }

    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
            <Header />
            <div className="max-w-7xl mx-auto space-y-10 pt-10 pb-32">
                <Tabs defaultValue={defaultTab} className="w-full">
                    <div className="flex justify-center mb-10 px-4">
                        <TabsList className="h-12 bg-muted/50 rounded-full p-1 border border-border/40 shadow-sm backdrop-blur-md w-full max-w-sm">
                            <TabsTrigger value="messages" className="rounded-full font-black uppercase text-[10px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                                <MessageSquare className="h-4 w-4" /> Threads
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="rounded-full font-black uppercase text-[10px] tracking-widest flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md transition-all">
                                <Bell className="h-4 w-4" /> Activity
                            </TabsTrigger>
                        </TabsList>
                    </div>
                    <TabsContent value="notifications" className="animate-in fade-in duration-700"><NotificationsList /></TabsContent>
                    <TabsContent value="messages" className="animate-in fade-in duration-700 px-4 sm:px-0"><MessagesClient /></TabsContent>
                </Tabs>
            </div>
            <BottomNavigationBar />
        </Suspense>
    );
}
