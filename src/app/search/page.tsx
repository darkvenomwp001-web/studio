
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, FormEvent, useCallback } from 'react';
import type { Story, User as AppUser } from '@/types'; // Renamed User to AppUser to avoid conflict
import StoryCard from '@/components/shared/StoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Search as SearchIcon, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAt,
  endAt,
  or, // Import 'or' for combining queries if needed and supported
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
  const searchParamsHook = useSearchParams(); // Renamed to avoid conflict
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

    try {
      // Search Stories
      const storiesRef = collection(db, 'stories');
      const storyQuery = query(
        storiesRef,
        where('visibility', '==', 'Public'),
        where('title', '>=', currentQuery),
        where('title', '<=', currentQuery + '\uf8ff'), // \uf8ff is a Unicode character for prefix matching
        orderBy('title'),
        limit(12)
      );
      const storySnapshot = await getDocs(storyQuery);
      const storiesFound = storySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
      setStoryResults(storiesFound);

      // Search Users (by username OR displayName)
      // Firestore doesn't support OR queries on different fields directly in a single query for range comparisons.
      // We perform two separate queries and merge results.
      const usersRef = collection(db, 'users');
      
      const usernameQuery = query(
        usersRef,
        where('username', '>=', currentQuery),
        where('username', '<=', currentQuery + '\uf8ff'),
        orderBy('username'),
        limit(6)
      );
      const usernameSnapshot = await getDocs(usernameQuery);
      const usersByUsername = usernameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));

      const displayNameQuery = query(
        usersRef,
        where('displayName', '>=', currentQuery),
        where('displayName', '<=', currentQuery + '\uf8ff'),
        orderBy('displayName'),
        limit(6)
      );
      const displayNameSnapshot = await getDocs(displayNameQuery);
      const usersByDisplayName = displayNameSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      
      // Merge and deduplicate user results
      const combinedUsers = new Map<string, AppUser>();
      usersByUsername.forEach(user => combinedUsers.set(user.id, user));
      usersByDisplayName.forEach(user => combinedUsers.set(user.id, user)); // Overwrites if duplicate, which is fine
      
      setUserResults(Array.from(combinedUsers.values()));

    } catch (error) {
      console.error("Error performing search:", error);
      toast({ title: "Search Error", description: "Could not perform search. Check Firestore indexes.", variant: "destructive" });
      setStoryResults([]);
      setUserResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce(performSearch, 500), [toast]); // Include toast in dependencies if used inside performSearch

  useEffect(() => {
    setSearchTerm(queryFromUrl); // Sync searchTerm with URL q param on initial load or URL change
    if (queryFromUrl.trim()) {
      setIsLoading(true); // Indicate loading when URL has query
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
    if (newQuery.trim()) {
      setIsLoading(true); // Indicate loading as soon as user types
      debouncedSearch(newQuery);
    } else {
      setStoryResults([]);
      setUserResults([]);
      setIsLoading(false);
      router.push('/search'); // Clear URL query if search term is cleared
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = searchTerm.trim();
    // Update URL, which will trigger the useEffect to perform search
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    } else {
      router.push('/search');
    }
  };
  
  const noResultsFound = !isLoading && searchTerm.trim() !== '' && storyResults.length === 0 && userResults.length === 0;

  return (
    <div className="space-y-12">
      <header className="pb-6 border-b">
        <h1 className="text-3xl md:text-4xl font-headline font-bold mb-6 text-center">
          Search LitVerse
        </h1>
        <form onSubmit={handleSearchSubmit} className="max-w-xl mx-auto flex gap-2">
          <Input 
            type="search" 
            placeholder="Search stories, authors, tags..." 
            className="flex-grow text-base h-12 px-4 focus-visible:ring-primary"
            value={searchTerm}
            onChange={handleInputChange}
            aria-label="Search query"
          />
          <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 h-12">
            <SearchIcon className="mr-0 md:mr-2 h-5 w-5" />
            <span className="hidden md:inline">Search</span>
          </Button>
        </form>
      </header>

      {isLoading && (
        <div className="text-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Searching...</p>
        </div>
      )}

      {!isLoading && !searchTerm.trim() && (
         <div className="text-center py-10">
          <p className="text-muted-foreground">Enter a term above to find stories and authors.</p>
        </div>
      )}

      {noResultsFound && (
        <div className="text-center py-10 bg-card p-8 rounded-lg shadow">
          <p className="text-xl text-muted-foreground">No results found for &quot;{searchTerm}&quot;.</p>
          <p className="text-sm text-muted-foreground mt-2">Try searching for something else or check your spelling.</p>
        </div>
      )}
      
      {!isLoading && storyResults.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 flex items-center gap-2">
            <BookOpen className="text-primary h-6 w-6" /> Matching Stories ({storyResults.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {storyResults.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      {!isLoading && userResults.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 flex items-center gap-2">
            <Users className="text-primary h-6 w-6" /> Matching Authors ({userResults.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {userResults.map(author => (
              <Link href={`/profile/${author.id}`} key={author.id} passHref>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardContent className="pt-6 flex flex-col items-center text-center h-full">
                    <Avatar className="w-24 h-24 mb-4 border-2 border-primary/30">
                      <AvatarImage src={author.avatarUrl || `https://placehold.co/100x100.png`} alt={author.displayName || author.username} data-ai-hint="profile person" />
                      <AvatarFallback>{(author.displayName || author.username).substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold font-headline">{author.displayName || author.username}</h3>
                    {author.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-grow">{author.bio}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
    