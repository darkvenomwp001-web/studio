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
  ChevronRight
} from 'lucide-react';
import { formatDate } from '@/lib/placeholder-data';
import type { Story, UserSummary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getStoryMood } from '@/app/actions/aiActions';
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
  const [isMoodLoading, setIsMoodLoading] = useState(false);
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
                toast({ title: "Access Denied", description: "You don't have permission to view this story.", variant: "destructive" });
                onClose();
            }
        } else {
            setStory(null);
            toast({ title: "Story Not Found", description: "The story you're looking for doesn't exist.", variant: "destructive" });
        }
        setIsLoading(false);
    }, (error) => {
        console.error("Error fetching story data:", error);
        toast({ title: "Error", description: "Could not load story details.", variant: "destructive" });
        setIsLoading(false);
    });

    const commentsQuery = query(collection(db, 'comments'), where('storyId', '==', storyId));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setCommentCount(snapshot.size);
    }, console.error);

    return () => {
      unsubscribeStory();
      unsubscribeComments();
    };
  }, [storyId, user, onClose, toast]);

  useEffect(() => {
    if (!story?.author?.id) return;

    const authorDocRef = doc(db, 'users', story.author.id);
    const unsubscribeAuthor = onSnapshot(authorDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const authorData = docSnap.data() as UserSummary;
        setAuthorInfo({
            id: docSnap.id,
            username: authorData.username,
            displayName: authorData.displayName,
            avatarUrl: authorData.avatarUrl
        });
      }
    });

    return () => unsubscribeAuthor();
  }, [story?.author?.id]);

  const publishedChapters = useMemo(() => {
    return story?.chapters?.filter(ch => ch.status === 'Published' || ch.accessType === 'premium') || [];
  }, [story]);

  const handleReadClick = () => {
    if (!story) return;
    const firstChapter = publishedChapters.sort((a, b) => a.order - b.order)[0];
    if (firstChapter) {
      onClose(); // Close drawer
      router.push(`/stories/${story.id}/read/${firstChapter.id}`);
    } else {
      toast({ title: "No chapters published", description: "This story doesn't have any published parts yet." });
    }
  };

  const handleLibraryAction = () => {
    if (!story) return;
    if (!user) {
        toast({ title: "Please Sign In", description: "You must be logged in to manage your library.", variant: "destructive"});
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
  
  const handleMoodMatcherClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!story) return;
    setIsMoodLoading(true);

    const result = await getStoryMood({ title: story.title, summary: story.summary, tags: story.tags });
    
    if ('error' in result) {
      toast({
        title: "Mood Matcher Error",
        description: `Couldn't determine the mood: ${result.error}`,
        variant: "destructive",
      });
    } else {
       toast({
        title: "Story Vibe",
        description: `This story has a "${result.mood}" mood. Feature to find similar stories coming soon!`,
      });
    }
    setIsMoodLoading(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh] text-center px-4">
        <Info className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Story Not Found</h1>
        <p className="text-muted-foreground mb-6">The story you're looking for doesn't exist or you may not have permission to view it.</p>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    );
  }
  
  const totalPublishedChapters = publishedChapters.length;
  const isAuthorOrCollaborator = user && (story.author.id === user.id || story.collaborators?.some(c => c.id === user.id));
  const isInLibrary = user?.readingList?.some(item => item.id === story.id);
  const displayAuthor = authorInfo || story.author;
  const totalVotes = story.chapters?.reduce((acc, chapter) => acc + (chapter.votes || 0), 0) || 0;

  return (
    <div className="space-y-6 p-4 pt-0">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="relative w-32 sm:w-28 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl group">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            width={512}
            height={800}
            className="w-full h-auto object-cover"
            data-ai-hint={story.dataAiHint || "book cover"}
            priority
          />
           <button
            onClick={handleMoodMatcherClick}
            aria-label="Mood Matcher"
            className="absolute top-1 left-1 z-10 p-1 bg-black/50 text-white rounded-full hover:bg-primary/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            title="AI Mood Matcher (Find similar vibes)"
            disabled={isMoodLoading}
          >
            {isMoodLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-col items-center sm:items-start flex-grow text-center sm:text-left">
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground leading-tight">{story.title}</h1>
          <Link
            href={`/profile/${displayAuthor.id}`}
            className="inline-flex items-center gap-2.5 text-md text-muted-foreground hover:text-primary transition-colors group mt-1"
          >
            <span className="font-medium group-hover:underline">{displayAuthor.displayName || displayAuthor.username}</span>
          </Link>
        
          <div className="flex items-center gap-2 mt-4">
              <Button 
                size="lg" 
                onClick={handleReadClick}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 rounded-full px-8"
              >
                <BookOpen className="mr-2 h-5 w-5" /> Read
              </Button>
              <Button size="icon" variant="outline" className="rounded-full h-11 w-11" onClick={handleLibraryAction} title={isInLibrary ? "In your library" : "Add to Library"} disabled={authLoading}>
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isInLibrary ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <BookmarkPlus className="h-5 w-5" />}
              </Button>
              {isAuthorOrCollaborator && (
              <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                  <Button size="icon" variant="outline" className="rounded-full h-11 w-11" title="Edit Story Details">
                  <Edit className="h-5 w-5" />
                  </Button>
              </Link>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 items-start justify-center gap-x-2 sm:gap-x-4 text-center py-4 border-y border-border/40">
        <div className="flex flex-col items-center" title="Reads">
          <div className="flex items-center gap-1 text-foreground">
            <Eye className="h-4 w-4 opacity-70" />
            <strong className="text-lg font-bold">{story.views ? (story.views / 1000).toFixed(1) + 'k' : '0'}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Reads</span>
        </div>
        <div className="flex flex-col items-center" title="Votes">
          <div className="flex items-center gap-1 text-foreground">
            <Star className="h-4 w-4 opacity-70" />
            <strong className="text-lg font-bold">{totalVotes}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Votes</span>
        </div>
         <div className="flex flex-col items-center" title="Comments">
             <div className="flex items-center gap-1 text-foreground">
                 <MessageSquare className="h-4 w-4 opacity-70" />
                 <strong className="text-lg font-bold">{commentCount}</strong>
             </div>
             <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Chat</span>
         </div>
        <div className="flex flex-col items-center" title="Published Chapters">
          <div className="flex items-center gap-1 text-foreground">
            <ListOrdered className="h-4 w-4 opacity-70" />
            <strong className="text-lg font-bold">{totalPublishedChapters}</strong>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mt-1">Parts</span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant={story.status === 'Completed' ? 'secondary' : 'default'}
            className={cn(
                "mx-auto block w-fit text-[10px] uppercase tracking-widest px-3 py-1",
                story.status === 'Completed' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
                (story.status === 'Ongoing' || story.status === 'Public') && 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
                story.status === 'Draft' && 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600',
                (story.visibility === 'Private' || story.visibility === 'Unlisted') && 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700'
            )}>
            {story.visibility === 'Public' && story.status !== 'Completed' && story.status !== 'Draft' ? 'Ongoing' : story.status || 'Public'}
        </Badge>
      </div>

      <div id="story-details-target" className="prose prose-sm dark:prose-invert max-w-none pt-4 scroll-mt-6">
        <h2 className="text-lg font-headline font-bold mb-2 text-foreground flex items-center gap-2">
            Description
            <ChevronDown className="h-4 w-4 text-muted-foreground animate-bounce" />
        </h2>
        <p className={cn(!isDescriptionExpanded && "line-clamp-5", "whitespace-pre-line text-muted-foreground leading-relaxed")}>
          {story.summary || "No description available."}
        </p>
        {story.summary && story.summary.length > 200 && (
              <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-xs text-primary hover:underline font-bold uppercase tracking-widest">
                {isDescriptionExpanded ? "Show Less" : "Show More"}
            </Button>
        )}
      </div>

      <div className="mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Discoverability</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tight bg-muted/30">{story.genre}</Badge>
            {story.tags.map(tag => (
                <Badge key={tag} variant="ghost" className="text-[10px] font-medium text-muted-foreground">#{tag}</Badge>
            ))}
        </div>
      </div>

      <Separator className="opacity-40" />

      <div>
        <h2 className="text-lg font-headline font-bold mb-4 text-foreground flex items-center justify-between">
            <span>Table of Contents</span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">{totalPublishedChapters} Parts</span>
        </h2>
        {publishedChapters.length > 0 ? (
          <div className="border rounded-2xl overflow-hidden bg-card/50">
            <ul className="space-y-0 divide-y divide-border/40">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} onClick={onClose} passHref>
                    <div className="block p-4 hover:bg-primary/5 transition-all cursor-pointer group">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate pr-2 flex items-center gap-2">
                          {chapter.order}. {chapter.title}
                          {chapter.accessType === 'premium' && <Lock className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                        </span>
                        <div className="flex items-center gap-3">
                            {chapter.wordCount && (
                                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter hidden xs:inline">
                                    {Math.round(chapter.wordCount / 200) || 1} min
                                </span>
                            )}
                            <Badge variant="ghost" className="h-6 w-6 rounded-full group-hover:bg-primary/10 group-hover:text-primary p-0 flex items-center justify-center">
                                <ChevronRight className="h-3 w-3" />
                            </Badge>
                        </div>
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
      <DrawerContent className="max-h-[95vh] border-none rounded-t-[32px] bg-background">
        <div className="mx-auto w-full max-w-lg" role="dialog" aria-modal="true">
             <div className="mx-auto mt-4 w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20" />
            <div className="h-[85vh] mt-4">
                <DrawerHeader className="sr-only">
                    <DrawerTitle>Story Preview</DrawerTitle>
                    <DrawerDescription>An overview of the selected story.</DrawerDescription>
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