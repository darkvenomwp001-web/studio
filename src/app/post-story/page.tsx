'use client';

import { useState, useTransition, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, Users, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createUserStory } from '@/app/actions/storyActions';
import type { UserSummary } from '@/types';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const backgroundColors = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-slate-900 to-slate-700',
  'bg-gradient-to-br from-red-500 to-orange-500',
  'bg-gradient-to-br from-blue-700 to-indigo-900',
  'bg-gradient-to-br from-purple-600 to-indigo-600',
  'bg-gradient-to-br from-green-500 to-teal-600',
  'bg-gradient-to-br from-pink-500 to-rose-500',
];

export default function PostStoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, startTransition] = useTransition();

  const [content, setContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(backgroundColors[0]);
  const [audience, setAudience] = useState<'yourStory' | 'closeFriends'>(
    'yourStory'
  );

  useEffect(() => {
    const storyType = searchParams.get('type');
    if (storyType !== 'text') {
      toast({
        title: 'Invalid Story Type',
        description: 'This page is for text stories only.',
        variant: 'destructive',
      });
      router.push('/instapost');
    }
  }, [searchParams, router, toast]);

  const handleSubmit = () => {
    if (!user) {
      toast({
        title: 'You must be logged in to post a story.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      const userSummary: UserSummary = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      };

      // For now, "Close Friends" posts as a public story.
      const result = await createUserStory(userSummary, content, selectedBg);

      if (result.success) {
        toast({ title: 'Story Posted!' });
        router.push('/');
      } else {
        toast({
          title: 'Error Posting Story',
          description: result.error,
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
        <Link href="/instapost" passHref>
          <button className="text-white bg-black/30 rounded-full p-2 hover:bg-black/50 transition-colors">
            <ArrowLeft className="h-6 w-6" />
            <span className="sr-only">Back</span>
          </button>
        </Link>
        <div className="flex items-center gap-2">
          {backgroundColors.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedBg(color)}
              className={cn(
                'h-8 w-8 rounded-full cursor-pointer transition-transform hover:scale-110 border-2 border-transparent',
                color,
                selectedBg === color && 'ring-2 ring-white ring-offset-2 ring-offset-black'
              )}
              aria-label={`Select ${color} background`}
            />
          ))}
        </div>
        <div></div>
      </header>

      <main
        className={cn(
          'flex-1 flex flex-col items-center justify-center p-8 transition-colors',
          selectedBg
        )}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing..."
          maxLength={280}
          className="bg-transparent border-0 text-white placeholder:text-white/70 text-center text-3xl font-bold focus-visible:ring-0 resize-none h-full shadow-none w-full max-w-lg"
        />
        <span className="absolute bottom-24 right-4 text-xs text-white/60">
          {content.length}/280
        </span>
      </main>

      <footer className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={audience === 'yourStory' ? 'secondary' : 'ghost'}
              onClick={() => setAudience('yourStory')}
              className="rounded-full text-white bg-black/40 hover:bg-black/60"
            >
              <Users className="mr-2 h-4 w-4" />
              Your Story
            </Button>
            <Button
              variant={audience === 'closeFriends' ? 'secondary' : 'ghost'}
              onClick={() => {
                setAudience('closeFriends');
                toast({
                  title: 'Close Friends Feature',
                  description: 'Posting to Close Friends is coming soon! For now, this will post to Your Story.',
                });
              }}
              className="rounded-full text-white bg-black/40 hover:bg-black/60"
            >
              <UserCheck className="mr-2 h-4 w-4" />
              Close Friends
            </Button>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || content.trim().length === 0}
            className="rounded-full bg-white text-black hover:bg-gray-200"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Post Story
          </Button>
        </div>
      </footer>
    </div>
  );
}
