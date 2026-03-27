
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, FileText, ListChecks, Users, BookOpen } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface StoryCompendiumProps {
  storyId: string;
  initialNotes?: string;
}

export default function StoryCompendium({ storyId, initialNotes = '' }: StoryCompendiumProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<'Idle' | 'Typing' | 'Saving' | 'Saved' | 'Error'>('Idle');
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const saveNotes = async (content: string) => {
    if (!storyId) return;
    setStatus('Saving');

    const storyRef = doc(db, 'stories', storyId);
    updateDoc(storyRef, { 
      notes: content,
      lastUpdated: serverTimestamp() 
    })
    .then(() => setStatus('Saved'))
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: storyRef.path,
        operation: 'update',
        requestResourceData: { notes: content },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setStatus('Error');
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    setStatus('Typing');

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      saveNotes(value);
    }, 2000);
  };

  return (
    <Card className="shadow-lg border-primary/10 bg-card/50 backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-lg font-headline text-primary">
            <BookOpen className="h-5 w-5" /> Story Compendium
          </CardTitle>
          <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
            {status === 'Saving' && <Loader2 className="h-3 w-3 animate-spin" />}
            {status === 'Saved' && <Save className="h-3 w-3 text-green-500" />}
            {status}
          </div>
        </div>
        <CardDescription className="text-xs">Your persistent story bible and workspace notes.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        <Tabs defaultValue="notes" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-muted/30 border-b p-0 h-10">
            <TabsTrigger value="notes" className="rounded-none data-[state=active]:bg-background text-[10px] font-bold uppercase"><FileText className="h-3 w-3 mr-1.5"/>Notes</TabsTrigger>
            <TabsTrigger value="outline" className="rounded-none data-[state=active]:bg-background text-[10px] font-bold uppercase"><ListChecks className="h-3 w-3 mr-1.5"/>Outline</TabsTrigger>
            <TabsTrigger value="cast" className="rounded-none data-[state=active]:bg-background text-[10px] font-bold uppercase"><Users className="h-3 w-3 mr-1.5"/>Cast</TabsTrigger>
          </TabsList>
          
          <TabsContent value="notes" className="flex-1 m-0 p-0">
            <Textarea
              value={notes}
              onChange={handleNotesChange}
              placeholder="Jot down general thoughts, themes, or research..."
              className="h-full min-h-[300px] border-0 focus-visible:ring-0 resize-none p-4 text-sm leading-relaxed bg-transparent"
            />
          </TabsContent>
          
          <TabsContent value="outline" className="flex-1 m-0 p-0">
             <div className="p-8 text-center text-muted-foreground space-y-2">
                <ListChecks className="h-8 w-8 mx-auto opacity-20" />
                <p className="text-xs font-semibold">Outline Builder Coming Soon</p>
                <p className="text-[10px]">Use the Notes tab for your outline in the meantime.</p>
             </div>
          </TabsContent>

          <TabsContent value="cast" className="flex-1 m-0 p-0">
             <div className="p-8 text-center text-muted-foreground space-y-2">
                <Users className="h-8 w-8 mx-auto opacity-20" />
                <p className="text-xs font-semibold">Character Tracking Coming Soon</p>
                <p className="text-[10px]">A dedicated database for your protagonists and villains.</p>
             </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
