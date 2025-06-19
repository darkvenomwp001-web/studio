
import Link from 'next/link';
import Image from 'next/image';
import type { Story } from '@/types';

interface CompactStoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint'>;
}

export default function CompactStoryCard({ story }: CompactStoryCardProps) {
  return (
    <Link href={`/stories/${story.id}`} passHref>
      <div className="flex-shrink-0 w-36 md:w-40 group cursor-pointer">
        <div className="aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted">
          <Image
            src={story.coverImageUrl || `https://placehold.co/200x300.png`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-105 transition-transform duration-300 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {story.title}
        </p>
      </div>
    </Link>
  );
}
