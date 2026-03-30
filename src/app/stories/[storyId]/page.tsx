
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
  Lock,
  ChevronDown
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

    const commentsQuery = query(collection(db, 'comments'), where('storyId', '==', storyId));
    const unsubscribeComments = onSnapshot(commentsQuery, (snapshot) => {
      setCommentCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching comment count:", error);
    });

    return () => {
      unsubscribeStory();
      unsubscribeComments();
    };
  }, [storyId, user, router, toast]);

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

  const handleScrollToDetails = () => {
    const element = document.getElementById('story-overview-details');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  const publishedChapters = story.chapters?.filter(ch => ch.status === 'Published' || ch.accessType === 'premium') || [];
  const totalPublishedChapters = publishedChapters.length;

  const isAuthorOrCollaborator = user && (story.author.id === user.id || story.collaborators?.some(c => c.id === user.id));
  const isInLibrary = user?.readingList?.some(item => item.id === story.id);
  const displayAuthor = authorInfo || story.author;

  const totalVotes = story.chapters?.reduce((acc, chapter) => acc + (chapter.votes || 0), 0) || 0;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start gap-6">
        <div className="relative w-32 md:w-40 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl group ring-1 ring-border/40">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            width={512}
            height={800}
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
            data-ai-hint={story.dataAiHint || "book cover"}
            priority
          />
           <button
            onClick={handleMoodMatcherClick}
            aria-label="Mood Matcher"
            className="absolute top-2 left-2 z-10 p-1.5 bg-black/50 backdrop-blur-md text-white rounded-full hover:bg-primary transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
            title="AI Mood Matcher"
            disabled={isMoodLoading}
          >
            {isMoodLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-col items-start flex-grow pt-2">
          <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground leading-tight tracking-tight mb-2">{story.title}</h1>
          <Link
            href={`/profile/${displayAuthor.id}`}
            className="inline-flex items-center gap-2.5 text-lg text-muted-foreground hover:text-primary transition-colors group"
          >
            <span className="font-semibold group-hover:underline">@{displayAuthor.username}</span>
          </Link>
        
          <div className="flex items-center gap-3 mt-6">
              <Button 
                size="lg" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 rounded-full shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]"
                onClick={handleScrollToDetails}
              >
                <BookOpen className="mr-2 h-5 w-5" /> Read
              </Button>
              <Button size="icon" variant="outline" className="h-12 w-12 rounded-full" onClick={handleLibraryAction} title={isInLibrary ? "In your library" : "Add to Library"} disabled={authLoading}>
                {authLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isInLibrary ? <BookmarkCheck className="h-5 w-5 text-primary" /> : <BookmarkPlus className="h-5 w-5" />}
              </Button>
              {isAuthorOrCollaborator && (
              <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                  <Button size="icon" variant="outline" className="h-12 w-12 rounded-full" title="Edit Story Details">
                  <Edit className="h-5 w-5" />
                  </Button>
              </Link>
              )}
          </div>
        </div>
      </div>


      <div className="grid grid-cols-4 items-start justify-center gap-x-2 sm:gap-x-4 text-center py-6 border-y border-border/40">
        <div className="flex flex-col items-center" title="Reads">
          <div className="flex items-center gap-1.5 text-foreground">
            <Eye className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{story.views ? (story.views / 1000).toFixed(1) + 'k' : '0'}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Total Reads</span>
        </div>
        <div className="flex flex-col items-center" title="Votes">
          <div className="flex items-center gap-1.5 text-foreground">
            <Star className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{totalVotes}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Fan Votes</span>
        </div>
         <div className="flex flex-col items-center" title="Comments">
             <div className="flex items-center gap-1.5 text-foreground">
                 <MessageSquare className="h-5 w-5 opacity-70" />
                 <strong className="text-2xl font-bold">{commentCount}</strong>
             </div>
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Comments</span>
         </div>
        <div className="flex flex-col items-center" title="Published Chapters">
          <div className="flex items-center gap-1.5 text-foreground">
            <ListOrdered className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{totalPublishedChapters}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Published</span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <Badge variant={story.status === 'Completed' ? 'secondary' : 'default'}
            className={cn(
                "mx-auto block w-fit px-4 py-1 text-[10px] uppercase font-bold tracking-[0.2em]",
                story.status === 'Completed' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700',
                (story.status === 'Ongoing' || story.status === 'Public') && 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700',
                story.status === 'Draft' && 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700/30 dark:text-gray-400 dark:border-gray-600',
                (story.visibility === 'Private' || story.visibility === 'Unlisted') && 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700'
            )}>
            {story.visibility === 'Public' && story.status !== 'Completed' && story.status !== 'Draft' ? 'Ongoing' : story.status || 'Public'}
        </Badge>
      </div>


      <div id="story-overview-details" className="prose prose-sm sm:prose-base dark:prose-invert max-w-none pt-4 scroll-mt-20">
        <h2 className="text-2xl font-headline font-bold mb-4 text-foreground flex items-center gap-2">
            Story Summary
            <ChevronDown className="h-5 w-5 text-primary animate-bounce" />
        </h2>
        <p className={cn(!isDescriptionExpanded && "line-clamp-6", "whitespace-pre-line text-muted-foreground leading-relaxed text-base")}>
          {story.summary || "No description available."}
        </p>
        {story.summary && story.summary.length > 300 && (
              <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-sm text-primary hover:underline font-bold uppercase tracking-widest mt-2">
                {isDescriptionExpanded ? "Show Less" : "Read Entire Blurb"}
            </Button>
        )}
      </div>

      <div className="mb-6">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 opacity-60">Categories & Tags</h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 rounded-lg px-3 py-1 font-bold text-xs uppercase tracking-tight">{story.genre}</Badge>
            {story.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs font-medium text-muted-foreground/80 hover:bg-muted transition-colors cursor-default">#{tag}</Badge>
            ))}
            {story.tags.length === 0 && <p className="text-xs text-muted-foreground italic">No tags listed.</p>}
        </div>
      </div>

      <Separator className="my-8 opacity-40" />

      <div>
        <h2 className="text-2xl font-headline font-bold mb-6 text-foreground flex items-center justify-between">
            <span>Manuscript & Chapters</span>
            <Badge variant="outline" className="text-[10px] font-bold px-2">{totalPublishedChapters} Parts</Badge>
        </h2>
        {publishedChapters.length > 0 ? (
          <div className="border border-border/40 rounded-3xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-inner">
            <ul className="space-y-0 divide-y divide-border/20">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} passHref>
                    <div className="group block p-5 hover:bg-primary/5 transition-all cursor-pointer">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate pr-2 flex items-center gap-3">
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted w-6 h-6 flex items-center justify-center rounded-full group-hover:bg-primary group-hover:text-white transition-colors">{chapter.order}</span>
                          {chapter.title}
                          {chapter.accessType === 'premium' && <Lock className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                        </span>
                        <div className="flex items-center gap-4">
                            {chapter.wordCount && (
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest hidden sm:inline">
                                    {Math.round(chapter.wordCount / 200) || 1} min read
                                </span>
                            )}
                            {chapter.publishedDate && (
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest hidden md:inline">
                                    {formatDate(chapter.publishedDate)}
                                </span>
                            )}
                            <Plus className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/10 rounded-3xl border border-dashed border-border/40">
            <ListOrdered className="h-10 w-10 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">This manuscript is currently being drafted.</p>
          </div>
        )}
      </div>
    </div>
  );
}
