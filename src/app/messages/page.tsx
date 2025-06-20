
'use client';

import { useEffect, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit3, Send, Paperclip, Smile, Loader2, MessageSquare as MessageSquareIcon } from 'lucide-react';
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
  limit
} from 'firebase/firestore';
import type { Conversation, Message, UserSummary } from '@/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch conversations for the current user
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

  // Fetch messages for the active conversation
  useEffect(() => {
    if (!activeConversation?.id) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesQuery = query(
      collection(db, 'conversations', activeConversation.id, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(50) // Load last 50 messages
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
      timestamp: serverTimestamp(), // Firestore server timestamp
    };

    try {
      // Add new message to subcollection
      const messageRef = await addDoc(collection(db, 'conversations', activeConversation.id, 'messages'), messageData);
      
      // Update lastMessage on conversation document
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
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] border bg-card rounded-lg shadow-xl overflow-hidden">
      <aside className="w-full md:w-1/3 lg:w-1/4 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-headline font-semibold">Messages</h2>
            <Button variant="ghost" size="icon" className="text-primary" onClick={() => toast({title: "Coming Soon!", description: "Starting new conversations will be available soon."})}>
              <Edit3 className="h-5 w-5" />
              <span className="sr-only">New Message</span>
            </Button>
          </div>
          <div className="relative">
            <Input type="search" placeholder="Search messages (disabled)" className="pl-10 bg-background" disabled />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {isLoadingConversations ? (
            <div className="p-4 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-center text-muted-foreground">No conversations yet.</p>
          ) : (
            conversations.map(conv => {
              const otherParticipant = getOtherParticipant(conv);
              const lastMessageTimestampServer = conv.lastMessage?.timestamp as any; // Keep as any for Firestore Timestamp
              let lastMessageDisplayTime = 'No recent messages';
              if (lastMessageTimestampServer && typeof lastMessageTimestampServer.toDate === 'function') {
                lastMessageDisplayTime = formatDistanceToNow(lastMessageTimestampServer.toDate(), { addSuffix: true });
              } else if (lastMessageTimestampServer) {
                 // Fallback if it's already a string or number (less ideal)
                 try {
                    lastMessageDisplayTime = formatDistanceToNow(new Date(lastMessageTimestampServer), { addSuffix: true });
                 } catch (e) { /* ignore if not a valid date string */ }
              }

              const isActive = activeConversation?.id === conv.id;

              return (
                <div 
                  key={conv.id} 
                  className={cn(
                    `flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50`,
                    isActive ? 'bg-primary/10 border-l-4 border-primary' : ''
                  )}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={otherParticipant?.avatarUrl} alt={otherParticipant?.username} data-ai-hint="profile person" />
                    <AvatarFallback>{otherParticipant?.username?.substring(0, 2).toUpperCase() || '??'}</AvatarFallback>
                  </Avatar>
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
                      {conv.lastMessage?.senderId === currentUser.id && "You: "}
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
               <Avatar>
                <AvatarImage src={getOtherParticipant(activeConversation)?.avatarUrl} alt={getOtherParticipant(activeConversation)?.username} data-ai-hint="profile person" />
                <AvatarFallback>{getOtherParticipant(activeConversation)?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{getOtherParticipant(activeConversation)?.displayName || getOtherParticipant(activeConversation)?.username || 'Unknown User'}</h3>
              </div>
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
                  const messageTimestampServer = msg.timestamp as any; // Keep as any for Firestore Timestamp
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
                      {!isCurrentUserSender && (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={senderInfo?.avatarUrl} data-ai-hint="profile person" />
                          <AvatarFallback>{senderInfo?.username?.substring(0,2).toUpperCase() || '??'}</AvatarFallback>
                        </Avatar>
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
            <p className="text-muted-foreground">Select a conversation from the list or start a new one (feature coming soon).</p>
          </div>
        )}
      </main>
    </div>
  );
}
      
    