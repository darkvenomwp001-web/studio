import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users } from 'lucide-react';
import StoryCard from '@/components/shared/StoryCard';
import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function HomePage() {
  const trendingStories = placeholderStories.slice(0, 4);
  const featuredAuthors = placeholderUsers.slice(0, 4);

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background shadow-lg">
        <div className="absolute inset-0 opacity-5">
          {/* Decorative background pattern, could be SVG or subtle image */}
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-headline font-extrabold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
            Welcome to LitVerse
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Dive into captivating stories, unleash your creativity, and connect with a vibrant community of readers and writers. Your next literary adventure starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/stories" passHref>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform hover:scale-105">
                Explore Stories <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/write" passHref>
              <Button size="lg" variant="outline" className="shadow-md transition-transform hover:scale-105">
                Start Writing <Edit className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="py-12">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6 bg-card rounded-lg shadow-sm hover:shadow-lg transition-shadow">
            <BookHeart className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-headline font-semibold mb-2">Read Engaging Stories</h3>
            <p className="text-muted-foreground text-sm">Discover thousands of stories across all genres, from thrilling adventures to heartwarming romances.</p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-sm hover:shadow-lg transition-shadow">
            <Edit className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-headline font-semibold mb-2">Craft Your Own Tales</h3>
            <p className="text-muted-foreground text-sm">Utilize our powerful writing tools and AI assistant to bring your imagination to life.</p>
          </div>
          <div className="p-6 bg-card rounded-lg shadow-sm hover:shadow-lg transition-shadow">
            <Users className="h-12 w-12 text-accent mx-auto mb-4" />
            <h3 className="text-xl font-headline font-semibold mb-2">Join the Community</h3>
            <p className="text-muted-foreground text-sm">Connect with fellow readers and writers, share feedback, and collaborate on new projects.</p>
          </div>
        </div>
      </section>

      {/* Trending Stories Section */}
      <section>
        <h2 className="text-3xl font-headline font-bold mb-8 text-center md:text-left">Trending Stories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trendingStories.map(story => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/stories" passHref>
            <Button variant="outline">View All Stories <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </section>

      {/* Featured Authors Section */}
      <section>
        <h2 className="text-3xl font-headline font-bold mb-8 text-center md:text-left">Featured Authors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {featuredAuthors.map(author => (
            <Link href={`/profile/${author.id}`} key={author.id} passHref>
              <div className="flex flex-col items-center p-4 bg-card rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out transform hover:-translate-y-1 cursor-pointer">
                <Avatar className="w-24 h-24 mb-3 border-2 border-primary/50">
                  <AvatarImage src={author.avatarUrl || `https://placehold.co/100x100.png?text=${author.username.charAt(0)}`} alt={author.username} data-ai-hint="profile person" />
                  <AvatarFallback>{author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <h3 className="text-md font-semibold font-headline text-center">{author.username}</h3>
                <p className="text-xs text-muted-foreground text-center truncate w-full">{author.bio?.substring(0,40) || "Avid writer"}{author.bio && author.bio.length > 40 ? "..." : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
