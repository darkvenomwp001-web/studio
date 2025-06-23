
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Plus,
  Loader2,
  Info,
  Edit,
  Sparkles,
  Star,
  MessageSquare,
  BookmarkPlus,
  BookmarkCheck,
  Lock
} from 'lucide-react';
import { formatDate } from '@/lib/placeholder-data';
import type { Story, UserSummary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getStoryMood } from '@/app/actions/aiActions';

export default function StoryOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { user, addToLibrary, removeFromLibrary, authLoading } = useAuth();
  const { toast } = useToast();
  const storyId = Array.isArray(params.storyId) ? params.storyId[0] : params.storyId;

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
    
    // Real-time listener for the story document
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
                setAuthorInfo(data.author); // Set initial author info from story data
            } else {
                setStory(null);
                toast({ title: "Access Denied", description: "You don't have permission to view this story.", variant: "destructive" });
                router.push('/stories');
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

    // Real-time listener for comment count
    const commentsQuery = query(collection(db, 'comments'), where('storyId', '==', storyId));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setCommentCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching comment count:", error);
      // Don't toast here as it could be annoying if it keeps failing
    });

    // Cleanup function to unsubscribe from listeners when the component unmounts
    return () => {
      unsubscribeStory();
      unsubscribeComments();
    };
  }, [storyId, user, router, toast]);

  // New useEffect to listen for real-time author updates
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
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] text-center px-4">
        <Info className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Story Not Found</h1>
        <p className="text-muted-foreground mb-6">The story you're looking for doesn't exist or you may not have permission to view it.</p>
        <Link href="/stories" passHref>
          <Button variant="outline">Back to Stories</Button>
        </Link>
      </div>
    );
  }

  const firstChapterId = story.chapters?.find(ch => ch.status === 'Published')?.id;
  const publishedChapters = story.chapters?.filter(ch => ch.status === 'Published' || ch.accessType === 'premium') || [];
  const totalPublishedChapters = publishedChapters.length;

  const isAuthorOrCollaborator = user && (story.author.id === user.id || story.collaborators?.some(c => c.id === user.id));
  const isInLibrary = user?.readingList?.some(item => item.id === story.id);
  const displayAuthor = authorInfo || story.author; // Use live author info if available, otherwise fallback to story's data

  const totalVotes = story.chapters?.reduce((acc, chapter) => acc + (chapter.votes || 0), 0) || 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-8">
       <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative aspect-[2/3] w-full max-w-[240px] rounded-lg overflow-hidden shadow-2xl group">
          <Image
            src={story.coverImageUrl || `https://placehold.co/512x800.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            data-ai-hint={story.dataAiHint || "book cover"}
            priority
          />
          <button
            onClick={handleMoodMatcherClick}
            aria-label="Mood Matcher"
            className="absolute top-3 left-3 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-primary/80 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
            title="AI Mood Matcher (Find similar vibes)"
            disabled={isMoodLoading}
          >
            {isMoodLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          </button>
        </div>

        <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">{story.title}</h1>
        <Link
          href={`/profile/${displayAuthor.id}`}
          className="inline-flex items-center gap-2.5 text-md text-muted-foreground hover:text-primary transition-colors group"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={displayAuthor.avatarUrl} alt={displayAuthor.username} data-ai-hint="profile person" />
            <AvatarFallback>{displayAuthor.username?.substring(0, 1).toUpperCase() || 'A'}</AvatarFallback>
          </Avatar>
          <span className="font-medium group-hover:underline">{displayAuthor.displayName || displayAuthor.username}</span>
        </Link>
      
        <div className="flex justify-center items-center gap-2">
            {firstChapterId ? (
            <Link href={`/stories/${story.id}/read/${firstChapterId}`} passHref>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <BookOpen className="mr-2 h-5 w-5" /> Start Reading
                </Button>
            </Link>
            ) : (
            <Button size="lg" disabled>
                <BookOpen className="mr-2 h-5 w-5" /> No Chapters Yet
            </Button>
            )}
            <Button size="icon" variant="outline" onClick={handleLibraryAction} title={isInLibrary ? "In your library" : "Add to Library"} disabled={authLoading}>
              {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isInLibrary ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <BookmarkPlus className="h-5 w-5" />}
            </Button>
            {isAuthorOrCollaborator && (
            <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                <Button size="icon" variant="outline" title="Edit Story Details">
                <Edit className="h-5 w-5" />
                </Button>
            </Link>
            )}
        </div>
      </div>

      <div className="grid grid-cols-4 items-start justify-center gap-x-2 sm:gap-x-4 text-center py-4 border-y">
        <div className="flex flex-col items-center" title="Reads">
          <div className="flex items-center gap-1.5 text-foreground">
            <Eye className="h-5 w-5" />
            <strong className="text-xl font-bold">{story.views ? (story.views / 1000).toFixed(1) + 'k' : '0'}</strong>
          </div>
          <span className="text-xs text-muted-foreground mt-1">Reads</span>
        </div>
        <div className="flex flex-col items-center" title="Votes">
          <div className="flex items-center gap-1.5 text-foreground">
            <Star className="h-5 w-5" />
            <strong className="text-xl font-bold">{totalVotes}</strong>
          </div>
          <span className="text-xs text-muted-foreground mt-1">Votes</span>
        </div>
         <div className="flex flex-col items-center" title="Comments">
             <div className="flex items-center gap-1.5 text-foreground">
                 <MessageSquare className="h-5 w-5" />
                 <strong className="text-xl font-bold">{commentCount}</strong>
             </div>
             <span className="text-xs text-muted-foreground mt-1">Comments</span>
         </div>
        <div className="flex flex-col items-center" title="Published Chapters">
          <div className="flex items-center gap-1.5 text-foreground">
            <ListOrdered className="h-5 w-5" />
            <strong className="text-xl font-bold">{totalPublishedChapters}</strong>
          </div>
          <span className="text-xs text-muted-foreground mt-1">Parts</span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant={story.status === 'Completed' ? 'secondary' : 'default'}
            className={cn(
                "mx-auto block w-fit",
                story.status === 'Completed' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
                (story.status === 'Ongoing' || story.status === 'Public') && 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
                story.status === 'Draft' && 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600',
                (story.visibility === 'Private' || story.visibility === 'Unlisted') && 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700'
            )}>
            {story.visibility === 'Public' && story.status !== 'Completed' && story.status !== 'Draft' ? 'Ongoing' : story.status || 'Public'}
        </Badge>
      </div>


      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none pt-4">
        <h2 className="text-xl font-headline font-semibold mb-2 text-foreground">Description</h2>
        <p className={cn(!isDescriptionExpanded && "line-clamp-5", "whitespace-pre-line text-muted-foreground")}>
          {story.summary || "No description available."}
        </p>
        {story.summary && story.summary.length > 200 && (
              <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-sm text-primary hover:underline">
                {isDescriptionExpanded ? "Show Less" : "Show More"}
            </Button>
        )}
      </div>

      <div className="mb-6">
          <h3 className="text-lg font-headline font-semibold mb-2 text-foreground">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {story.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
            ))}
            {story.tags.length === 0 && <p className="text-xs text-muted-foreground">No tags for this story.</p>}
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <h2 className="text-xl font-headline font-semibold mb-3 text-foreground">Table of Contents ({totalPublishedChapters} Published Parts)</h2>
        {publishedChapters.length > 0 ? (
          <ScrollArea className="max-h-[400px] pr-3 border rounded-md">
            <ul className="space-y-0 divide-y divide-border">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} passHref>
                    <div className="block p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-foreground truncate pr-2 flex items-center gap-2">
                          Part {chapter.order}: {chapter.title}
                          {chapter.accessType === 'premium' && <Lock className="h-3 w-3 text-yellow-500 flex-shrink-0" titleAccess="Premium Chapter" />}
                        </span>
                        {chapter.publishedDate && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {formatDate(chapter.publishedDate)}
                          </span>
                        )}
                      </div>
                      {chapter.wordCount && (
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            {Math.round(chapter.wordCount / 200) || 1} min read
                          </span>
                        )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </ScrollArea>
        ) : (
          <p className="text-muted-foreground text-center py-4 border rounded-md">No chapters published yet for this story.</p>
        )}
      </div>
    </div>
  );
}
