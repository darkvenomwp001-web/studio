
import Link from 'next/link';
import Image from 'next/image';
import type { ReadingListItem } from '@/types';
import { Progress } from '@/components/ui/progress'; // Assuming you have a Progress component

interface YourStoryCardProps {
  story: ReadingListItem;
}

export default function YourStoryCard({ story }: YourStoryCardProps) {
  // Mock progress and chapter info for demonstration
  const mockProgress = Math.floor(Math.random() * 80) + 10; // Random progress between 10% and 90%
  const totalChapters = story.chapters?.length || 1;
  const currentChapterMock = Math.min(totalChapters, Math.floor(Math.random() * totalChapters) + 1);
  const statusText = totalChapters > 0 ? `Continue Part ${currentChapterMock}` : "Start Reading";

  return (
    <Link href={`/stories/${story.id}`} passHref>
      <div className="flex-shrink-0 w-36 md:w-40 group cursor-pointer">
        <div className="aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 via-black/50 to-transparent">
            {/* Mock Progress Bar - visual only */}
            <div className="h-1 w-full bg-white/30 rounded-full mb-1 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${mockProgress}%` }}></div>
            </div>
          </div>
        </div>
        <p className="mt-1.5 text-xs font-semibold text-foreground/90 truncate group-hover:text-primary transition-colors">
          {story.title}
        </p>
        <p className="text-xs text-muted-foreground">{statusText}</p>
      </div>
    </Link>
  );
}
