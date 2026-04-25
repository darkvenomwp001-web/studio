'use client';

import { useEffect, useState, useMemo } from 'react';
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
  ChevronDown,
  Share2
} from 'lucide-react';
import type { Story, UserSummary } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { getStoryMood } from '@/app/actions/aiActions';

export default function StoryOverviewClient({ storyId }: { storyId: string }) {
  const router = useRouter();
  const { user, addToLibrary, removeFromLibrary, authLoading } = useAuth();
  const { toast } = useToast();

  const [story, setStory] = useState<Story | null>(null);
  const [authorInfo, setAuthorInfo] = useState<UserSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMoodLoading, setIsMoodLoading] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  useEffect(() => {
    if (!storyId) return;

    setIsLoading(true);
    const storyDocRef = doc(db, 'stories', storyId);
    const unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = { id: docSnap.id, ...docSnap.data() } as Story;
            setStory(data);
            setAuthorInfo(data.author);
        }
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
  }, [storyId]);

  const publishedChapters = useMemo(() => {
    return story?.chapters?.filter(ch => ch.status === 'Published' || ch.accessType === 'premium') || [];
  }, [story]);

  const handleReadClick = () => {
    if (!story) return;
    const firstChapter = publishedChapters.sort((a, b) => a.order - b.order)[0];
    if (firstChapter) {
      router.push(`/stories/${story.id}/read/${firstChapter.id}`);
    } else {
      toast({ title: "Draft in progress", description: "This story doesn't have any published parts yet." });
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

  const handleMoodMatcherClick = async () => {
    if (!story) return;
    setIsMoodLoading(true);

    const result = await getStoryMood({ title: story.title, summary: story.summary, tags: story.tags });
    
    if ('error' in result) {
      toast({
        title: "Vibe Check Failed",
        description: "Couldn't determine the mood right now.",
        variant: "destructive",
      });
    } else {
       toast({
        title: "Story Vibe Identified",
        description: `This story has a "${result.mood}" mood. Similar stories feature coming soon!`,
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

  if (!story) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <Info className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-headline font-bold">Story Not Found</h2>
        <p className="text-muted-foreground mt-2">The manuscript you're looking for might be private or deleted.</p>
        <Button onClick={() => router.push('/')} variant="outline" className="mt-6 rounded-full">Go Home</Button>
    </div>
  );

  const isInLibrary = user?.readingList?.some(item => item.id === story.id);
  const totalVotes = story.chapters?.reduce((acc, chapter) => acc + (chapter.votes || 0), 0) || 0;
  const isOwner = user && story.author.id === user.id;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
        <div className="relative w-40 sm:w-48 flex-shrink-0 rounded-2xl overflow-hidden shadow-2xl group ring-1 ring-border/40">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            width={512}
            height={800}
            className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
            data-ai-hint="book cover"
          />
           <button
            onClick={handleMoodMatcherClick}
            className="absolute top-2 left-2 z-10 p-2 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-primary transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
            title="AI Mood Matcher"
            disabled={isMoodLoading}
          >
            {isMoodLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex flex-col items-center sm:items-start flex-grow text-center sm:text-left pt-2">
          <div className="space-y-1 mb-4">
            <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground leading-tight tracking-tight">{story.title}</h1>
            <Link href={`/profile/${story.author.id}`} className="inline-flex items-center gap-2 text-lg text-muted-foreground hover:text-primary transition-colors font-medium">
                <span>by</span>
                <span className="font-bold text-foreground hover:underline">@{story.author.username}</span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-8">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{story.genre}</Badge>
              <Badge variant="outline" className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                  story.status === 'Completed' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
              )}>{story.status || 'Ongoing'}</Badge>
              {story.visibility !== 'Public' && (
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{story.visibility}</Badge>
              )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button size="lg" className="flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-10 rounded-full shadow-xl shadow-primary/20 text-lg font-bold" onClick={handleReadClick}>
                <BookOpen className="mr-2 h-5 w-5" /> Start Reading
              </Button>
              <Button size="icon" variant="outline" className="rounded-full h-12 w-12 border-border/60 hover:bg-muted" onClick={handleLibraryAction} title={isInLibrary ? "In Library" : "Add to Library"}>
                {isInLibrary ? <BookmarkCheck className="h-6 w-6 text-primary" /> : <BookmarkPlus className="h-6 w-6 text-muted-foreground" />}
              </Button>
              {isOwner && (
                <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12 border-border/60 hover:bg-muted" title="Manage Manuscript">
                        <Edit className="h-5 w-5 text-muted-foreground" />
                    </Button>
                </Link>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 items-start justify-center gap-x-2 text-center py-8 border-y border-border/40 bg-card/30 rounded-2xl">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Eye className="h-5 w-5 text-primary/60" />
            <strong className="text-2xl font-bold">{(story.views || 0).toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Reads</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Star className="h-5 w-5 text-yellow-500/60" />
            <strong className="text-2xl font-bold">{totalVotes.toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Votes</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <MessageSquare className="h-5 w-5 text-accent/60" />
            <strong className="text-2xl font-bold">{(commentCount || 0).toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Chat</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <ListOrdered className="h-5 w-5 text-purple-500/60" />
            <strong className="text-2xl font-bold">{(publishedChapters.length || 0).toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Parts</span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-foreground tracking-tight">Summary</h2>
            {story.summary && story.summary.length > 250 && (
                <Button variant="ghost" size="sm" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="text-primary font-bold text-[10px] uppercase tracking-widest gap-1">
                    {isDescriptionExpanded ? "Show Less" : "Show More"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", isDescriptionExpanded && "rotate-180")} />
                </Button>
            )}
        </div>
        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none">
            <p className={cn(
                "whitespace-pre-line text-muted-foreground leading-relaxed text-base transition-all duration-300",
                !isDescriptionExpanded && "line-clamp-4"
            )}>
            {story.summary || "This author hasn't provided a summary for this manuscript yet."}
            </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
            {story.tags?.map(tag => (
                <Badge key={tag} variant="secondary" className="bg-muted text-muted-foreground hover:text-primary transition-colors text-[10px] font-medium px-3 rounded-full cursor-pointer">#{tag}</Badge>
            ))}
        </div>
      </div>

      <Separator className="opacity-40" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-foreground tracking-tight">Table of Contents</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-3 py-1 rounded-full">{publishedChapters.length} Published Parts</span>
        </div>
        
        {publishedChapters.length > 0 ? (
          <div className="border border-border/40 rounded-3xl overflow-hidden bg-card/30 backdrop-blur-sm shadow-inner">
            <ul className="divide-y divide-border/20">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} className="group block p-6 hover:bg-primary/5 transition-all">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="flex-shrink-0 text-[10px] font-bold text-muted-foreground bg-muted w-8 h-8 flex items-center justify-center rounded-full shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">{chapter.order}</span>
                        <div className="min-w-0">
                            <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-2 truncate">
                                {chapter.title}
                                {chapter.accessType === 'premium' && <Lock className="h-3.5 w-3.5 text-yellow-500" />}
                            </span>
                            {chapter.wordCount && (
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter mt-0.5">{Math.round(chapter.wordCount / 200) || 1} minute read</p>
                            )}
                        </div>
                      </div>
                      <ChevronDown className="h-5 w-5 text-muted-foreground/30 -rotate-90 group-hover:text-primary transition-all group-hover:translate-x-1" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-border/40">
              <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Drafting in progress...</p>
          </div>
        )}
      </div>

      <footer className="pt-10 pb-20 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">&bull; End of Overview &bull;</p>
      </footer>
    </div>
  );
}
