
'use client'; // Required for using hooks like useAuth

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2 } from 'lucide-react';
import StoryCard from '@/components/shared/StoryCard';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Used for feature cards

export default function HomePage() {
  const { user, loading } = useAuth(); // Get user and loading state
  const trendingStories = placeholderStories.slice(0, 8); // Show more for a scrollable list
  const featuredAuthors = placeholderUsers.slice(0, 8); // Show more authors

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background shadow-xl">
        <div className="absolute inset-0 opacity-5">
          {/* Optional: Decorative background pattern or subtle image */}
          {/* <Image src="/path/to/hero-bg.svg" layout="fill" objectFit="cover" alt="Background pattern" /> */}
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-headline font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary via-accent to-primary/70">
            Welcome to D4RKV3NOM
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            Dive into captivating stories, unleash your creativity, and connect with a vibrant community of readers and writers. Your next literary adventure starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/stories" passHref>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:scale-105 text-lg py-3 px-8">
                Explore Stories <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/write" passHref>
              <Button size="lg" variant="outline" className="shadow-md transition-transform hover:scale-105 text-lg py-3 px-8 border-primary text-primary hover:bg-primary/5">
                Start Writing <Edit className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="container mx-auto px-4 py-12">
         <h2 className="text-3xl font-headline font-bold mb-10 text-center">What You Can Do</h2>
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <Card className="bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 transform hover:-translate-y-1">
            <CardHeader className="p-0 mb-4">
              <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                <BookHeart className="h-12 w-12 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <h3 className="text-xl font-headline font-semibold mb-2">Read Engaging Stories</h3>
              <p className="text-muted-foreground text-sm">Discover thousands of stories across all genres, from thrilling adventures to heartwarming romances.</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 transform hover:-translate-y-1">
             <CardHeader className="p-0 mb-4">
              <div className="mx-auto bg-accent/10 p-4 rounded-full w-fit">
                <Edit className="h-12 w-12 text-accent" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <h3 className="text-xl font-headline font-semibold mb-2">Craft Your Own Tales</h3>
              <p className="text-muted-foreground text-sm">Utilize our powerful writing tools and AI assistant to bring your imagination to life.</p>
            </CardContent>
          </Card>
          <Card className="bg-card rounded-lg shadow-lg hover:shadow-xl transition-shadow p-6 transform hover:-translate-y-1">
            <CardHeader className="p-0 mb-4">
               <div className="mx-auto bg-secondary/20 p-4 rounded-full w-fit">
                <Users className="h-12 w-12 text-secondary" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <h3 className="text-xl font-headline font-semibold mb-2">Join the Community</h3>
              <p className="text-muted-foreground text-sm">Connect with fellow readers and writers, share feedback, and collaborate on new projects.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trending Stories Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-headline font-bold text-primary">Trending Stories</h2>
            <Link href="/stories" passHref>
                <Button variant="outline" className="text-sm">View All Stories <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
        </div>
        <div className="relative">
            <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {trendingStories.map(story => (
                <div key={story.id} className="flex-shrink-0 w-72 md:w-80">
                    <StoryCard story={story} />
                </div>
            ))}
            {/* Add an invisible element to ensure scrolling for the last items */}
            <div className="flex-shrink-0 w-px"></div>
            </div>
        </div>
      </section>

      {/* Featured Authors Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-headline font-bold text-accent">Featured Authors</h2>
            {/* Optional: Link to a dedicated authors page */}
            {/* <Link href="/authors" passHref><Button variant="outline" className="text-sm">Discover Authors <ArrowRight className="ml-2 h-4 w-4" /></Button></Link> */}
        </div>
         <div className="relative">
            <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-accent/50 scrollbar-track-transparent">
            {featuredAuthors.map(author => (
                <Link href={`/profile/${author.id}`} key={author.id} passHref>
                <div className="flex-shrink-0 w-52 group cursor-pointer">
                    <Card className="flex flex-col items-center p-4 bg-card rounded-lg shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full">
                    <Avatar className="w-28 h-28 mb-4 border-4 border-accent/30 group-hover:border-accent transition-colors">
                        <AvatarImage src={author.avatarUrl || `https://placehold.co/120x120.png?text=${author.username.charAt(0)}`} alt={author.displayName || author.username} data-ai-hint="profile person" />
                        <AvatarFallback className="text-3xl">{author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold font-headline text-center group-hover:text-accent transition-colors">{author.displayName || author.username}</h3>
                    <p className="text-xs text-muted-foreground text-center line-clamp-2 mt-1 flex-grow">{author.bio?.substring(0,60) || "Passionate creator"}{author.bio && author.bio.length > 60 ? "..." : ""}</p>
                    </Card>
                </div>
                </Link>
            ))}
            <div className="flex-shrink-0 w-px"></div>
            </div>
        </div>
      </section>
    </div>
  );
}
