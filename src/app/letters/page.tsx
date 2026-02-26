
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mailbox, Inbox, Send, Search } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Letter as LetterType } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import LetterCard from '@/components/letters/LetterCard';
import ComposeLetterDialog from '@/components/letters/ComposeLetterDialog';
import { Input } from '@/components/ui/input';

export default function LettersPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [receivedLetters, setReceivedLetters] = useState<LetterType[]>([]);
  const [sentLetters, setSentLetters] = useState<LetterType[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) {
      if(!loading) setIsLoadingLetters(false);
      return;
    }
    
    setIsLoadingLetters(true);

    const receivedQuery = query(
      collection(db, 'letters'),
      where('authorId', '==', user.id),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
      setReceivedLetters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterType)));
      setIsLoadingLetters(false);
    }, (error) => {
      console.error("Error fetching received letters: ", error);
      setIsLoadingLetters(false);
    });

    const sentQuery = query(
      collection(db, 'letters'),
      where('reader.id', '==', user.id),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      setSentLetters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LetterType)));
    }, (error) => {
      console.error("Error fetching sent letters: ", error);
    });

    return () => {
      unsubscribeReceived();
      unsubscribeSent();
    };
  }, [user, loading, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Mailbox className="h-20 w-20 text-muted-foreground/30 mb-6" />
        <h1 className="text-2xl font-headline font-bold">Your Mailbox</h1>
        <p className="text-muted-foreground max-w-sm mt-2">
          Sign in to connect with authors and readers through heartfelt letters.
        </p>
        <Link href="/auth/signin" className="mt-6">
            <Button>Sign In to Continue</Button>
        </Link>
      </div>
    );
  }

  const filterLetters = (letters: LetterType[]) => {
    if (!searchTerm.trim()) return letters;
    const term = searchTerm.toLowerCase();
    return letters.filter(l => 
        l.storyTitle.toLowerCase().includes(term) || 
        l.content.toLowerCase().includes(term) ||
        l.reader.username.toLowerCase().includes(term) ||
        l.author.username.toLowerCase().includes(term)
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 z-20 bg-background/80 backdrop-blur-md py-4 border-b">
        <div className="flex items-center gap-4">
            <h1 className="text-2xl font-headline font-bold">Mailbox</h1>
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search letters..." 
                    className="pl-9 bg-muted/50 border-none h-9 rounded-full focus-visible:ring-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="flex items-center gap-2">
            <ComposeLetterDialog />
        </div>
      </header>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-xs mb-6">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" /> Received
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" /> Sent
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="mt-0 focus-visible:outline-none">
            {isLoadingLetters ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filterLetters(receivedLetters).length > 0 ? (
                <div className="grid gap-px bg-border border rounded-xl overflow-hidden shadow-sm">
                    {filterLetters(receivedLetters).map(letter => (
                        <LetterCard key={letter.id} letter={letter} isAuthorView={true} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-card rounded-xl border-2 border-dashed">
                    <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">No received letters</h3>
                    <p className="text-muted-foreground">Letters from readers will appear here.</p>
                </div>
            )}
        </TabsContent>

        <TabsContent value="sent" className="mt-0 focus-visible:outline-none">
            {isLoadingLetters ? (
                <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : filterLetters(sentLetters).length > 0 ? (
                <div className="grid gap-px bg-border border rounded-xl overflow-hidden shadow-sm">
                    {filterLetters(sentLetters).map(letter => (
                        <LetterCard key={letter.id} letter={letter} isAuthorView={false} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-card rounded-xl border-2 border-dashed">
                    <Send className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg">Your Outbox is Empty</h3>
                    <p className="text-muted-foreground">Start composing to send a letter to your favorite author.</p>
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
