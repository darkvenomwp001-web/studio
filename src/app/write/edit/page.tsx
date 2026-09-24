'use client';

import { useState, useEffect, useCallback, useMemo, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Save, 
  Loader2, 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Settings, 
  Users, 
  CheckCircle, 
  BookOpen, 
  Eye, 
  ChevronUp, 
  ChevronDown,
  EllipsisVertical,
  Calendar,
  Lock,
  PlusCircle,
  TriangleAlert,
  Tag,
  AtSign,
  UploadCloud,
  Camera,
  ImagePlus,
  Edit,
  X
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp, 
  deleteDoc,
  collection
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';

interface Story {
  id: string;
  title: string;
  summary: string;
  genre: string;
  authorBio: string;
  chapters: Chapter[];
  status: 'Ongoing' | 'Completed' | 'Draft';
  visibility: 'Public' | 'Private' | 'Unlisted';
  lastUpdated: any;
  coverImageUrl?: string;
  tags: string[];
}

interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  status: 'Published' | 'Draft';
  accessType: 'public' | 'premium';
  votes: number;
}

export default function EditStoryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryStoryId = searchParams.get('storyId');

  const [storyDetails, setStoryDetails] = useState<Story | null>(null);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'Saved' | 'Saving...' | 'Changes'>('Saved');
  const [isSaving, startSavingTransition] = useTransition();

  useEffect(() => {
    if (!queryStoryId) return;

    const storyDocRef = doc(db, 'stories', queryStoryId);
    const unsubscribe = onSnapshot(storyDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setStoryDetails({ id: docSnap.id, ...docSnap.data() } as Story);
        setBioInput(docSnap.data().authorBio || '');
      }
    });
    return () => unsubscribe();
  }, [queryStoryId]);

  const handleUpdateField = useCallback(async (fieldName: string, value: any) => {
    if (!storyDetails) return;
    setSaveStatus('Saving...');
    
    const storyRef = doc(db, 'stories', story.id);
    
    updateDoc(storyRef, {
      [fieldName]: value,
      lastUpdated: serverTimestamp()
    }).then(() => {
      setSaveStatus('Saved');
    }).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: storyRef.path,
        operation: 'update',
        requestResourceData: { [fieldName]: value },
      } satisfies SecurityRuleContext);
      errorEmitter.emit('permission-error', permissionError);
      setSaveStatus('Changes');
    });
  }, [storyDetails]);

  const handleDeleteStory = async () => {
    if (!storyDetails) return;
    await deleteDoc(doc(db, 'stories', story.id));
    router.push('/write');
    toast({ title: "Manuscript deleted" });
  };

  const handleDeleteChapter = async (chapterId: string) => {
      if (!storyDetails) return;
      const updatedChapters = storyDetails.chapters.filter(ch => ch.id !== chapterId);
      await updateDoc(doc(db, 'stories', story.id), { chapters: updatedChapters, lastUpdated: serverTimestamp() });
      toast({ title: "Part deleted" });
  };

  const publishedChapters = useMemo(() => {
    if (!storyDetails) return [];
    return storyDetails.chapters.filter(ch => ch.status === 'Published' || ch.accessType === 'premium');
  }, [storyDetails]);

  const handleAddChapter = async () => {
      if (!storyDetails) return;
      
      const newChapterId = doc(collection(db, 'placeholder')).id;
      const newChapter: Chapter = {
        id: newChapterId,
        title: 'New Chapter',
        content: '',
        order: storyDetails.chapters.length + 1,
        status: 'Draft',
        accessType: 'public',
        votes: 0
      };

      await updateDoc(doc(db, 'stories', story.id), {
          chapters: arrayUnion(newChapter),
          lastUpdated: serverTimestamp()
      });
      router.push(`/write/edit?storyId=${storyDetails.id}&chapterId=${newChapterId}`);
  };

  const handleAddCollaborator = async (username: string) => {
      if (!storyDetails) return;
      // In a real app, you'd find the user ID by username first
      await updateDoc(doc(db, 'stories', story.id), {
          collaboratorIds: arrayUnion(username)
      });
      toast({ title: `Collaborator ${username} added` });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/write')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Edit Manuscript</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{saveStatus}</span>
            <Button variant="destructive" size="sm" onClick={handleDeleteStory}>
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-4">
        {storyDetails ? (
          <div className="space-y-6">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Author Bio</h2>
                {!isEditingBio ? (
                  <Button variant="ghost" size="icon" onClick={() => setIsEditingBio(true)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleUpdateField('authorBio', '')}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => { setIsEditingBio(false); setBioInput(storyDetails.authorBio || ''); }}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
              
              {isEditingBio ? (
                <div className="space-y-3">
                  <Textarea 
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    placeholder="Tell your readers about yourself..."
                    className="min-h-[150px]"
                  />
                  <Button className="w-full" onClick={() => { handleUpdateField('authorBio', bioInput); setIsEditingBio(false); }}>
                    Save Bio
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground italic">
                  {storyDetails.authorBio || "No bio set yet."}
                </p>
              )}
            </section>

            <Separator />

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Chapters</h2>
                <Button size="sm" onClick={handleAddChapter} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Part
                </Button>
              </div>

              <div className="space-y-2">
                {storyDetails.chapters.map((ch) => (
                  <div key={ch.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div>
                      <h4 className="font-bold">{ch.title}</h4>
                      <p className="text-xs text-muted-foreground uppercase">{ch.status} • Part {ch.order}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/write/edit?storyId=${storyDetails.id}&chapterId=${ch.id}`)} className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteChapter(ch.id)}>
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin" />
          </div>
        )}
      </main>
    </div>
  );
}
