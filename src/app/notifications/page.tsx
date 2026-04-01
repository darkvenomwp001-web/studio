
'use client';

import { useState, useEffect, useCallback, useRef, useTransition, useMemo, ChangeEvent } from 'react';
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
  Info, 
  Smile, 
  Send,
  Trash2,
  User,
  Image as ImageIcon,
  Mic,
  FileUp,
  MoreVertical,
  Link2 as LinkIcon,
  Repeat,
  Check,
  PhoneOff,
  VideoOff,
  Volume2,
  BellOff,
  SearchCode,
  Square,
  FileText,
  X,
  Play,
  Pause,
  Music,
  AppWindow,
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
  Timestamp,
  limit,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc
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
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';
import { getConversationStarters } from '@/app/actions/aiActions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import StatusFeature from '@/components/status/StatusFeature';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import Image from 'next/image';

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

// Robust date parser for Firestore Timestamps, Strings, or Date objects
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

    // Real-time Status Sync from RTDB for Actors
    useEffect(() => {
        const statusRef = ref(rtdb, 'status');
        const unsubscribe = onValue(statusRef, (snapshot) => {
            const data = snapshot.val() || {};
            const statuses: Record<string, 'online' | 'offline'> = {};
            Object.keys(data).forEach(uid => {
                statuses[uid] = data[uid].state;
            });
            setUserStatuses(statuses);
        });
        return () => unsubscribe();
    }, []);

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
            case 'new_follower': return <UserPlus className="h-4 w-4 text-blue-500" />;
            case 'new_chapter':
            case 'story_update': return <BookOpenText className="h-4 w-4 text-green-500" />;
            case 'comment_reply':
            case 'mention': return <MessageSquare className="h-4 w-4 text-purple-500" />; 
            case 'new_letter': return <Mail className="h-4 w-4 text-cyan-500" />;
            case 'letter_response': return <MailCheck className="h-4 w-4 text-teal-500" />;
            case 'achievement_unlocked': return <Bell className="h-4 w-4 text-yellow-500" />;
            case 'announcement': return <Bell className="h-4 w-4 text-orange-500" />;
            case 'app_update': return <MessageSquare className="h-4 w-4 text-primary" />; // Thread icon for app updates
            case 'user_update': return <User className="h-4 w-4 text-blue-400" />;
            case 'notice_update': return <AlertCircle className="h-4 w-4 text-orange-400" />;
            default: return <Bell className="h-4 w-4 text-muted-foreground" />;
        }
    };
    
    const filteredNotifications = useMemo(() => {
        if (!searchTerm.trim()) return notifications;
        const term = searchTerm.toLowerCase();
        return notifications.filter(n => 
            n.message.toLowerCase().includes(term) || 
            n.actor.username.toLowerCase().includes(term) ||
            n.actor.displayName?.toLowerCase().includes(term)
        );
    }, [notifications, searchTerm]);

    const groupedNotifications = useMemo(() => {
        const groups: { [key: string]: NotificationType[] } = {
            Today: [],
            "This Week": [],
            "Earlier": [],
        };

        filteredNotifications.forEach(notif => {
            const date = parseSafeDate(notif.timestamp);
            if (!date) return;
            
            if (isToday(date)) {
                groups.Today.push(notif);
            } else if (isThisWeek(date)) {
                groups["This Week"].push(notif);
            } else {
                groups.Earlier.push(notif);
            }
        });

        return groups;
    }, [filteredNotifications]);

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
            <CardHeader className="flex flex-col gap-4 px-4 pt-4 pb-6 md:px-6">
                <div className="flex flex-row justify-between items-center">
                    <CardTitle className="text-2xl font-headline font-bold">Activity</CardTitle>
                    {notifications.some(n => !n.isRead) && (
                        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={authLoading} className="text-primary hover:text-primary/80 font-bold uppercase tracking-wider text-[10px]">
                            Mark all as read
                        </Button>
                    )}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search your history..." 
                        className="pl-10 bg-muted/50 border-none h-10 rounded-full focus-visible:ring-primary/30" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredNotifications.length > 0 ? (
                    <div className="space-y-8 pb-20">
                        {Object.entries(groupedNotifications).map(([group, notifs]) => 
                         notifs.length > 0 && (
                            <div key={group}>
                                <h3 className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground/60 px-4 md:px-6 mb-3 flex items-center gap-2">
                                    <span className="flex-shrink-0">{group}</span>
                                    <div className="h-px w-full bg-border/40" />
                                </h3>
                                <div className="space-y-1">
                                    {notifs.map((notif) => {
                                        const displayDate = parseSafeDate(notif.timestamp);
                                        const isOnline = userStatuses[notif.actor.id] === 'online';
                                        return (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={cn(
                                                    "p-4 mx-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center gap-4 group relative",
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
                                                {isOnline && (
                                                    <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background shadow-sm animate-pulse" title="Active now" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm leading-snug text-foreground/90">
                                                    <span className="font-bold text-foreground hover:underline" onClick={(e) => { e.stopPropagation(); router.push(`/profile/${notif.actor.id}`); }}>
                                                        {notif.actor.displayName || `@${notif.actor.username}`}
                                                    </span> {notif.message.replace(`${notif.actor.displayName || notif.actor.username}`, '').trim()}
                                                </p>
                                                <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-tighter mt-1">
                                                {displayDate ? formatDistanceToNow(displayDate, { addSuffix: true }) : 'A while ago'}
                                                </p>
                                            </div>
                                            {!notif.isRead && (
                                                <div className="flex-shrink-0 self-center ml-auto">
                                                    <div className="w-2.5 h-2.5 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" title="Unread"></div>
                                                </div>
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
                    <div className="text-center py-24 text-muted-foreground space-y-4">
                        <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="font-headline text-lg font-bold text-foreground">
                            {searchTerm ? 'No results found' : 'All caught up!'}
                        </h3>
                        <p className="text-sm max-w-[200px] mx-auto">
                            {searchTerm ? `Try searching for something else.` : 'No new activity to show right now. Go explore some stories!'}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function MessagesClient() {
  const { user: currentUser, loading: authLoading } = useAuth();
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
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [isQueryHandled, setIsQueryHandled] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  const [isGeneratingStarters, startStarterTransition] = useTransition();
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);

  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [userStatuses, setUserStatuses] = useState<Record<string, 'online' | 'offline'>>({});
  const [otherUserTyping, setOtherUserTyping] = useState<boolean>(false);

  const [isDeletingThread, setIsDeletingThread] = useState(false);

  // Attachment states
  const [pendingMedia, setPendingMedia] = useState<File | null>(null);
  const [pendingMediaPreview, setPendingMediaPreview] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherUserTyping]);

  // Real-time Status Sync from RTDB
  useEffect(() => {
    const statusRef = ref(rtdb, 'status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
        const data = snapshot.val() || {};
        const statuses: Record<string, 'online' | 'offline'> = {};
        Object.keys(data).forEach(uid => {
            statuses[uid] = data[uid].state;
        });
        setUserStatuses(statuses);
    });
    return () => unsubscribe();
  }, []);

  // Listen for other person typing
  useEffect(() => {
    if (!activeConversation || !currentUser) return;
    const otherId = activeConversation.participantIds.find(id => id !== currentUser.id);
    if (!otherId) return;

    const typingRef = ref(rtdb, `typing/${activeConversation.id}/${otherId}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
        setOtherUserTyping(!!snapshot.val());
    });
    return () => {
        unsubscribe();
        setOtherUserTyping(false);
    }
  }, [activeConversation, currentUser]);

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
      limit(100) 
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

  const uploadFileToCloudinary = async (file: File | Blob, resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) throw new Error("Cloudinary not configured");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType === 'auto' ? 'video' : resourceType}/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || "Upload failed");
  };

  const handleSendMessage = async (contentInput?: string) => {
    const finalContent = contentInput || newMessageContent;
    const hasAttachments = pendingMedia || pendingFile || audioBlob;
    
    if (!currentUser || !activeConversation || (!finalContent.trim() && !hasAttachments)) return;

    setIsSendingMessage(true);
    let mediaUrl = '';
    let type: Message['type'] = 'text';
    let fileName = '';

    try {
        if (pendingMedia) {
            const isVideo = pendingMedia.type.startsWith('video/');
            mediaUrl = await uploadFileToCloudinary(pendingMedia, isVideo ? 'video' : 'image');
            type = isVideo ? 'video' : 'image';
        } else if (pendingFile) {
            mediaUrl = await uploadFileToCloudinary(pendingFile, 'auto');
            type = 'file';
            fileName = pendingFile.name;
        } else if (audioBlob) {
            mediaUrl = await uploadFileToCloudinary(audioBlob, 'video');
            type = 'audio';
        }

        // Build data object dynamically to avoid 'undefined' values
        const messageData: any = {
            senderId: currentUser.id,
            content: finalContent.trim(),
            timestamp: serverTimestamp(),
            type,
        };

        if (mediaUrl) messageData.mediaUrl = mediaUrl;
        if (fileName) messageData.fileName = fileName;

        // Clean up typing status immediately
        const typingRef = ref(rtdb, `typing/${activeConversation.id}/${currentUser.id}`);
        remove(typingRef);

        const messageRef = await addDoc(collection(db, 'conversations', activeConversation.id, 'messages'), messageData);
        await updateDoc(doc(db, 'conversations', activeConversation.id), {
            lastMessage: {
                id: messageRef.id,
                content: type === 'text' ? messageData.content : `Sent a ${type}`,
                senderId: currentUser.id,
                timestamp: serverTimestamp(), 
                isRead: false
            },
            updatedAt: serverTimestamp(),
        });

        setNewMessageContent('');
        setPendingMedia(null);
        setPendingMediaPreview(null);
        setPendingFile(null);
        setAudioBlob(null);
        setAudioURL(null);
    } catch (error) {
        console.error("Failed to send message:", error);
        toast({ title: "Send Failed", description: "Could not upload attachments or send message.", variant: "destructive" });
    } finally {
        setIsSendingMessage(false);
    }
  };
  
  const getOtherParticipant = (conversation: Conversation): AppUserType | undefined => {
    if (!currentUser || !conversation.participantIds || !conversation.participantInfo) return undefined;
    const otherId = conversation.participantIds.find(id => id !== currentUser.id);
    return otherId ? (conversation.participantInfo[otherId] as unknown as AppUserType) : undefined;
  };

  const performUserSearch = async (searchTerm: string) => {
    if (!searchTerm.trim() || !currentUser) {
      setSearchedUsers([]);
      setIsSearchingUsers(false);
      return;
    }
    setIsSearchingUsers(true);
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
      const q = query(
        collection(db, 'conversations'),
        where('participantIds', 'array-contains', currentUser.id)
      );
      const snap = await getDocs(q);
      const existingConvDoc = snap.docs.find(d => {
          const data = d.data();
          return data.participantIds.includes(targetUser.id) && !data.isGroup;
      });

      if (existingConvDoc) {
        handleSelectConversation({ id: existingConvDoc.id, ...existingConvDoc.data() } as Conversation);
        setIsNewConversationDialogOpen(false);
        setSearchUsername(''); 
        setSearchedUsers([]);
      } else {
        const currentUserSummary: UserSummary = {
            id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName || currentUser.username, avatarUrl: currentUser.avatarUrl,
        };
        const newConversationData: Omit<Conversation, 'id'> = {
          participantIds: [currentUser.id, targetUser.id].sort(),
          participantInfo: { [currentUser.id]: currentUserSummary, [targetUser.id]: targetUser },
          updatedAt: serverTimestamp(),
          lastMessage: { id: '', content: 'Conversation started.', senderId: '', timestamp: serverTimestamp() },
          isGroup: false,
        };
        
        const convRef = await addDoc(collection(db, 'conversations'), newConversationData);
        handleSelectConversation({ id: convRef.id, ...newConversationData } as Conversation);
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

  const handleInputChange = (val: string) => {
    setNewMessageContent(val);
    if (!activeConversation || !currentUser) return;
    
    const typingRef = ref(rtdb, `typing/${activeConversation.id}/${currentUser.id}`);
    if (val.trim().length > 0) {
        set(typingRef, true);
    } else {
        remove(typingRef);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    handleInputChange(newMessageContent + emojiData.emoji);
  };

  const handleDeleteConversation = async () => {
    if (!activeConversation || !currentUser) return;
    setIsDeletingThread(true);
    const convRef = doc(db, 'conversations', activeConversation.id);
    
    deleteDoc(convRef)
        .then(() => {
            toast({ title: "Conversation deleted" });
            setActiveConversation(null);
            setMobileView('list');
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: convRef.path,
                operation: 'delete',
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsDeletingThread(false);
        });
  };

  const handleGallerySelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setPendingMedia(file);
        setPendingMediaPreview(URL.createObjectURL(file));
        setPendingFile(null);
        setAudioBlob(null);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setPendingFile(file);
        setPendingMedia(null);
        setPendingMediaPreview(null);
        setAudioBlob(null);
    }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            setAudioBlob(blob);
            setAudioURL(URL.createObjectURL(blob));
            stream.getTracks().forEach(track => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
            setRecordingDuration(d => d + 1);
        }, 1000);
        setPendingMedia(null);
        setPendingFile(null);
    } catch (err) {
        toast({ title: "Microphone Access Denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
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

    const filteredConversations = useMemo(() => {
        if (!sidebarSearch.trim()) return conversations;
        const term = sidebarSearch.toLowerCase();
        return conversations.filter(conv => {
            const other = getOtherParticipant(conv);
            return other?.username?.toLowerCase().includes(term) || other?.displayName?.toLowerCase().includes(term);
        });
    }, [conversations, sidebarSearch]);

    const renderMessageStatus = (msg: Message, isLast: boolean) => {
        if (msg.senderId !== currentUser?.id || !isLast) return null;
        return <div className="text-[10px] text-muted-foreground/60 mt-1 self-end mr-1 flex items-center gap-1 animate-in fade-in duration-500">Sent <CheckCheck className="h-2.5 w-2.5 text-primary" /></div>;
    };

    const renderMessageContent = (msg: Message) => {
        switch (msg.type) {
            case 'image':
                return (
                    <div className="space-y-2">
                        {msg.mediaUrl && (
                            <div className="relative aspect-square w-full max-w-[300px] rounded-xl overflow-hidden shadow-sm bg-muted">
                                <Image src={msg.mediaUrl} alt="Shared photo" layout="fill" objectFit="cover" />
                            </div>
                        )}
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                    </div>
                );
            case 'video':
                return (
                    <div className="space-y-2">
                        {msg.mediaUrl && (
                            <video src={msg.mediaUrl} controls className="max-w-full rounded-xl shadow-sm bg-black" />
                        )}
                        {msg.content && <p className="text-sm">{msg.content}</p>}
                    </div>
                );
            case 'audio':
                return (
                    <div className="space-y-2 py-1">
                        {msg.mediaUrl && (
                            <audio src={msg.mediaUrl} controls className="h-8 max-w-[200px]" />
                        )}
                        <div className="flex items-center gap-2 text-[10px] opacity-70">
                            <Music className="h-3 w-3" /> <span>Voice Note</span>
                        </div>
                    </div>
                );
            case 'file':
                return (
                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-card/20 rounded-xl hover:bg-card/40 transition-colors border border-white/10">
                        <div className="bg-primary/20 p-2 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate">{msg.fileName || 'Shared file'}</p>
                            <p className="text-[10px] uppercase tracking-widest opacity-60">Tap to download</p>
                        </div>
                    </a>
                );
            default:
                return <p className="text-sm whitespace-pre-line leading-relaxed">{msg.content}</p>;
        }
    };

    const renderMessageList = () => {
        const elements: JSX.Element[] = [];
        let lastDateString = "";

        messages.forEach((msg, index) => {
            const msgDate = parseSafeDate(msg.timestamp) || new Date();
            let currentDateString = "";
            
            if (isToday(msgDate)) currentDateString = "Today";
            else if (isYesterday(msgDate)) currentDateString = "Yesterday";
            else if (isThisWeek(msgDate)) currentDateString = format(msgDate, "EEEE");
            else currentDateString = format(msgDate, "MMM d, yyyy");

            if (currentDateString !== lastDateString) {
                elements.push(
                    <div key={`date-${index}`} className="flex justify-center my-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 bg-muted/30 px-3 py-1 rounded-full">{currentDateString}</span>
                    </div>
                );
                lastDateString = currentDateString;
            }

            const isCurrentUserSender = msg.senderId === currentUser?.id;
            const isNextSameSender = messages[index + 1]?.senderId === msg.senderId;
            const isPrevSameSender = messages[index - 1]?.senderId === msg.senderId;
            const isLastInGroup = !isNextSameSender;
            const senderInfo = msg.senderId && activeConversation?.participantInfo ? activeConversation.participantInfo[msg.senderId] : undefined;

            elements.push(
                <div key={msg.id} className={cn(
                    "flex items-end gap-2 max-w-[85%] sm:max-w-[70%] group/msg", 
                    isCurrentUserSender ? "self-end flex-row-reverse" : "self-start",
                    isLastInGroup ? "mb-4" : "mb-0.5"
                )}>
                    {!isCurrentUserSender && isLastInGroup && senderInfo && (
                        <Avatar className="h-8 w-8 self-end flex-shrink-0 shadow-sm">
                            <AvatarImage src={senderInfo?.avatarUrl} data-ai-hint="profile person" />
                            <AvatarFallback className="bg-muted text-[10px] font-bold">{senderInfo?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                        </Avatar>
                    )}
                    {(!isCurrentUserSender && !isLastInGroup) && <div className="w-8" />}
                    
                    <div className="flex flex-col">
                        <div className={cn(
                            "p-3 rounded-2xl shadow-sm text-sm transition-all", 
                            isCurrentUserSender 
                                ? "bg-primary text-primary-foreground rounded-br-none" 
                                : "bg-muted text-foreground rounded-bl-none",
                            !isLastInGroup && (isCurrentUserSender ? "rounded-br-2xl" : "rounded-bl-2xl"),
                            !isPrevSameSender && (isCurrentUserSender ? "rounded-tr-2xl" : "rounded-tl-2xl")
                        )}>
                            {renderMessageContent(msg)}
                        </div>
                        {isCurrentUserSender && index === messages.length - 1 && renderMessageStatus(msg, true)}
                    </div>
                </div>
            );
        });

        return elements;
    };

    const isOtherParticipantOnline = activeConversation ? userStatuses[getOtherParticipant(activeConversation)?.id || ''] === 'online' : false;

    return (
        <Dialog open={isNewConversationDialogOpen} onOpenChange={(isOpen) => {
            setIsNewConversationDialogOpen(isOpen);
            if (!isOpen) { setSearchUsername(''); setSearchedUsers([]); }
        }}>
        <TooltipProvider>
        <div className="flex h-[calc(100vh-12rem)] md:h-[800px] border rounded-3xl bg-card shadow-2xl overflow-hidden mb-10 border-border/40">
            <aside className={cn(
                "w-full md:w-[340px] lg:w-[400px] border-r flex flex-col bg-background/40 backdrop-blur-xl transition-all duration-300",
                mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            )}>
                <div className="p-6 border-b space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-headline font-bold tracking-tight">Threads</h2>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:bg-primary hover:text-primary-foreground transition-all">
                                <Plus className="h-5 w-5" />
                                <span className="sr-only">New Thread</span>
                            </Button>
                        </DialogTrigger>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search conversations..." 
                            className="pl-10 h-10 rounded-full bg-muted/50 border-none focus-visible:ring-primary/50" 
                            value={sidebarSearch}
                            onChange={(e) => setSidebarSearch(e.target.value)}
                        />
                    </div>
                </div>
                 <div className="p-2 px-4 border-b">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-2 ml-2">Active Now</p>
                   <StatusFeature />
                </div>
                <ScrollArea className="flex-1">
                    {isLoadingConversations ? (
                        <div className="p-10 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="text-xs font-bold uppercase tracking-widest opacity-50">Syncing inbox...</span>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground space-y-4">
                            <div className="bg-muted/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                <MessageSquare className="h-8 w-8 text-muted-foreground/40"/>
                            </div>
                            <h3 className="font-headline font-bold text-foreground">No threads found</h3>
                            <p className="text-sm">Start a new message to begin a conversation.</p>
                        </div>
                    ) : (
                    <div className="space-y-0.5 p-2">
                        {filteredConversations.map(conv => {
                            const otherParticipant = getOtherParticipant(conv);
                            const lastMessageDate = parseSafeDate(conv.lastMessage?.timestamp);
                            let lastMessageDisplayTime = '';
                            if (lastMessageDate) {
                                lastMessageDisplayTime = formatDistanceToNow(lastMessageDate, { addSuffix: true });
                            }
                            const isActive = activeConversation?.id === conv.id;
                            const isUnread = conv.lastMessage?.senderId !== currentUser?.id && !conv.lastMessage?.isRead;
                            const isOnline = otherParticipant ? userStatuses[otherParticipant.id] === 'online' : false;

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
                                    {isOnline && <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm animate-pulse"></div>}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h3 className={cn("font-bold truncate text-sm", isActive ? 'text-primary' : 'text-foreground')}>
                                            {otherParticipant?.displayName || `@${otherParticipant?.username}` || 'Unknown User'}
                                        </h3>
                                        <span className={cn("text-[10px] font-semibold uppercase tracking-tighter whitespace-nowrap", isUnread ? 'text-primary' : 'text-muted-foreground/60')}>
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
                                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full"></div>}
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
                                    <div className="relative">
                                        <Avatar className="h-10 w-10 border shadow-sm hover:scale-105 transition-transform">
                                            <AvatarImage src={getOtherParticipant(activeConversation)!.avatarUrl} alt={getOtherParticipant(activeConversation)!.username} data-ai-hint="profile person" />
                                            <AvatarFallback className="bg-muted text-primary font-bold">{getOtherParticipant(activeConversation)!.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                                        </Avatar>
                                        {isOtherParticipantOnline && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
                                        )}
                                    </div>
                                </Link>
                            )}
                            <div className="truncate">
                                <h3 className="font-bold text-base truncate">
                                    {getOtherParticipant(activeConversation)?.displayName || `@${getOtherParticipant(activeConversation)?.username}` || 'Unknown User'}
                                </h3>
                                {otherUserTyping ? (
                                    <p className="text-[10px] text-primary font-bold uppercase tracking-widest animate-pulse">
                                        Typing...
                                    </p>
                                ) : isOtherParticipantOnline ? (
                                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Online Now
                                    </p>
                                ) : (
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                        Away
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("rounded-full h-10 w-10", isOtherParticipantOnline ? "text-primary" : "text-muted-foreground/40")}
                                        onClick={() => !isOtherParticipantOnline && toast({ title: "User is away", description: "You can call them once they are back online." })}
                                    >
                                        {isOtherParticipantOnline ? <Phone className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-bold uppercase">Audio Call</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("rounded-full h-10 w-10", isOtherParticipantOnline ? "text-primary" : "text-muted-foreground/40")}
                                        onClick={() => !isOtherParticipantOnline && toast({ title: "User is away", description: "You can video call them once they are back online." })}
                                    >
                                        {isOtherParticipantOnline ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-[10px] font-bold uppercase">Video Call</TooltipContent>
                            </Tooltip>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                                        <MoreHorizontal className="h-5 w-5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                    <DropdownMenuLabel>Thread Options</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => router.push(`/profile/${getOtherParticipant(activeConversation)?.id}`)}>
                                        <User className="mr-2 h-4 w-4" /> View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast({ title: "Muted", description: "You won't receive notifications for this chat." })}>
                                        <BellOff className="mr-2 h-4 w-4" /> Mute Notifications
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive" onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Conversation
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="rounded-2xl">
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Delete this entire thread?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This will permanently remove the conversation and its history for you. This action cannot be undone.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={handleDeleteConversation} disabled={isDeletingThread} className="bg-destructive hover:bg-destructive/90 rounded-full px-6">
                                                    {isDeletingThread ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                    Delete Thread
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>
                    
                    <ScrollArea className="flex-1 p-6">
                        <div className="flex flex-col min-h-full">
                            {isLoadingMessages ? (
                                <div className="flex justify-center items-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-20 gap-6 text-muted-foreground">
                                    <div className="bg-muted/20 p-6 rounded-full relative">
                                        <Sparkles className="w-12 h-12 text-primary/40"/>
                                        <div className="absolute -top-1 -right-1 bg-primary text-white p-1 rounded-full"><Plus className="h-3 w-3" /></div>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-headline text-xl font-bold text-foreground">Start the Conversation</h3>
                                        <p className="text-sm max-w-[200px] mx-auto">Send a wave or use AI to break the ice.</p>
                                    </div>
                                    <div className="flex flex-col gap-2 w-full max-w-xs">
                                        <Button onClick={handleGenerateStarters} disabled={isGeneratingStarters} className="rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105">
                                            {isGeneratingStarters ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Sparkles className="h-4 w-4 mr-2" />}
                                            Get AI Icebreakers
                                        </Button>
                                        <Button variant="outline" className="rounded-full" onClick={() => handleSendMessage("👋")}>
                                            Wave 👋
                                        </Button>
                                    </div>
                                    {conversationStarters.length > 0 && (
                                        <div className="mt-4 grid gap-2 w-full max-w-sm">
                                            {conversationStarters.map((starter, i) => (
                                                <Button key={i} variant="outline" size="sm" className="w-full text-wrap h-auto text-left justify-start p-3 rounded-2xl hover:bg-primary/5 transition-all text-xs" onClick={() => handleSendMessage(starter)}>
                                                    "{starter}"
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-1">
                                        {renderMessageList()}
                                    </div>
                                    {otherUserTyping && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest animate-pulse ml-10 mb-4">
                                            <div className="flex gap-1">
                                                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                            Typing...
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <footer className="p-4 border-t bg-card/50 backdrop-blur-md">
                        <div className="flex flex-col gap-3">
                            {(pendingMediaPreview || pendingFile || audioURL) && (
                                <div className="flex items-center gap-3 p-3 bg-muted/20 rounded-2xl border border-dashed border-primary/20 animate-in slide-in-from-bottom-2">
                                    {pendingMediaPreview && (
                                        <div className="relative h-16 w-16 rounded-xl overflow-hidden shadow-sm">
                                            {pendingMedia?.type.startsWith('video/') ? (
                                                <div className="w-full h-full bg-black flex items-center justify-center"><Video className="h-6 w-6 text-white"/></div>
                                            ) : (
                                                <Image src={pendingMediaPreview} alt="Preview" layout="fill" objectFit="cover" />
                                            )}
                                            <Button variant="destructive" size="icon" className="absolute top-0 right-0 h-5 w-5 rounded-bl-xl rounded-tr-none" onClick={() => { setPendingMedia(null); setPendingMediaPreview(null); }}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                    {pendingFile && (
                                        <div className="flex items-center gap-2 p-2 bg-card rounded-xl border">
                                            <FileText className="h-5 w-5 text-primary" />
                                            <span className="text-xs font-bold truncate max-w-[100px]">{pendingFile.name}</span>
                                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setPendingFile(null)}><X className="h-3 w-3"/></Button>
                                        </div>
                                    )}
                                    {audioURL && (
                                        <div className="flex items-center gap-2 flex-1">
                                            <audio src={audioURL} controls className="h-8 flex-1" />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setAudioBlob(null); setAudioURL(null); }}><X className="h-4 w-4"/></Button>
                                        </div>
                                    )}
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Ready to send</div>
                                </div>
                            )}

                            {conversationStarters.length > 0 && messages.length > 0 && (
                                <ScrollArea className="w-full whitespace-nowrap">
                                    <div className="flex gap-2 pb-2">
                                        {conversationStarters.map((starter, i) => (
                                            <Button key={i} variant="outline" size="sm" className="rounded-full h-8 text-[10px] uppercase font-bold border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all px-4" onClick={() => handleSendMessage(starter)}>
                                                {starter}
                                            </Button>
                                        ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            )}
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <input type="file" ref={galleryInputRef} className="hidden" accept="image/*,video/*" onChange={handleGallerySelect} />
                                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                                    
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-primary/10 transition-colors" onClick={() => galleryInputRef.current?.click()}>
                                                <ImageIcon className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-[10px] font-bold uppercase">Gallery</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="rounded-full text-primary hover:bg-primary/10 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                                <FileUp className="h-5 w-5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-[10px] font-bold uppercase">Upload File</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={cn("rounded-full transition-colors", isRecording ? "text-destructive animate-pulse bg-destructive/10" : "text-primary hover:bg-primary/10")} 
                                                onClick={isRecording ? stopRecording : startRecording}
                                            >
                                                {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-5 w-5" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent className="text-[10px] font-bold uppercase">{isRecording ? `Stop (${recordingDuration}s)` : 'Voice Note'}</TooltipContent>
                                    </Tooltip>
                                </div>
                                <div className="relative flex-1 group">
                                    <Input 
                                        type="text" 
                                        placeholder={isRecording ? `Recording... ${recordingDuration}s` : "Type a message..."} 
                                        className="flex-1 bg-background focus-visible:ring-primary/20 rounded-full px-5 pr-12 h-11 border-none shadow-inner" 
                                        value={newMessageContent} 
                                        onChange={(e) => handleInputChange(e.target.value)} 
                                        disabled={isSendingMessage || isRecording} 
                                        onKeyDown={(e) => e.key === 'Enter' && !isSendingMessage && handleSendMessage()} 
                                    />
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary transition-colors">
                                                    <Smile className="h-5 w-5" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl overflow-hidden" side="top" align="end">
                                                <EmojiPicker onEmojiClick={handleEmojiClick} />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                                <Button 
                                    type="button" 
                                    size="icon" 
                                    className="bg-primary hover:bg-primary/90 rounded-full h-11 w-11 flex-shrink-0 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" 
                                    disabled={isSendingMessage || isRecording || (!newMessageContent.trim() && !pendingMedia && !pendingFile && !audioBlob)} 
                                    onClick={() => handleSendMessage()}
                                >
                                    {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </div>
                        </div>
                    </footer>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-background/20 backdrop-blur-sm">
                        <div className="relative mb-8">
                            <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
                            <MessageSquare className="h-32 w-32 text-primary/30 relative z-10" />
                        </div>
                        <h2 className="text-3xl font-headline font-bold mb-3 tracking-tight">Your Direct Feed</h2>
                        <p className="text-muted-foreground max-w-sm leading-relaxed">Select a thread to start chatting with your fellow creators and readers.</p>
                        <DialogTrigger asChild>
                            <Button className="mt-8 rounded-full px-10 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:scale-105">
                                <Plus className="mr-2 h-5 w-5" /> New Conversation
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
                <DialogDescription className="text-sm">Find someone by their handle to start a new chat.</DialogDescription>
            </DialogHeader>
            <div className="p-6 space-y-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        id="search-username" 
                        value={searchUsername} 
                        onChange={(e) => setSearchUsername(e.target.value)}
                        placeholder="Search handle (e.g. authorrafaelnv)" 
                        disabled={isCreatingConversation} 
                        className="pl-10 h-12 rounded-2xl bg-muted/50 border-none focus-visible:ring-primary/30"
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
                            No creators found matching "@{searchUsername}"
                        </div>
                    ) : (
                        <div className="py-10 text-center text-muted-foreground flex flex-col items-center gap-3">
                            <Users className="h-10 w-10 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest opacity-40">Start typing to search...</p>
                        </div>
                    )}
                </ScrollArea>
            </div>
            <DialogFooter className="p-4 bg-muted/20 border-t">
                <DialogClose asChild><Button type="button" variant="outline" className="rounded-full px-6" disabled={isCreatingConversation}>Cancel</Button></DialogClose>
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
            <div className="flex flex-col justify-center items-center min-h-screen gap-4">
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
        <>
            <Header />
            <div className="max-w-7xl mx-auto space-y-6 pt-6 pb-24 md:pb-12 px-4 md:px-6">
                <Tabs defaultValue={defaultTab} className="w-full" onValueChange={handleTabChange}>
                    <div className="flex justify-center mb-6">
                        <TabsList className="grid grid-cols-2 w-full max-w-[400px] h-12 bg-muted/50 rounded-full p-1 border border-border/40 shadow-sm backdrop-blur-sm">
                            <TabsTrigger value="messages" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-md font-bold transition-all gap-2">
                                <MessageSquare className="h-4 w-4" /> 
                                Messages
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
            <BottomNavigationBar />
        </>
    );
}
