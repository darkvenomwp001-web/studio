'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, FormEvent, useCallback } from 'react';
import type { Story, User as AppUser } from '@/types'; 
import StoryCard from '@/components/shared/StoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Search as SearchIcon, Loader2, X } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Debounce function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): Promise<ReturnType<F>> =>
    new Promise(resolve => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => resolve(func(...args)), waitFor);
    });
}

export default function SearchResultsPage() {
  const searchParamsHook = useSearchParams();
  const router = useRouter();
  const queryFromUrl = searchParamsHook.get('q') || '';
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState(queryFromUrl);
  const [storyResults, setStoryResults] = useState<Story[]>([]);
  const [userResults, setUserResults] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = async (currentQuery: string) => {
    if (!currentQuery.trim()) {
      setStoryResults([]);
      setUserResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setStoryResults([]); // Clear previous results
    setUserResults([]);   // Clear previous results

    try {
      // Search Stories by title (prefix match for public stories)
      const storiesRef = collection(db, 'stories');
      const storyQuery = query(
        storiesRef,
        where('visibility', '==', 'Public'),
        where('title', '>=', currentQuery.trim()),
        where('title', '<=', currentQuery.trim() + '\uf8ff'),
        orderBy('title'),
        limit(12)
      );
      const storySnapshot = await getDocs(storyQuery);
      const storiesFound = storySnapshot.docs.map(doc => {
        const data = doc.data();
        const authorSummary = data.author 
        ? { id: data.author.id || 'unknown', username: data.author.username || 'Unknown Author', displayName: data.author.displayName, avatarUrl: data.author.avatarUrl }
        : { id: 'unknown', username: 'Unknown Author', displayName: 'Unknown Author' };

        return { 
            id: doc.id, 
            ...data,
            author: authorSummary,
            lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
            chapters: data.chapters || [],
            tags: data.tags || [],
            } as Story;
      });
      setStoryResults(storiesFound);

      // Search Users by username (prefix match)
      const usersRef = collection(db, 'users');
      const usernameQuery = query(
        usersRef,
        where('username', '>=', currentQuery.trim()),
        where('username', '<=', currentQuery.trim() + '\uf8ff'),
        orderBy('username'),
        limit(8)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      const usersByUsername = usernameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));

      // Search Users by displayName (prefix match)
      const displayNameQuery = query(
        usersRef,
        where('displayName', '>=', currentQuery.trim()),
        where('displayName', '<=', currentQuery.trim() + '\uf8ff'),
        orderBy('displayName'),
        limit(8)
      );
      const displayNameSnapshot = await getDocs(displayNameQuery);
      const usersByDisplayName = displayNameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      
      // Merge and deduplicate user results
      const combinedUsers = new Map<string, AppUser>();
      usersByUsername.forEach(user => combinedUsers.set(user.id, user));
      usersByDisplayName.forEach(user => combinedUsers.set(user.id, user)); 
      
      setUserResults(Array.from(combinedUsers.values()).slice(0,8));

    } catch (error) {
      console.error("Error performing search:", error);
      toast({ title: "Search Error", description: "Could not perform search. Ensure Firestore indexes are set up if prompted.", variant: "destructive" });
      setStoryResults([]);
      setUserResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce(performSearch, 500), [toast]);

  useEffect(() => {
    setSearchTerm(queryFromUrl); 
    if (queryFromUrl.trim()) {
      setIsLoading(true);
      debouncedSearch(queryFromUrl);
    } else {
      setStoryResults([]);
      setUserResults([]);
      setIsLoading(false);
    }
  }, [queryFromUrl, debouncedSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setSearchTerm(newQuery);
    const trimmedQuery = newQuery.trim();
    if (trimmedQuery) {
      setIsLoading(true);
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`, { scroll: false });
    } else {
      setStoryResults([]);
      setUserResults([]);
      setIsLoading(false);
      router.push('/search', { scroll: false }); 
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setStoryResults([]);
    setUserResults([]);
    setIsLoading(false);
    router.push('/search', { scroll: false });
  };
  
  const noResultsFound = !isLoading && searchTerm.trim() !== '' && storyResults.length === 0 && userResults.length === 0;

  return (
    <div className="space-y-6">
      <header className="sticky top-16 z-30 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-3 border-b mb-6">
        <div className="relative max-w-xl mx-auto">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Search stories and authors..." 
            className="w-full text-base h-12 px-10 rounded-full bg-muted focus-visible:ring-primary focus-visible:bg-background"
            value={searchTerm}
            onChange={handleInputChange}
            aria-label="Search query"
          />
          {searchTerm && (
             <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" onClick={handleClearSearch}>
                <X className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </header>

      {isLoading && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      )}

      {!isLoading && !searchTerm.trim() && (
         <div className="text-center py-16 px-4">
          <SearchIcon className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-headline font-semibold">Find Your Next Story</h2>
          <p className="text-muted-foreground">Search for stories, authors, or topics.</p>
        </div>
      )}

      {noResultsFound && (
        <div className="text-center py-16 px-4 bg-card rounded-lg shadow-sm">
          <h2 className="text-xl font-headline font-semibold mb-2">No Results Found</h2>
          <p className="text-muted-foreground">We couldn't find anything for "{searchTerm}". Try another search.</p>
        </div>
      )}
      
      {!isLoading && (storyResults.length > 0 || userResults.length > 0) && (
        <Tabs defaultValue="stories" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                <TabsTrigger value="stories" disabled={storyResults.length === 0}>
                    <BookOpen className="mr-2 h-4 w-4" /> Stories ({storyResults.length})
                </TabsTrigger>
                <TabsTrigger value="authors" disabled={userResults.length === 0}>
                    <Users className="mr-2 h-4 w-4" /> Authors ({userResults.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="stories" className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {storyResults.map(story => (
                    <StoryCard key={story.id} story={story} />
                    ))}
                </div>
            </TabsContent>

            <TabsContent value="authors" className="mt-6">
                 <div className="grid grid-cols-1 gap-4">
                    {userResults.map(author => (
                    <Link href={`/profile/${author.id}`} key={author.id} passHref>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer hover:bg-muted/50">
                        <CardContent className="p-3 flex items-center gap-4">
                            <Avatar className="w-14 h-14 border-2 border-primary/30">
                            <AvatarImage src={author.avatarUrl || `https://placehold.co/100x100.png`} alt={author.displayName || author.username} data-ai-hint="profile person" />
                            <AvatarFallback>{(author.displayName || author.username).substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <h3 className="font-semibold font-headline text-md">{author.displayName || author.username}</h3>
                                <p className="text-xs text-muted-foreground">@{author.username}</p>
                                {author.bio && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{author.bio}</p>}
                            </div>
                        </CardContent>
                        </Card>
                    </Link>
                    ))}
                </div>
            </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
