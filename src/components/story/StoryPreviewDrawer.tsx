'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  Eye,
  ListOrdered,
  Loader2,
  Info,
  Edit,
  Sparkles,
  Star,
  MessageSquare,
  BookmarkPlus,
  BookmarkCheck,
  Lock,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import type { Story, UserSummary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn, formatCompactNumber } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { useStoryPreview } from '@/context/StoryPreviewProvider';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useRouter } from 'next/navigation';

function StoryPreviewContent({ storyId }: { storyId: string }) {
  const { user, addToLibrary, removeFromLibrary, authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { onClose } = useStoryPreview();

  const [story, setStory] = useState<Story | null>(null);
  const [authorInfo, setAuthorInfo] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    if (!storyId) {
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    
    const storyDocRef = doc(db, 'stories', storyId);
    const unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Story;

            const canView = 
                data.visibility === 'Public' ||
                data.visibility === 'Unlisted' ||
                (data.visibility === 'Private' && user && (data.author.id === user.id || data.collaborators?.some(c => c.id === user.id))) ||
                (data.status === 'Draft' && user && (data.author.id === user.id || data.collaborators?.some(c => c.id === user.id)));

            if (canView) {
                setStory(data);
                setAuthorInfo(data.author);
            } else {
                setStory(null);
                onClose();
            }
        } else {
            setStory(null);
            onClose(); // Automatically close if story doesn't exist
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching story data:", error);
        setIsLoading(false);
    });

    const commentsQuery = query(collection(db, 'comments'), where('storyId', '==', storyId));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setCommentCount(snapshot.size);
    });

    return () => {
      unsubscribeStory();
      unsubscribeComments();
    };
  }, [storyId, user, onClose, toast]);

  const publishedChapters = useMemo(() => {
    return story?.chapters?.filter(ch => ch.status === 'Published' || ch.accessType === 'premium') || [];
  }, [story]);

  const handleReadClick = () => {
    if (!story) return;
    const firstChapter = publishedChapters.sort((a, b) => a.order - b.order)[0];
    if (firstChapter) {
      onClose(); 
      router.push(`/stories/${story.id}/read/${firstChapter.id}`);
    } else {
      toast({ title: "No chapters published" });
    }
  };

  const handleLibraryAction = () => {
    if (!story) return;
    if (!user) {
        router.push('/auth/signin');
        return;
    }

    const isInLibrary = user.readingList?.some(item => item.id === story.id);
    if (isInLibrary) {
      removeFromLibrary(story.id);
    } else {
      addToLibrary(story);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) return null;
  
  const totalPublishedChapters = publishedChapters.length;
  const isAuthorOrCollaborator = user && (story.author.id === user.id || story.collaborators?.some(c => c.id === user.id));
  const isInLibrary = user?.readingList?.some(item => item.id === story.id);
  const totalVotes = story.chapters?.reduce((acc, chapter) => acc + (chapter.votes || 0), 0) || 0;

  return (
    <div className="space-y-6 p-4 pt-0">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative w-32 sm:w-28 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            width={512}
            height={800}
            className="w-full h-auto object-cover"
            data-ai-hint="book cover"
          />
        </div>

        <div className="flex flex-col items-center sm:items-start flex-grow text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground leading-tight">{story.title}</h1>
          <Link
            href={`/profile/${story.author.id}`}
            className="inline-flex items-center gap-2.5 text-md text-muted-foreground hover:text-primary transition-colors group mt-1"
          >
            <span className="font-medium group-hover:underline">@{story.author.username}</span>
          </Link>
        
          <div className="flex items-center gap-2 mt-4">
              <Button size="lg" onClick={handleReadClick} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-full px-8">
                <BookOpen className="mr-2 h-5 w-5" /> Read
              </Button>
              <Button size="icon" variant="outline" className="rounded-full h-11 w-11" onClick={handleLibraryAction}>
                {isInLibrary ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <BookmarkPlus className="h-5 w-5" />}
              </Button>
              {isAuthorOrCollaborator && (
                <Link href={`/write/edit-details?storyId=${story.id}`} onClick={onClose} passHref>
                    <Button size="icon" variant="outline" className="rounded-full h-11 w-11">
                    <Edit className="h-5 w-5" />
                    </Button>
                </Link>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-x-2 text-center py-4 border-y border-border/40">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-foreground">
            <Eye className="h-4 w-4 opacity-70" />
            <strong className="text-lg font-bold">{formatCompactNumber(story.views || 0)}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Reads</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-foreground">
            <Star className="h-4 w-4 opacity-70" />
            <strong className="text-lg font-bold">{formatCompactNumber(totalVotes)}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Votes</span>
        </div>
         <div className="flex flex-col items-center">
             <div className="flex items-center gap-1 text-foreground">
                 <MessageSquare className="h-4 w-4 opacity-70" />
                 <strong className="text-lg font-bold">{formatCompactNumber(commentCount)}</strong>
             </div>
             <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Chat</span>
         </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-foreground">
            <ListOrdered className="h-4 w-4 opacity-70" />
            <strong className="text-lg font-bold">{formatCompactNumber(totalPublishedChapters)}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Parts</span>
        </div>
      </div>
      
      <div className="prose prose-sm dark:prose-invert max-w-none pt-4">
        <p className={cn(!isDescriptionExpanded && "line-clamp-5", "whitespace-pre-line text-muted-foreground leading-relaxed")}>
          {story.summary || "No description available."}
        </p>
        {story.summary && story.summary.length > 200 && (
              <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-xs text-primary font-bold uppercase">
                {isDescriptionExpanded ? "Show Less" : "Show More"}
            </Button>
        )}
      </div>

      <Separator className="opacity-40" />

      <div>
        <h2 className="text-lg font-headline font-bold mb-4">Table of Contents</h2>
        {publishedChapters.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden bg-card/50">
            <ul className="divide-y divide-border/40">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} onClick={onClose} passHref>
                    <div className="block p-4 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                          {chapter.order}. {chapter.title}
                          {chapter.accessType === 'premium' && <Lock className="h-3 w-3 text-yellow-500 inline ml-2" />}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary" />
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10 bg-muted/20 rounded-2xl border border-dashed text-sm">No chapters published yet.</p>
        )}
      </div>
    </div>
  )
}


export default function StoryPreviewDrawer() {
  const { storyId, isOpen, onClose } = useStoryPreview();

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh] border-none rounded-t-[32px] bg-background">
        <div className="mx-auto w-full max-w-lg">
             <div className="mx-auto mt-4 w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20" />
            <div className="h-[80vh] mt-4">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Story Preview</DrawerTitle>
                    <DrawerDescription>Manuscript Overview</DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="h-full px-2">
                    {storyId && <StoryPreviewContent storyId={storyId} />}
                </ScrollArea>
            </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
