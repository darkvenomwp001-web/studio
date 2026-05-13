
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import type { Broadcast } from '@/types';
import { Loader2, Radio } from 'lucide-react';
import CreateBroadcastForm from './CreateBroadcastForm';
import BroadcastCard from './BroadcastCard';

const OWNER_HANDLES = ['arnv'];

export default function BroadcastFeed() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isOwner = user && OWNER_HANDLES.includes(user.username);

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, 'broadcasts'),
      orderBy('isPinned', 'desc'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Broadcast)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 pb-20">
      {isOwner && <CreateBroadcastForm />}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : broadcasts.length > 0 ? (
        <div className="grid gap-6">
          {broadcasts.map(broadcast => (
            <BroadcastCard key={broadcast.id} broadcast={broadcast} isOwner={isOwner} />
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-card/50 rounded-[40px] border-2 border-dashed border-border/40">
          <div className="bg-muted/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Radio className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <h3 className="text-2xl font-headline font-bold mb-2">Silence in the archives</h3>
          <p className="text-muted-foreground max-w-xs mx-auto px-6">Official updates from the owner will appear here once transmission begins.</p>
        </div>
      )}
    </div>
  );
}
