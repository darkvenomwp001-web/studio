
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import StoryCard from '@/components/shared/StoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { useEffect, useState, FormEvent } from 'react';
import type { Story, User } from '@/types';
import { Card, CardContent } from '@/components/ui/card'; // Removed CardHeader, CardTitle as they are not directly used in author card
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Search as SearchIcon } from 'lucide-react';

export default function SearchResultsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryFromUrl = searchParams.get('q') || '';

  const [localQuery, setLocalQuery] = useState(queryFromUrl);
  const [filteredStories, setFilteredStories] = useState<Story[]>([]);
  const [filteredAuthors, setFilteredAuthors] = useState<User[]>([]);

  // Effect 1: Update localQuery if queryFromUrl changes (e.g., browser back/forward, initial load)
  useEffect(() => {
    setLocalQuery(queryFromUrl);
  }, [queryFromUrl]);

  // Effect 2: Perform search whenever localQuery changes
  useEffect(() => {
    const currentSearchTerm = localQuery.trim();

    if (currentSearchTerm) {
      const lowerCaseQuery = currentSearchTerm.toLowerCase();
      
      const stories = placeholderStories.filter(story => 
        story.title.toLowerCase().includes(lowerCaseQuery) ||
        story.summary.toLowerCase().includes(lowerCaseQuery) ||
        story.tags.some(tag => tag.toLowerCase().includes(lowerCaseQuery)) ||
        story.author.username.toLowerCase().includes(lowerCaseQuery) ||
        (story.author.displayName && story.author.displayName.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredStories(stories);

      const authors = placeholderUsers.filter(user => 
        user.username.toLowerCase().includes(lowerCaseQuery) ||
        (user.displayName && user.displayName.toLowerCase().includes(lowerCaseQuery)) ||
        (user.bio && user.bio.toLowerCase().includes(lowerCaseQuery))
      );
      setFilteredAuthors(authors);
    } else {
      // Clear results if localQuery is empty
      setFilteredStories([]);
      setFilteredAuthors([]);
    }
  }, [localQuery]); // Only depends on localQuery for filtering

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalQuery(e.target.value);
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedQuery = localQuery.trim();
    // Update URL only on explicit submit, to keep it clean and allow shareable links
    if (trimmedQuery) {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    } else {
      // If submitted with empty query, clear the URL param as well
      router.push('/search');
    }
  };
  
  const isSearching = localQuery.trim() !== '';
  const noResultsFound = isSearching && filteredStories.length === 0 && filteredAuthors.length === 0;

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
            value={localQuery}
            onChange={handleInputChange}
            aria-label="Search query"
          />
          <Button type="submit" size="lg" className="bg-primary hover:bg-primary/90 h-12">
            <SearchIcon className="mr-0 md:mr-2 h-5 w-5" />
            <span className="hidden md:inline">Search</span>
          </Button>
        </form>
      </header>

      {!isSearching && (
         <div className="text-center py-10">
          <p className="text-muted-foreground">Enter a term above to find stories and authors.</p>
        </div>
      )}

      {isSearching && noResultsFound && (
        <div className="text-center py-10 bg-card p-8 rounded-lg shadow">
          <p className="text-xl text-muted-foreground">No results found for &quot;{localQuery}&quot;.</p>
          <p className="text-sm text-muted-foreground mt-2">Try searching for something else or check your spelling.</p>
        </div>
      )}
      
      {isSearching && filteredStories.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 flex items-center gap-2">
            <BookOpen className="text-primary h-6 w-6" /> Matching Stories ({filteredStories.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      {isSearching && filteredAuthors.length > 0 && (
        <section>
          <h2 className="text-2xl font-headline font-semibold mb-6 flex items-center gap-2">
            <Users className="text-primary h-6 w-6" /> Matching Authors ({filteredAuthors.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredAuthors.map(author => (
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

