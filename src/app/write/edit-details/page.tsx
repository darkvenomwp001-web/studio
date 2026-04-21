'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Trash2, 
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase'; 
import { doc, updateDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import type { Story, UserSummary } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function EditStoryDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryStoryId = searchParams.get('storyId');

  const [story, setStory] = useState<Story | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [isProcessingCollab, setIsProcessingCollab] = useState(false);

  useEffect(() => {
    if (queryStoryId) {
      const unsub = onSnapshot(doc(db, 'stories', queryStoryId), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Story;
          setStory(data);
          setStoryTitle(data.title);
          setSummary(data.summary);
        }
        setIsLoading(false);
      });
      return unsub;
    }
  }, [queryStoryId]);

  const handleAddCollaborator = async () => {
    if (!story || !collaboratorUsername.trim()) return;
    setIsProcessingCollab(true);
    const q = query(collection(db, 'users'), where('username', '==', collaboratorUsername.trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const newUser = { id: snap.docs[0].id, ...snap.docs[0].data() } as UserSummary;
      await updateDoc(doc(db, 'stories', story.id), {
        collaboratorIds: [...(story.collaboratorIds || []), newUser.id],
        collaborators: [...(story.collaborators || []), newUser]
      });
      setCollaboratorUsername('');
      toast({ title: "Added!" });
    } else {
      toast({ title: "User not found", variant: "destructive" });
    }
    setIsProcessingCollab(false);
  };

  const handleRemoveCollaborator = async (id: string) => {
    if (!story) return;
    await updateDoc(doc(db, 'stories', story.id), {
        collaboratorIds: story.collaboratorIds?.filter(i => i !== id) || [],
        collaborators: story.collaborators?.filter(c => c.id !== id) || []
    });
    toast({ title: "Removed" });
  };

  if (isLoading || !story) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-10">
      <header className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push('/write')} className="mb-2 -ml-2 text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          <h1 className="text-3xl md:text-5xl font-headline font-bold">{storyTitle || 'Manuscript'}</h1>
      </header>

      <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid grid-cols-2 max-w-md bg-muted/50 p-1 rounded-full mb-10">
              <TabsTrigger value="content" className="rounded-full font-bold">Canvas</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-full font-bold">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-8 animate-in fade-in">
              <div className="grid gap-6">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</Label>
                      <Input value={storyTitle} onChange={e => setStoryTitle(e.target.value)} className="h-14 text-xl font-bold rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Summary</Label>
                      <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={6} className="rounded-2xl" />
                  </div>
              </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6 animate-in fade-in">
              <Card>
                  <CardHeader><CardTitle>Collaborators</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex gap-2">
                          <Input placeholder="@handle" value={collaboratorUsername} onChange={e => setCollaboratorUsername(e.target.value)} />
                          <Button onClick={handleAddCollaborator} disabled={isProcessingCollab}>Add</Button>
                      </div>
                      <div className="space-y-2">
                          {story.collaborators?.map(c => (
                              <div key={c.id} className="flex items-center justify-between p-3 border rounded-xl">
                                  <span className="font-bold text-sm">@{c.username}</span>
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(c.id)} className="text-destructive"><Trash2 className="h-4 w-4"/></Button>
                              </div>
                          ))}
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>
    </div>
  );
}
