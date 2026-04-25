
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
  ChevronDown
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
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) return null;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 space-y-8">
      <div className="flex items-start gap-6">
        <div className="relative w-32 md:w-40 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            width={512}
            height={800}
            className="w-full h-auto object-cover"
          />
        </div>

        <div className="flex flex-col items-start flex-grow pt-2">
          <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground leading-tight mb-2">{story.title}</h1>
          <Link href={`/profile/${story.author.id}`} className="inline-flex items-center gap-2.5 text-lg text-muted-foreground hover:text-primary transition-colors">
            <span className="font-semibold">@{story.author.username}</span>
          </Link>
          <div className="flex items-center gap-3 mt-6">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground h-12 px-8 rounded-full shadow-xl shadow-primary/20" onClick={handleReadClick}>
                <BookOpen className="mr-2 h-5 w-5" /> Read
              </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 items-start justify-center gap-x-2 text-center py-6 border-y border-border/40">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Eye className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{(story.views || 0).toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Total Reads</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <Star className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{story.chapters?.reduce((acc, c) => acc + (c.votes || 0), 0) || 0}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Fan Votes</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <MessageSquare className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{(commentCount || 0).toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Community Chat</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-foreground">
            <ListOrdered className="h-5 w-5 opacity-70" />
            <strong className="text-2xl font-bold">{(publishedChapters.length || 0).toLocaleString()}</strong>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Story Parts</span>
        </div>
      </div>
      
      <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none pt-4">
        <h2 className="text-2xl font-headline font-bold mb-4 text-foreground flex items-center gap-2">
            Description
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", isDescriptionExpanded && "rotate-180")} />
        </h2>
        <p className={cn(!isDescriptionExpanded && "line-clamp-5", "whitespace-pre-line text-muted-foreground leading-relaxed text-base")}>
          {story.summary || "No description available."}
        </p>
        {story.summary && story.summary.length > 200 && (
              <Button variant="link" onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} className="p-0 h-auto text-xs text-primary hover:underline font-bold uppercase tracking-widest mt-2">
                {isDescriptionExpanded ? "Show Less" : "Show More"}
            </Button>
        )}
      </div>

      <Separator className="my-8 opacity-40" />

      <div>
        <h2 className="text-2xl font-headline font-bold mb-6 text-foreground flex items-center justify-between">Chapters</h2>
        {publishedChapters.length > 0 ? (
          <div className="border border-border/40 rounded-3xl overflow-hidden bg-card/30 backdrop-blur-sm">
            <ul className="divide-y divide-border/20">
              {publishedChapters.sort((a, b) => a.order - b.order).map((chapter) => (
                <li key={chapter.id}>
                  <Link href={`/stories/${story.id}/read/${chapter.id}`} className="group block p-5 hover:bg-primary/5 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted w-6 h-6 flex items-center justify-center rounded-full">{chapter.order}</span>
                        {chapter.title}
                        {chapter.accessType === 'premium' && <Lock className="h-4 w-4 text-yellow-500" />}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-10">Drafting in progress...</p>
        )}
      </div>
    </div>
  );
}
