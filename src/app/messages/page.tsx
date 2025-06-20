
'use client';

import { useEffect, useState, useRef, FormEvent, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Send, Paperclip, Smile, Loader2, MessageSquare as MessageSquareIcon, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
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
import type { Conversation, Message, UserSummary, User as AppUserType } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
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


export default function MessagesPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();

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

      if (finalResults.length === 0 && searchTerm.trim().length > 0) { 
         // toast({ title: "No Users Found", description: `No user found starting with "${searchTerm.trim()}".` }); // Optional toast
      }
      setSearchedUsers(finalResults);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({ title: "Search Error", description: "Could not perform user search. Ensure Firestore indexes are set up.", variant: "destructive" });
    } finally {
      setIsSearchingUsers(false);
    }
  };
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
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


  const handleStartNewConversation = async (targetUser: UserSummary) => {
    if (!currentUser) return;
    setIsCreatingConversation(true);

    try {
      const sortedParticipantIds = [currentUser.id, targetUser.id].sort();
      const existingConvQuery = query(
        collection(db, 'conversations'),
        where('participantIds', '==', sortedParticipantIds), // Requires exact match of the sorted array
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
          lastMessage: { // Initial placeholder last message
            id: '',
            content: 'Conversation started.',
            senderId: '', // No specific sender for "Conversation started"
            timestamp: serverTimestamp(),
          },
        };
        await setDoc(newConversationRef, newConversationData);
        
        const newConvSnap = await getDoc(newConversationRef); // Fetch the newly created doc to get its ID and data
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
  };


  if (authLoading) {
    return <div className="flex justify-center items-center h-[calc(100vh-8rem)]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center">
        <MessageSquareIcon className="h-24 w-24 text-muted-foreground/50 mb-6" />
        <h2 className="text-2xl font-headline font-semibold mb-2">Messages</h2>
        <p className="text-muted-foreground">Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to view your messages.</p>
      </div>
    );
  }

  return (
    <Dialog open={isNewConversationDialogOpen} onOpenChange={(isOpen) => {
        setIsNewConversationDialogOpen(isOpen);
        if (!isOpen) { 
            setSearchUsername('');
            setSearchedUsers([]);
        }
    }}>
      <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] border bg-card rounded-lg shadow-xl overflow-hidden">
        <aside className="w-full md:w-1/3 lg:w-1/4 border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-2xl font-headline font-semibold">Messages</h2>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-primary">
                  <UserPlus className="h-5 w-5" />
                  <span className="sr-only">New Message</span>
                </Button>
              </DialogTrigger>
            </div>
            {/* <div className="relative">
              <Input type="search" placeholder="Search messages (disabled)" className="pl-10 bg-background" disabled />
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            </div> */}
          </div>
          <ScrollArea className="flex-1">
            {isLoadingConversations ? (
              <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground">No conversations yet. Start a new one!</p>
            ) : (
              conversations.map(conv => {
                const otherParticipant = getOtherParticipant(conv);
                const lastMessageTimestampServer = conv.lastMessage?.timestamp as any; 
                let lastMessageDisplayTime = 'No recent messages';
                if (lastMessageTimestampServer && typeof lastMessageTimestampServer.toDate === 'function') {
                  lastMessageDisplayTime = formatDistanceToNow(lastMessageTimestampServer.toDate(), { addSuffix: true });
                } else if (lastMessageTimestampServer) { // Fallback for potentially stringified timestamps or other Date objects
                   try {
                      lastMessageDisplayTime = formatDistanceToNow(new Date(lastMessageTimestampServer), { addSuffix: true });
                   } catch (e) { /* ignore invalid date format */ }
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
                      <Link href={`/profile/${otherParticipant.id}`} onClick={(e) => e.stopPropagation()} passHref>
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={otherParticipant.avatarUrl} alt={otherParticipant.username} data-ai-hint="profile person" />
                          <AvatarFallback>{otherParticipant.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                        </Avatar>
                      </Link>
                    )}
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        {otherParticipant ? (
                           <Link href={`/profile/${otherParticipant.id}`} onClick={(e) => e.stopPropagation()} className="truncate">
                              <h3 className={cn(`font-semibold truncate hover:underline`, isActive ? 'text-primary' : 'text-foreground')}>
                                {otherParticipant.displayName || otherParticipant.username}
                              </h3>
                          </Link>
                        ) : (
                            <h3 className={cn(`font-semibold truncate`, isActive ? 'text-primary' : 'text-foreground')}>
                                Unknown User
                            </h3>
                        )}
                        <span className={cn(`text-xs whitespace-nowrap`, isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                          {lastMessageDisplayTime}
                        </span>
                      </div>
                      <p className={cn(`text-sm truncate`, isActive ? 'text-foreground/90' : 'text-muted-foreground')}>
                        {conv.lastMessage?.senderId === currentUser.id && conv.lastMessage?.content && "You: "}
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
                  <Link href={`/profile/${getOtherParticipant(activeConversation)!.id}`} passHref>
                      <Avatar>
                      <AvatarImage src={getOtherParticipant(activeConversation)!.avatarUrl} alt={getOtherParticipant(activeConversation)!.username} data-ai-hint="profile person" />
                      <AvatarFallback>{getOtherParticipant(activeConversation)!.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                      </Avatar>
                  </Link>
                )}
                {getOtherParticipant(activeConversation) ? (
                  <Link href={`/profile/${getOtherParticipant(activeConversation)!.id}`} passHref>
                      <h3 className="font-semibold text-lg hover:underline">{getOtherParticipant(activeConversation)!.displayName || getOtherParticipant(activeConversation)!.username}</h3>
                  </Link>
                ) : (
                     <h3 className="font-semibold text-lg">Unknown User</h3>
                )}
              </header>
              
              <ScrollArea className="flex-1 p-4 space-y-4">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No messages in this conversation yet. Say hi!</p>
                ) : (
                  messages.map(msg => {
                    const senderInfo = msg.senderId && activeConversation.participantInfo ? activeConversation.participantInfo[msg.senderId] : undefined;
                    const isCurrentUserSender = msg.senderId === currentUser.id;
                    const messageTimestampServer = msg.timestamp as any;
                    let messageDisplayTime = '';
                    if (messageTimestampServer && typeof messageTimestampServer.toDate === 'function') {
                      messageDisplayTime = formatDistanceToNow(messageTimestampServer.toDate(), {addSuffix: true});
                    } else if (messageTimestampServer) {
                      try {
                        messageDisplayTime = formatDistanceToNow(new Date(messageTimestampServer), { addSuffix: true });
                      } catch (e) { /* ignore */ }
                    }

                    return (
                      <div key={msg.id} className={cn("flex items-end gap-2", isCurrentUserSender && "justify-end")}>
                        {!isCurrentUserSender && senderInfo && (
                           <Link href={`/profile/${senderInfo.id}`} passHref>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={senderInfo?.avatarUrl} data-ai-hint="profile person" />
                                <AvatarFallback>{senderInfo?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                            </Avatar>
                           </Link>
                        )}
                        <div 
                          className={cn(
                            "max-w-xs md:max-w-md p-3 rounded-lg shadow", 
                            isCurrentUserSender ? "rounded-br-none bg-primary text-primary-foreground" : "rounded-bl-none bg-muted text-foreground"
                          )}
                        >
                          <p className="text-sm whitespace-pre-line">{msg.content}</p>
                          {messageDisplayTime && (
                            <p className={cn("text-xs mt-1 text-right", isCurrentUserSender ? "text-primary-foreground/80" : "text-muted-foreground")}>
                              {messageDisplayTime}
                            </p>
                          )}
                        </div>
                        {isCurrentUserSender && currentUser && (
                           <Link href={`/profile/${currentUser.id}`} passHref>
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={currentUser.avatarUrl} data-ai-hint="profile person" />
                                <AvatarFallback>{currentUser.username.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                           </Link>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </ScrollArea>

              <footer className="p-4 border-t bg-card">
                <form 
                  onSubmit={(e) => { 
                    e.preventDefault(); 
                    handleSendMessage();
                  }} 
                  className="flex items-center gap-2"
                >
                  <Button type="button" variant="ghost" size="icon" onClick={() => toast({title: "Emoji picker coming soon!"})}><Smile className="h-5 w-5 text-muted-foreground" /></Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => toast({title: "Attachment feature coming soon!"})}><Paperclip className="h-5 w-5 text-muted-foreground" /></Button>
                  <Input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-background focus-visible:ring-primary" 
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                    disabled={isSendingMessage}
                  />
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isSendingMessage || !newMessageContent.trim()}>
                    {isSendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquareIcon className="h-24 w-24 text-muted-foreground/50 mb-6" />
              <h2 className="text-2xl font-headline font-semibold mb-2">No Conversation Selected</h2>
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
                    <Link href={`/profile/${user.id}`} onClick={(e) => e.stopPropagation()} passHref>
                        <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.username} data-ai-hint="profile person" />
                        <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <span>{user.displayName || user.username}</span>
                  </div>
                  {isCreatingConversation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareIcon className="h-4 w-4 text-primary" />}
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
            <Button type="button" variant="outline" disabled={isCreatingConversation}>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    
