'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Mailbox, Inbox, Send, Search, Sparkles, Filter, Pin, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { Letter as LetterType } from '@/types';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import LetterCard from '@/components/letters/LetterCard';
import ComposeLetterDialog from '@/components/letters/ComposeLetterDialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type LetterFilter = 'all' | 'unread' | 'pinned';

export default function LettersPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [receivedLetters, setReceivedLetters] = useState<LetterType[]>([]);
  const [sentLetters, setSentLetters] = useState<LetterType[]>([]);
  const [isLoadingLetters, setIsLoadingLetters] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<LetterFilter>('all');
  const [userStatuses, setUserStatuses] = useState<Record<string, 'online' | 'offline'>>({});

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

  const filteredReceived = useMemo(() => {
    let list = [...receivedLetters];
    if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        list = list.filter(l => 
            l.storyTitle.toLowerCase().includes(term) || 
            l.content.toLowerCase().includes(term) ||
            l.reader.username.toLowerCase().includes(term)
        );
    }
    if (activeFilter === 'unread') {
        list = list.filter(l => !l.isReadByAuthor);
    }
    if (activeFilter === 'pinned') {
        list = list.filter(l => l.isPinned);
    }
    return list;
  }, [receivedLetters, searchTerm, activeFilter]);

  const filteredSent = useMemo(() => {
    if (!searchTerm.trim()) return sentLetters;
    const term = searchTerm.toLowerCase();
    return sentLetters.filter(l => 
        l.storyTitle.toLowerCase().includes(term) || 
        l.content.toLowerCase().includes(term) ||
        l.author.username.toLowerCase().includes(term)
    );
  }, [sentLetters, searchTerm]);

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
        <h1 className="text-3xl font-headline font-bold">The Archives Await</h1>
        <p className="text-muted-foreground max-w-sm mt-2 leading-relaxed">
          Sign in to connect with authors and fellow readers through heartfelt, personal letters.
        </p>
        <Link href="/auth/signin" className="mt-8">
            <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20">Sign In to Continue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4 md:px-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 sticky top-16 z-20 bg-background/80 backdrop-blur-md py-6 border-b border-border/40">
        <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold tracking-tight">Mailbox</h1>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">Community Correspondence</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search titles, readers, or content..." 
                    className="pl-10 bg-muted/50 border-none h-11 rounded-2xl focus-visible:ring-primary/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <ComposeLetterDialog />
        </div>
      </header>

      <Tabs defaultValue="received" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40">
                <TabsTrigger value="received" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2 px-6">
                    <Inbox className="h-4 w-4" /> Received
                </TabsTrigger>
                <TabsTrigger value="sent" className="rounded-full data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold gap-2 px-6">
                    <Send className="h-4 w-4" /> Sent
                </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl border border-border/20">
                <Button 
                    variant={activeFilter === 'all' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg text-[10px] uppercase font-bold tracking-widest"
                    onClick={() => setActiveFilter('all')}
                >
                    All
                </Button>
                <Button 
                    variant={activeFilter === 'unread' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg text-[10px] uppercase font-bold tracking-widest gap-1.5"
                    onClick={() => setActiveFilter('unread')}
                >
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Unread
                </Button>
                <Button 
                    variant={activeFilter === 'pinned' ? 'secondary' : 'ghost'} 
                    size="sm" 
                    className="rounded-lg text-[10px] uppercase font-bold tracking-widest gap-1.5"
                    onClick={() => setActiveFilter('pinned')}
                >
                    <Pin className="h-3 w-3" />
                    Pinned
                </Button>
            </div>
        </div>
        
        <TabsContent value="received" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
            {isLoadingLetters ? (
                <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : filteredReceived.length > 0 ? (
                <div className="grid gap-3">
                    {filteredReceived.map(letter => (
                        <LetterCard 
                            key={letter.id} 
                            letter={letter} 
                            isAuthorView={true} 
                            isOnline={userStatuses[letter.reader.id] === 'online'}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-card/50 rounded-3xl border-2 border-dashed border-border/40">
                    <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-headline font-bold text-xl">No letters found</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                        {searchTerm || activeFilter !== 'all' ? "Try adjusting your filters or search." : "Reader letters about your stories will appear here."}
                    </p>
                </div>
            )}
        </TabsContent>

        <TabsContent value="sent" className="mt-0 focus-visible:outline-none animate-in fade-in duration-500">
            {isLoadingLetters ? (
                <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : filteredSent.length > 0 ? (
                <div className="grid gap-3">
                    {filteredSent.map(letter => (
                        <LetterCard 
                            key={letter.id} 
                            letter={letter} 
                            isAuthorView={false} 
                            isOnline={userStatuses[letter.authorId] === 'online'}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-card/50 rounded-3xl border-2 border-dashed border-border/40">
                    <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Send className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                    <h3 className="font-headline font-bold text-xl">Your Outbox is Empty</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto mt-2">
                        Start composing a letter to share your appreciation with a creator.
                    </p>
                </div>
            )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
