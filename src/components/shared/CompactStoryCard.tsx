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
      <div onClick={() => onOpen(story.id)} className="flex-shrink-0 w-32 md:w-40 group cursor-pointer active:scale-95 transition-transform">
        <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 bg-muted border border-border/40">
          <Image
            src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/512/800`}
            alt={story.title}
            layout="fill"
            objectFit="cover"
            className="group-hover:scale-110 transition-transform duration-700 ease-in-out"
            data-ai-hint={story.dataAiHint || "book cover"}
          />
        </div>
        <p className="mt-2 text-[11px] md:text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors px-0.5 leading-tight">
          {story.title}
        </p>
      </div>
  );
}
