'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mailbox, Inbox, Send } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import type { Letter as LetterType } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import LetterCard from '@/components/letters/LetterCard';
import ComposeLetterDialog from '@/components/letters/ComposeLetterDialog';

export default function LettersPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [receivedLetters, setReceivedLetters] = useState<LetterType[]>([]);
  const [sentLetters, setSentLetters] = useState<LetterType[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);

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
      toast({ title: "Error", description: "Could not load received letters.", variant: "destructive" });
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
      toast({ title: "Error", description: "Could not load sent letters.", variant: "destructive" });
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
      <div className="text-center py-10">
        <Mailbox className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-headline">Your Mailbox</h1>
        <p className="text-muted-foreground">
          <Link href="/auth/signin" className="text-primary hover:underline">Sign in</Link> to send and receive letters from authors and readers.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex justify-between items-start sm:items-center">
        <div>
          <h1 className="text-4xl font-headline font-bold text-primary flex items-center gap-3">
            <Mailbox className="h-10 w-10" />
            Mailbox
          </h1>
          <p className="text-muted-foreground">Heartfelt messages from readers and authors.</p>
        </div>
        <ComposeLetterDialog />
      </header>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            <Inbox className="mr-2 h-4 w-4" /> Received ({receivedLetters.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-2 h-4 w-4" /> Sent ({sentLetters.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Received Letters</CardTitle>
              <CardDescription>Letters sent to you by readers of your stories.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingLetters ? (
                 <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : receivedLetters.length > 0 ? (
                receivedLetters.map(letter => <LetterCard key={letter.id} letter={letter} isAuthorView={true} />)
              ) : (
                <p className="text-center text-muted-foreground py-6">No letters received yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="sent" className="mt-4">
           <Card>
            <CardHeader>
              <CardTitle>Sent Letters</CardTitle>
              <CardDescription>Letters you've sent to authors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoadingLetters ? (
                 <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : sentLetters.length > 0 ? (
                sentLetters.map(letter => <LetterCard key={letter.id} letter={letter} isAuthorView={false} />)
              ) : (
                <p className="text-center text-muted-foreground py-6">You haven't sent any letters yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
