'use client';

import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Music, Type, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  href,
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}) => {
  const content = (
    <Card
      className="bg-gray-900 border-gray-700 h-full flex flex-col items-center justify-center text-center p-6 text-white hover:bg-gray-800 hover:border-primary transition-all cursor-pointer group"
      onClick={onClick}
    >
      <Icon className="h-12 w-12 text-primary mb-4 transition-transform group-hover:scale-110" />
      <h2 className="text-xl font-bold font-headline">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {content}
      </Link>
    );
  }
  return content;
};

export default function InstapostPage() {
  const { toast } = useToast();

  const handleComingSoon = (feature: string) => {
    toast({
      title: 'Coming Soon!',
      description: `${feature} stories are not available yet, but we're working on it!`,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-white p-4 pt-20">
      <h1 className="text-4xl font-headline font-bold mb-2">Create a Post</h1>
      <p className="text-muted-foreground mb-8">
        How do you want to share your update?
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl h-64">
        <FeatureCard
          icon={Type}
          title="Text"
          description="Share a quick thought or update."
          href="/post-story"
        />
        <FeatureCard
          icon={Music}
          title="Music"
          description="Share a song with a stylized background."
          onClick={() => handleComingSoon('Music')}
        />
        <FeatureCard
          icon={ImageIcon}
          title="Gallery"
          description="Post a photo or video from your gallery."
          href="/post-story/gallery"
        />
      </div>
    </div>
  );
}
