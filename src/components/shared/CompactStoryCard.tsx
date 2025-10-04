
'use client';

import Image from 'next/image';
import type { Story } from '@/types';
import { useStoryPreview } from '@/context/StoryPreviewProvider';


interface CompactStoryCardProps {
  story: Pick<Story, 'id' | 'title' | 'coverImageUrl' | 'dataAiHint'>;
}

export default function CompactStoryCard({ story }: CompactStoryCardProps) {
  const { onOpen } = useStoryPreview();

  return (
      <div onClick={() => onOpen(story.id)} className="flex-shrink-0 w-36 md:w-40 group cursor-pointer">
        <div className="aspect-[2/3] relative rounded-md overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 bg-muted">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
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
  );
}
