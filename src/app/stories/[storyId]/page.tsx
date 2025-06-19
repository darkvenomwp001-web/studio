import { placeholderStories, placeholderUsers } from '@/lib/placeholder-data';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, BookOpen, MessageSquare, ThumbsUp, Share2, Bookmark } from 'lucide-react';
import CommentSection from '@/components/comments/CommentSection';

// Mock function to fetch story data
async function getStoryData(storyId: string) {
  // In a real app, this would fetch data from a database or API
  return placeholderStories.find(story => story.id === storyId);
}

export default async function StoryPage({ params }: { params: { storyId: string } }) {
  const story = await getStoryData(params.storyId);

  if (!story) {
    return <div className="text-center py-10">Story not found.</div>;
  }

  const currentChapter = story.chapters[0] || { title: "Introduction", content: story.summary, order: 0}; // Default to first chapter or summary

  return (
    <div className="max-w-4xl mx-auto">
      {/* Story Header */}
      <header className="mb-8 p-6 bg-card rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Image
            src={story.coverImageUrl || `https://placehold.co/200x300.png?text=${encodeURIComponent(story.title)}`}
            alt={story.title}
            width={200}
            height={300}
            className="rounded-md shadow-lg object-cover w-full md:w-1/3"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
          <div className="flex-1">
            <h1 className="text-4xl font-headline font-bold mb-2 text-primary">{story.title}</h1>
            <div className="flex items-center gap-2 mb-4 text-muted-foreground">
              <Avatar className="h-8 w-8">
                <AvatarImage src={story.author.avatarUrl} alt={story.author.username} data-ai-hint="profile person" />
                <AvatarFallback>{story.author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <Link href={`/profile/${story.author.id}`} className="hover:underline font-medium text-foreground">
                {story.author.username}
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {story.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{story.summary}</p>
            <div className="flex gap-2 items-center">
                <Button variant="outline" size="sm"><Bookmark className="mr-2 h-4 w-4" /> Add to Library</Button>
                <Button variant="outline" size="sm"><Share2 className="mr-2 h-4 w-4" /> Share</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chapter Navigation & Content */}
      <div className="bg-card p-6 md:p-8 rounded-lg shadow-md mb-8">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <Button variant="outline" size="sm" disabled={currentChapter.order <= 1}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
          </Button>
          <h2 className="text-2xl font-headline text-center truncate px-2">{currentChapter.title}</h2>
          <Button variant="outline" size="sm" disabled={currentChapter.order >= story.chapters.length}>
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <article className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert text-foreground leading-relaxed selection:bg-primary/20">
          {/* In a real app, story.content would be HTML or Markdown rendered here */}
          <p>{currentChapter.content}</p>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
          <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
          <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
        </article>
      </div>
      
      {/* Actions: Like, Comment count */}
      <div className="flex items-center justify-end gap-4 mb-8 p-4 bg-card rounded-lg shadow-sm">
        <Button variant="ghost" className="text-muted-foreground hover:text-primary">
            <ThumbsUp className="mr-2 h-5 w-5" /> Like ({Math.floor(Math.random() * 500)})
        </Button>
        <Button variant="ghost" className="text-muted-foreground hover:text-primary">
            <MessageSquare className="mr-2 h-5 w-5" /> Comments ({story.chapters.reduce((acc, ch) => acc + (Math.floor(Math.random()*10)), 0) + Math.floor(Math.random()*20)})
        </Button>
      </div>


      {/* Interactive Comments Section */}
      <CommentSection storyId={story.id} chapterId={currentChapter.id} />
    </div>
  );
}
