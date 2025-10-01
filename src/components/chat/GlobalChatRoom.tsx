
'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { sendGlobalChatMessage } from '@/app/actions/threadActions';
import type { GlobalChatMessage, UserSummary } from '@/types';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

function ChatMessage({ message, isCurrentUser }: { message: GlobalChatMessage, isCurrentUser: boolean }) {
    return (
        <div className={cn("flex items-end gap-2", isCurrentUser ? "justify-end" : "justify-start")}>
            {!isCurrentUser && (
                <Link href={`/profile/${message.author.id}`} className="self-start">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={message.author.avatarUrl} alt={message.author.username} data-ai-hint="profile person" />
                        <AvatarFallback>{message.author.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </Link>
            )}
            <div className={cn(
                "max-w-xs md:max-w-md rounded-2xl px-4 py-2 shadow-sm",
                isCurrentUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted rounded-bl-none"
            )}>
                 {!isCurrentUser && (
                    <p className="text-xs font-semibold text-accent mb-0.5">{message.author.displayName || message.author.username}</p>
                 )}
                <p className="text-sm whitespace-pre-line">{message.content}</p>
                 <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {message.timestamp?.toDate ? formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true }) : 'sending...'}
                 </p>
            </div>
        </div>
    );
}

export default function GlobalChatRoom() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(
      collection(db, 'globalChatMessages'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMessages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as GlobalChatMessage))
        .reverse(); // Reverse to have newest at the bottom
      setMessages(fetchedMessages);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching chat messages: ", error);
      toast({ title: "Error", description: "Could not load chat messages.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
            top: scrollAreaRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }
  }, [messages]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || newMessage.trim() === '') return;
    if (user.isAnonymous) {
        toast({ title: "Please Sign Up", description: "You need a full account to join the chat.", variant: "destructive"});
        return;
    }

    setIsSending(true);

    const authorSummary: UserSummary = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    };

    const result = await sendGlobalChatMessage(authorSummary, newMessage);

    if (result.success) {
      setNewMessage('');
    } else {
      toast({ title: 'Error Sending Message', description: result.error, variant: 'destructive' });
    }
    setIsSending(false);
  };

  return (
    <Card className="h-[70vh] flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle>Global Chat Room</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} isCurrentUser={user?.id === msg.author.id} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        {user && !user.isAnonymous ? (
            <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
            <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Say something..."
                disabled={isSending}
                autoComplete="off"
            />
            <Button type="submit" disabled={isSending || !newMessage.trim()}>
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            </form>
        ) : (
            <p className="text-sm text-muted-foreground w-full text-center">
                Please <Link href="/auth/signin" className="text-primary hover:underline">sign in</Link> to join the chat.
            </p>
        )}
      </CardFooter>
    </Card>
  );
}
