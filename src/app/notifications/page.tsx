'use client';

import { useState, useEffect, useCallback, useRef, useTransition, useMemo, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';
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
  Plus, 
  MoreHorizontal, 
  Trash2, 
  User, 
  ImageIcon, 
  Mic, 
  Send,
  Pin,
  PinOff,
  BellOff,
  Archive,
  Volume2,
  VolumeX,
  X,
  Palette,
  Edit3,
  Repeat,
  Quote,
  ShieldAlert,
  Reply,
  Forward,
  Clock,
  Music,
  Disc,
  Link as LinkIcon,
  Timer
} from 'lucide-react';
import { formatDistanceToNow, isToday, isThisWeek, format, isYesterday } from 'date-fns';
import type { NotificationType, Conversation, Message, UserSummary, User as AppUserType, Song } from '@/types';
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
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
import { useDynamicIsland } from '@/context/DynamicIslandContext';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import SpotifyPlayer from '@/components/shared/SpotifyPlayer';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { toggleArchiveThread, toggleIgnoreThread, togglePinThread, setThreadNickname, unsendMessage, deleteMessageForMe, editSentMessage } from '@/app/actions/threadActions';

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

const formatPreciseTimestamp = (timestamp: any) => {
    const date = parseSafeDate(timestamp);
    if (!date) return '';
    const now = new Date();
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday ' + format(date, 'h:mm a');
    if (isThisWeek(date)) return format(date, 'EEEE h:mm a');
    return format(date, 'MMM d, yyyy, h:mm a');
};

const CHAT_THEMES = [
    { name: 'Classic', color: 'hsl(var(--primary))' },
    { name: 'Rose', color: '#f43f5e' },
    { name: 'Emerald', color: '#10b981' },
    { name: 'Indigo', color: '#6366f1' },
    { name: 'Amber', color: '#f59e0b' },
    { name: 'Violet', color: '#8b5cf6' },
];

const REACTION_OPTIONS = ['❤️', '👍', '😂', '😮', '😢', '😡', '🔥', '✨'];

function NotificationsList() {
    const { user, notifications, markNotificationAsRead, markAllNotificationsAsRead } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');

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
                        placeholder="Search activity..." 
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
                                                    "p-4 rounded-2xl cursor-pointer transition-all duration-300 flex items-center gap-4 group relative",
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
                                                        <span className="font-black text-foreground">{notif.actor.displayName || `@${notif.actor.username}`}</span> {notif.message}
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
  const { showIsland } = useDynamicIsland();
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
  const [chatSearch, setChatSearch] = useState('');

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [userStatuses, setUserStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [onlineFriends, setOnlineFriends] = useState<UserSummary[]>([]);
  const [otherUserTyping, setOtherUserTyping] = useState<boolean>(false);
  
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'media'>('chat');
  const [mgmtMenuConv, setMgmtMenuConv] = useState<Conversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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
        
        if (currentUser) {
            const online: UserSummary[] = [];
            conversations.forEach(conv => {
                const other = conv.participantIds.find(id => id !== currentUser.id);
                if (other && statuses[other] === 'online') {
                    online.push(conv.participantInfo[other]);
                }
            });
            const uniqueOnline = Array.from(new Map(online.map(u => [u.id, u])).values());
            setOnlineFriends(uniqueOnline);
        }
    });
    return () => unsub();
  }, [currentUser, conversations]);

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
      async (error) => {
        setIsLoadingConversations(false);
      }
    );
  }, [currentUser]);

  useEffect(() => {
    if (!activeConversation?.id) { setMessages([]); return; }
    setIsLoadingMessages(true);
    const q = query(collection(db, 'conversations', activeConversation.id, 'messages'), orderBy('timestamp', 'asc'), limit(200));
    const unsub = onSnapshot(q, 
      (snapshot) => {
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(fetched.filter(m => !m.deletedFor?.includes(currentUser?.id || '')));
        setIsLoadingMessages(false);
      },
      async (error) => {
        setIsLoadingMessages(false);
      }
    );

    if (currentUser && activeConversation.lastMessage?.senderId !== currentUser.id && activeConversation.lastMessage?.isRead === false) {
        updateDoc(doc(db, 'conversations', activeConversation.id), { 'lastMessage.isRead': true }).catch(() => {});
    }

    return () => unsub();
  }, [activeConversation, currentUser]);

  const handleSelectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    setMobileView('chat');
    setViewMode('chat');
    setReplyingTo(null);
    setEditingMessage(null);
  };

  const uploadMedia = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset!);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
    const data = await res.json();
    return data.secure_url;
  };

  const handleSendMessage = async (contentInput?: string) => {
    const finalContent = contentInput || newMessageContent;
    if (!currentUser || !activeConversation || (!finalContent.trim() && !imageFile)) return;

    if (editingMessage) {
        setIsSendingMessage(true);
        const result = await editSentMessage(activeConversation.id, editingMessage.id, currentUser.id, finalContent.trim());
        if (result.success) {
            setNewMessageContent('');
            setEditingMessage(null);
        } else {
            toast({ title: "Edit failed", variant: "destructive" });
        }
        setIsSendingMessage(false);
        return;
    }

    setIsSendingMessage(true);
    let mediaUrl = '';
    if (imageFile) {
        setIsUploading(true);
        try { mediaUrl = await uploadMedia(imageFile); } catch (e) { toast({ title: "Upload failed" }); }
        finally { setIsUploading(false); }
    }

    const messageData: any = {
      senderId: currentUser.id,
      content: finalContent.trim(),
      timestamp: serverTimestamp(),
      type: mediaUrl ? 'image' : 'text',
      mediaUrl: mediaUrl || null,
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, username: activeConversation.participantInfo[replyingTo.senderId].username } : null,
      reactions: {},
      deletedFor: [],
      isPinned: false
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
          content: mediaUrl ? 'Sent a photo' : finalContent.trim(), 
          senderId: currentUser.id, 
          timestamp: serverTimestamp(), 
          isRead: false 
        },
        updatedAt: serverTimestamp(),
      });
      setNewMessageContent('');
      setImageFile(null);
      setReplyingTo(null);
    } catch (error: any) { 
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `conversations/${activeConversation.id}/messages`, operation: 'create', requestResourceData: messageData }));
    } finally { setIsSendingMessage(false); }
  };
  
  const handleReaction = async (messageId: string, emoji: string) => {
    if (!currentUser || !activeConversation) return;
    const messageRef = doc(db, 'conversations', activeConversation.id, 'messages', messageId);
    updateDoc(messageRef, { [`reactions.${currentUser.id}`]: emoji }).catch(() => {});
  };

  const handleTogglePinMessage = async (message: Message) => {
    if (!activeConversation) return;
    const messageRef = doc(db, 'conversations', activeConversation.id, 'messages', message.id);
    updateDoc(messageRef, { isPinned: !message.isPinned }).then(() => toast({ title: message.isPinned ? "Message unpinned" : "Message pinned" }));
  };

  const handleSetTheme = async (color: string) => {
    if (!activeConversation) return;
    updateDoc(doc(db, 'conversations', activeConversation.id), { themeColor: color })
        .then(() => toast({ title: "Theme updated" }));
  };

  const handleSetNickname = async (targetId: string, nickname: string) => {
    if (!activeConversation) return;
    const result = await setThreadNickname(activeConversation.id, targetId, nickname);
    if (result.success) toast({ title: "Nickname saved" });
    else toast({ title: "Update failed", variant: "destructive" });
  };

  const handleMute = async () => {
    if (!activeConversation || !currentUser) return;
    const isMuted = activeConversation.mutedBy?.includes(currentUser.id);
    const ref = doc(db, 'conversations', activeConversation.id);
    updateDoc(ref, { 
        mutedBy: isMuted ? arrayRemove(currentUser.id) : arrayUnion(currentUser.id) 
    }).then(() => toast({ title: isMuted ? "Alerts restored" : "Thread silenced" }));
  };

  const handleDeleteForMe = async (messageId: string) => {
      if (!activeConversation || !currentUser) return;
      const result = await deleteMessageForMe(activeConversation.id, messageId, currentUser.id);
      if (result.success) toast({ title: "Message removed for you" });
  };

  const handleUnsend = async (messageId: string) => {
      if (!activeConversation || !currentUser) return;
      const result = await unsendMessage(activeConversation.id, messageId, currentUser.id);
      if (result.success) toast({ title: "Message unsent" });
  };

  const handleForward = (content: string) => {
    setNewMessageContent(content);
    toast({ title: "Message copied to draft" });
  };

  const handleThreadLongPress = (conv: Conversation) => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    setMgmtMenuConv(conv);
  };

  const handleDeleteThread = async (convId: string) => {
    if (!currentUser) return;
    deleteDoc(doc(db, 'conversations', convId))
        .then(() => {
            if (activeConversation?.id === convId) {
                setActiveConversation(null);
                setMobileView('list');
            }
            showIsland({ title: "Thread Erased", type: 'success' });
            setMgmtMenuConv(null);
        })
        .catch(async (error) => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: `conversations/${convId}`, operation: 'delete' }));
        });
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
    } catch (error) {} finally { setIsSearchingUsers(false); }
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
        lastMessage: { id: '', content: 'Started a thread.', senderId: '', timestamp: serverTimestamp(), isRead: true },
        isGroup: false,
        themeColor: 'hsl(var(--primary))'
      };
      try {
        const newConv = await addDoc(collection(db, 'conversations'), newConvData);
        handleSelectConversation({ id: newConv.id, ...newConvData } as any);
      } catch (error) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'conversations', operation: 'create', requestResourceData: newConvData }));
      }
    }
    setIsNewConversationDialogOpen(false);
  };

  const filteredMessages = useMemo(() => {
    if (!chatSearch.trim()) return messages;
    const term = chatSearch.toLowerCase();
    return messages.filter(m => m.content.toLowerCase().includes(term));
  }, [messages, chatSearch]);

  const filteredConversations = useMemo(() => {
    if (!sidebarSearch.trim()) return conversations;
    const term = sidebarSearch.toLowerCase();
    return conversations.filter(conv => {
        const other = getOtherParticipant(conv);
        return other?.username.toLowerCase().includes(term) || other?.displayName?.toLowerCase().includes(term);
    });
  }, [conversations, sidebarSearch, currentUser]);

  const pinnedMessages = messages.filter(m => m.isPinned);
  const mediaMessages = messages.filter(m => m.type === 'image' || m.mediaUrl);

  return (
    <div className="flex h-[calc(100vh-14rem)] md:h-[800px] border-none sm:border rounded-none sm:rounded-[2rem] bg-card sm:shadow-3xl overflow-hidden mb-10 border-border/40 w-full max-w-7xl mx-auto transform-gpu">
        <aside className={cn(
            "w-full md:w-[360px] border-r flex flex-col bg-background/40 backdrop-blur-xl transition-all duration-300",
            mobileView === 'chat' ? 'hidden md:flex' : 'flex'
        )}>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-3xl font-headline font-bold tracking-tight">Threads</h2>
                    <Button variant="outline" size="icon" className="rounded-full shadow-sm" onClick={() => setIsNewConversationDialogOpen(true)}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Find threads..." 
                        className="pl-10 h-11 rounded-2xl bg-muted/30 border-none focus-visible:ring-primary/40" 
                        value={sidebarSearch}
                        onChange={(e) => setSidebarSearch(e.target.value)}
                    />
                </div>
                
                <div className="pt-2">
                    <ScrollArea className="w-full whitespace-nowrap scrollbar-hide">
                        <div className="flex gap-4 px-1 pb-2">
                            {currentUser && (
                                <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => router.push(`/profile/${currentUser.id}`)}>
                                    <div className="relative">
                                        <Avatar className="h-14 w-14 border-2 border-primary/20 p-0.5 group-hover:scale-105 transition-transform">
                                            <AvatarImage src={currentUser.avatarUrl} />
                                            <AvatarFallback className="font-bold">{currentUser.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-tighter opacity-60">My Status</span>
                                </div>
                            )}
                            {onlineFriends.map(friend => (
                                <div key={friend.id} className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={() => router.push(`/profile/${friend.id}`)}>
                                    <div className="relative">
                                        <Avatar className="h-14 w-14 border-2 border-background shadow-md group-hover:scale-105 transition-transform">
                                            <AvatarImage src={friend.avatarUrl} />
                                            <AvatarFallback className="font-bold">{friend.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm animate-pulse" />
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-tighter truncate w-14 text-center">@{friend.username}</span>
                                </div>
                            ))}
                        </div>
                        <ScrollBar orientation="horizontal" className="hidden" />
                    </ScrollArea>
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
                        const nickname = conv.nicknames?.[other?.id || ''];

                        return (
                            <div 
                                key={conv.id}
                                onClick={() => handleSelectConversation(conv)}
                                onPointerDown={(e) => {
                                    longPressTimerRef.current = setTimeout(() => {
                                        handleThreadLongPress(conv);
                                    }, 5000); // 5 SECOND HOLD FOR MGMT MENU
                                }}
                                onPointerUp={() => clearTimeout(longPressTimerRef.current!)}
                                onPointerLeave={() => clearTimeout(longPressTimerRef.current!)}
                                className={cn(
                                    "flex items-center gap-4 p-4 cursor-pointer rounded-2xl transition-all group relative transform-gpu active:scale-[0.98]",
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
                                        <h3 className="font-black text-sm truncate">{nickname ? nickname : `@${other?.username || 'user'}`}</h3>
                                        <span className={cn("text-[9px] font-bold uppercase tracking-tighter opacity-60", isActive ? "text-white/80" : "text-muted-foreground")}>
                                            {date ? formatDistanceToNow(date, { addSuffix: false }) : ''}
                                        </span>
                                    </div>
                                    <p className={cn("text-xs truncate", isActive ? "text-white/70" : "text-muted-foreground", isUnread && "font-black text-foreground")}>
                                        {conv.lastMessage?.content || 'Started a thread'}
                                    </p>
                                </div>
                                {isUnread && !isActive && (
                                    <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </aside>

        <main className={cn(
            "flex-1 flex flex-col bg-background h-full max-w-full overflow-hidden transition-all duration-500",
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
                                <h3 className="font-black text-sm md:text-base truncate">
                                    {activeConversation.nicknames?.[getOtherParticipant(activeConversation)?.id || ''] || `@${getOtherParticipant(activeConversation)?.username || 'user'}`}
                                </h3>
                                <p className="text-[9px] font-black uppercase tracking-widest text-primary leading-none">
                                    {otherUserTyping ? "Typing..." : (userStatuses[getOtherParticipant(activeConversation)?.id || ''] === 'online' ? "Online" : "Away")}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'chat' ? 'media' : 'chat')} className="rounded-full font-bold text-[10px] uppercase tracking-widest">
                                {viewMode === 'chat' ? 'Media' : 'Back to Chat'}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10"><MoreHorizontal className="h-5 w-5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-2xl w-56 border-none shadow-3xl p-2">
                                    <DropdownMenuItem onClick={() => router.push(`/profile/${getOtherParticipant(activeConversation)?.id}`)} className="gap-2 rounded-xl h-10 px-3 font-bold text-xs">
                                        <User className="h-4 w-4" /> View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => {
                                        const nick = prompt("Set nickname for other user:");
                                        if (nick !== null) handleSetNickname(activeConversation.id, getOtherParticipant(activeConversation)?.id || '', nick);
                                    }} className="gap-2 rounded-xl h-10 px-3 font-bold text-xs">
                                        <Edit3 className="h-4 w-4" /> Edit Nicknames
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleMute} className="gap-2 rounded-xl h-10 px-3 font-bold text-xs">
                                        <BellOff className="h-4 w-4" /> {activeConversation.mutedBy?.includes(currentUser?.id || '') ? 'Unmute' : 'Mute Alerts'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/10 mx-2" />
                                    <DropdownMenuItem onSelect={e => e.preventDefault()} className="rounded-xl px-3 py-2">
                                        <div className="flex flex-col gap-2 w-full">
                                            <p className="text-[9px] font-black uppercase opacity-60">Chat Theme</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {CHAT_THEMES.map(t => (
                                                    <button key={t.name} onClick={() => handleSetTheme(t.color)} className="h-5 w-5 rounded-full border border-white/20 hover:scale-110 transition-transform" style={{ background: t.color }} title={t.name} />
                                                ))}
                                            </div>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-border/10 mx-2" />
                                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 rounded-xl h-10 px-3 font-bold text-xs" onClick={() => {
                                        if(confirm("Erase thread archive?")) {
                                            handleDeleteThread(activeConversation.id);
                                        }
                                    }}>
                                        <Trash2 className="h-4 w-4" /> Delete Thread
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    
                    {viewMode === 'chat' ? (
                        <>
                            <ScrollArea className="flex-1 p-6">
                                <div className="flex flex-col gap-1.5 pb-10">
                                    {pinnedMessages.length > 0 && (
                                        <div className="mb-6 p-3 bg-primary/5 border border-primary/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-primary mb-2 flex items-center gap-1.5"><Pin className="h-3 w-3 fill-current" /> Pinned Messages</p>
                                            <div className="space-y-2">
                                                {pinnedMessages.map(m => (
                                                    <div key={m.id} className="text-xs truncate italic text-muted-foreground bg-background/50 p-2 rounded-xl">"{m.content}"</div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {filteredMessages.map((msg, index) => {
                                        const isMe = msg.senderId === currentUser?.id;
                                        const isNextSame = messages[index + 1]?.senderId === msg.senderId;
                                        const date = parseSafeDate(msg.timestamp);
                                        const showDateHeader = index === 0 || (date && parseSafeDate(messages[index-1]?.timestamp) && date.getTime() - parseSafeDate(messages[index-1].timestamp)!.getTime() > 30 * 60 * 1000);

                                        return (
                                            <div key={msg.id} className={cn(
                                                "flex flex-col max-w-[85%] sm:max-w-[70%] group animate-in slide-in-from-bottom-2 duration-300",
                                                isMe ? "self-end items-end" : "self-start items-start",
                                                !isNextSame && "mb-4"
                                            )}>
                                                {showDateHeader && date && (
                                                    <div className="self-center my-6 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">{formatPreciseTimestamp(msg.timestamp)}</div>
                                                )}
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <div className={cn(
                                                            "p-4 text-sm shadow-sm transition-all transform-gpu hover:scale-[1.01] relative cursor-pointer",
                                                            isMe ? "text-white rounded-2xl rounded-br-lg" : "bg-muted text-foreground rounded-2xl rounded-bl-lg",
                                                            msg.isUnsent && "italic opacity-60 bg-muted/40 text-muted-foreground"
                                                        )} style={{ backgroundColor: (!isMe || msg.isUnsent) ? undefined : (activeConversation.themeColor || 'hsl(var(--primary))') }}>
                                                            {msg.replyTo && (
                                                                <div className="bg-black/20 p-2 px-3 rounded-xl text-[10px] mb-2 border border-white/10 italic truncate">
                                                                    <Quote className="h-2 w-2 inline mr-1" />
                                                                    {msg.replyTo.content}
                                                                </div>
                                                            )}
                                                            {msg.type === 'image' && msg.mediaUrl && (
                                                                <div className="relative w-48 h-48 rounded-2xl overflow-hidden mb-2 shadow-lg border border-white/10">
                                                                    <NextImage src={msg.mediaUrl} alt="Visual" fill className="object-cover" />
                                                                </div>
                                                            )}
                                                            <p className="whitespace-pre-line leading-relaxed">{msg.isUnsent ? 'Message unsent' : msg.content}</p>
                                                            {!msg.isUnsent && (
                                                                <div className="flex items-center justify-between gap-4 mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                                                                    <span className="text-[8px] font-black uppercase tracking-widest">{date ? format(date, 'h:mm a') : '...'}</span>
                                                                    {msg.isEdited && <span className="text-[8px] font-black uppercase tracking-widest italic">Edited</span>}
                                                                    {msg.isPinned && <Pin className="h-2.5 w-2.5 fill-current" />}
                                                                </div>
                                                            )}
                                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                                <div className="absolute -bottom-2 right-0 flex gap-0.5 bg-background border border-border/40 rounded-full px-1.5 py-0.5 shadow-xl scale-90">
                                                                    {Array.from(new Set(Object.values(msg.reactions))).map((e, i) => <span key={i} className="text-xs">{e}</span>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="rounded-2xl border-none shadow-3xl p-1 bg-background/95 backdrop-blur-3xl">
                                                        <div className="flex gap-1 p-2 border-b border-white/5">
                                                            {REACTION_OPTIONS.map(e => (
                                                                <button key={e} onClick={() => handleReaction(msg.id, e)} className="h-9 w-9 hover:scale-125 transition-transform flex items-center justify-center text-xl">{e}</button>
                                                            ))}
                                                        </div>
                                                        <DropdownMenuItem onClick={() => setReplyingTo(msg)} className="gap-2 rounded-xl">
                                                            <Reply className="h-4 w-4" /> Reply
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleForward(msg.content)} className="gap-2 rounded-xl">
                                                            <Forward className="h-4 w-4" /> Forward
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleTogglePinMessage(msg)} className="gap-2 rounded-xl">
                                                            <Pin className="h-4 w-4" /> {msg.isPinned ? 'Unpin' : 'Pin'}
                                                        </DropdownMenuItem>
                                                        {isMe && !msg.isUnsent && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => { setEditingMessage(msg); setNewMessageContent(msg.content); }} className="gap-2 rounded-xl">
                                                                    <Edit3 className="h-4 w-4" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => handleUnsend(msg.id)} className="gap-2 rounded-xl text-destructive">
                                                                    <X className="h-4 w-4" /> Unsend
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                        <DropdownMenuItem onClick={() => handleDeleteForMe(msg.id)} className="gap-2 rounded-xl text-destructive">
                                                            <Trash2 className="h-4 w-4" /> Remove for me
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            <footer className="p-4 border-t bg-card/40 backdrop-blur-xl relative transform-gpu">
                                {replyingTo && (
                                    <div className="absolute bottom-full left-0 right-0 bg-muted/90 backdrop-blur-xl p-3 px-6 flex items-center justify-between border-t animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="truncate">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">Replying to @{activeConversation.participantInfo[replyingTo.senderId].username}</p>
                                            <p className="text-xs text-muted-foreground truncate italic">"{replyingTo.content}"</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/10" onClick={() => setReplyingTo(null)}><X className="h-3 w-3"/></Button>
                                    </div>
                                )}
                                {editingMessage && (
                                     <div className="absolute bottom-full left-0 right-0 bg-primary/10 backdrop-blur-xl p-3 px-6 flex items-center justify-between border-t animate-in slide-in-from-bottom-2 duration-300">
                                        <div className="truncate">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">Editing Message</p>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-white/10" onClick={() => { setEditingMessage(null); setNewMessageContent(''); }}><X className="h-3 w-3"/></Button>
                                    </div>
                                )}
                                
                                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-3 w-full">
                                    <div className="flex shrink-0 gap-1">
                                        <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full text-primary hover:bg-primary/10" onClick={() => mediaInputRef.current?.click()} disabled={isSendingMessage}><ImageIcon className="h-5 w-5" /></Button>
                                        <input type="file" ref={mediaInputRef} className="hidden" accept="image/*" onChange={e => { if(e.target.files?.[0]) setImageFile(e.target.files[0]); }} />
                                    </div>
                                    
                                    <div className="flex-1 relative group">
                                        {imageFile && (
                                            <div className="absolute bottom-full mb-3 left-0 p-2 bg-background border border-border/40 rounded-2xl shadow-3xl flex items-center gap-2 animate-in zoom-in-95">
                                                <div className="relative w-14 h-14 rounded-xl overflow-hidden"><NextImage src={URL.createObjectURL(imageFile)} alt="Preview" fill className="object-cover"/></div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full bg-muted/40" onClick={() => setImageFile(null)}><X className="h-3 w-3"/></Button>
                                            </div>
                                        )}
                                        <Input 
                                            placeholder={editingMessage ? "Save edit..." : "Archive your thought..."} 
                                            className="h-12 bg-background/50 border-none rounded-2xl shadow-inner px-5 focus-visible:ring-primary/40 text-sm" 
                                            value={newMessageContent} 
                                            onChange={(e) => {
                                                setNewMessageContent(e.target.value);
                                                if (activeConversation && currentUser) {
                                                    const r = ref(rtdb, `typing/${activeConversation.id}/${currentUser.id}`);
                                                    if (e.target.value.trim()) set(r, true); else remove(r);
                                                }
                                            }} 
                                        />
                                    </div>
                                    
                                    <Button type="submit" disabled={isSendingMessage || (!newMessageContent.trim() && !imageFile)} className="rounded-full h-12 w-12 bg-primary shadow-xl shadow-primary/30 shrink-0 transform-gpu active:scale-90" style={{ background: activeConversation.themeColor }}>
                                        {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                    </Button>
                                </form>
                            </footer>
                        </>
                    ) : (
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-8 pb-20">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Visual Gallery</h4>
                                    <div className="grid grid-cols-3 gap-2">
                                        {mediaMessages.map(m => (
                                            <div key={m.id} className="relative aspect-square rounded-xl overflow-hidden border border-border/40 bg-muted">
                                                <NextImage src={m.mediaUrl!} alt="Archive" fill className="object-cover" />
                                            </div>
                                        ))}
                                        {mediaMessages.length === 0 && <p className="col-span-3 text-center py-10 text-xs italic text-muted-foreground">No visuals archived yet.</p>}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-2">Archived Songs</h4>
                                    <div className="grid gap-2">
                                        {messages.filter(m => m.songUrl).map(m => (
                                            <div key={m.id} className="rounded-xl border border-border/40 p-2 bg-muted/20">
                                                <SpotifyPlayer trackUrl={m.songUrl} />
                                            </div>
                                        ))}
                                        {messages.filter(m => m.songUrl).length === 0 && <p className="text-center py-10 text-xs italic text-muted-foreground">No tracks shared.</p>}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    )}
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-20 transform-gpu animate-in fade-in duration-1000">
                    <MessageSquare className="h-40 w-40 mb-10 text-primary/40" />
                    <h2 className="text-3xl font-headline font-bold uppercase tracking-widest text-center">Select a Discussion Thread</h2>
                </div>
            )}
        </main>

        {/* THREAD MGMT POP-UP (5S HOLD GATEWAY) */}
        <Dialog open={!!mgmtMenuConv} onOpenChange={(o) => !o && setMgmtMenuConv(null)}>
            <DialogContent className="rounded-[2.5rem] max-w-xs p-0 overflow-hidden border-none shadow-3xl bg-background/95 backdrop-blur-3xl animate-in zoom-in-95 duration-300">
                <DialogHeader className="p-6 bg-muted/30 border-b">
                    <DialogTitle className="text-xl font-headline font-bold">Management Hub</DialogTitle>
                </DialogHeader>
                <div className="p-2 space-y-1">
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-2xl h-12 gap-3 font-bold text-xs uppercase tracking-widest" 
                        onClick={() => {
                            if (!mgmtMenuConv || !currentUser) return;
                            togglePinThread(mgmtMenuConv.id, currentUser.id, !mgmtMenuConv.pinnedBy?.includes(currentUser.id));
                            setMgmtMenuConv(null);
                        }}
                    >
                        <Pin className="h-4 w-4 text-primary" />
                        {mgmtMenuConv?.pinnedBy?.includes(currentUser?.id || '') ? 'Unpin Signal' : 'Pin to Top'}
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-2xl h-12 gap-3 font-bold text-xs uppercase tracking-widest" 
                        onClick={() => {
                            if (!mgmtMenuConv || !currentUser) return;
                            toggleArchiveThread(mgmtMenuConv.id, currentUser.id, true);
                            setMgmtMenuConv(null);
                        }}
                    >
                        <Archive className="h-4 w-4 text-accent" />
                        Archive Discussion
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-2xl h-12 gap-3 font-bold text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive" 
                        onClick={() => {
                            if (!mgmtMenuConv || !currentUser) return;
                            toggleIgnoreThread(mgmtMenuConv.id, currentUser.id, true);
                            setMgmtMenuConv(null);
                        }}
                    >
                        <BellOff className="h-4 w-4" />
                        Ignore Signal
                    </Button>
                    <DropdownMenuSeparator className="bg-border/10 mx-2" />
                    <Button 
                        variant="ghost" 
                        className="w-full justify-start rounded-2xl h-12 gap-3 font-bold text-xs uppercase tracking-widest text-destructive hover:bg-destructive/10 hover:text-destructive" 
                        onClick={() => {
                            if (!mgmtMenuConv) return;
                            if (confirm("Erase thread archive?")) handleDeleteThread(mgmtMenuConv.id);
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                        Erase Thread
                    </Button>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={isNewConversationDialogOpen} onOpenChange={setIsNewConversationDialogOpen}>
            <DialogContent className="rounded-3xl border-none shadow-3xl bg-background/95 backdrop-blur-3xl p-8 max-w-md">
                <DialogHeader className="mb-6">
                    <DialogTitle className="text-3xl font-headline font-bold">New Thread</DialogTitle>
                    <DialogDescription className="text-xs font-black uppercase tracking-widest opacity-60">Signal a fellow creator</DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Enter handle..." 
                            value={searchUsername} 
                            onChange={e => setSearchUsername(e.target.value)} 
                            className="pl-12 h-14 rounded-2xl bg-muted/20 border-none shadow-inner text-lg font-bold"
                            autoFocus
                        />
                    </div>
                    <ScrollArea className="h-72 border-t border-border/10 pt-4">
                        <div className="space-y-1">
                            {searchedUsers.map(u => (
                                <div key={u.id} className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-all text-left cursor-pointer group" onClick={() => handleStartNewConversation(u)}>
                                    <Avatar className="border-2 border-background shadow-sm group-hover:scale-105 transition-transform"><AvatarImage src={u.avatarUrl} /></Avatar>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-bold text-sm block">@{u.username}</span>
                                        <span className="text-[10px] uppercase font-black opacity-40">{u.displayName}</span>
                                    </div>
                                    <Plus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
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

    if (loading) return <div className="flex flex-col justify-center items-center min-h-screen gap-4 transform-gpu"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="font-black text-sm uppercase tracking-widest animate-pulse opacity-40">Syncing Communications...</p></div>;
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
                    <TabsContent value="notifications" className="animate-in fade-in duration-1000 transform-gpu"><NotificationsList /></TabsContent>
                    <TabsContent value="messages" className="animate-in fade-in duration-1000 px-4 sm:px-0 transform-gpu"><MessagesClient /></TabsContent>
                </Tabs>
            </div>
            <BottomNavigationBar />
        </Suspense>
    );
}