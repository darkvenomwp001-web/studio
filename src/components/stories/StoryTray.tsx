'use client';

import { useAuth } from '@/hooks/useAuth';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Mock data for story authors
const mockStoryAuthors = [
  {
    id: 'mockuser1',
    username: 'FantasyFan',
    displayName: 'FantasyFan',
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: "profile person"
  },
  {
    id: 'mockuser2',
    username: 'SciFiNovelist',
    displayName: 'SciFiNovelist',
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: "profile person"
  },
  {
    id: 'mockuser3',
    username: 'RomanceQueen',
    displayName: 'RomanceQueen',
    avatarUrl: 'https://placehold.co/100x100.png',
    dataAiHint: "profile person"
  },
];


export default function StoryTray() {
    const { user } = useAuth();
    const { toast } = useToast();

    const handleMockStoryClick = () => {
        toast({
            title: "Feature in progress!",
            description: "The full story viewer is being re-built. Thanks for your patience.",
        });
    };

    // Don't show the tray if the user is not logged in
    if (!user) {
        return null;
    }
    
    return (
        <div className="w-full border-b pb-3">
            <div className="flex overflow-x-auto space-x-4 py-2 px-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
                <Link href="/instapost" className="text-center w-16 flex-shrink-0">
                    <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary">
                            <PlusCircle className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium truncate">Add Story</span>
                    </div>
                </Link>

                {mockStoryAuthors.map((author) => (
                    <button key={author.id} onClick={handleMockStoryClick} className="flex-shrink-0 w-16 text-center group">
                        <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-pink-500 via-red-500 group-hover:scale-105 transition-transform">
                            <div className="bg-background p-0.5 rounded-full h-full w-full">
                                 <Avatar className="h-full w-full">
                                    <AvatarImage src={author.avatarUrl} alt={author.username} data-ai-hint={author.dataAiHint} />
                                    <AvatarFallback>{author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                        <p className="text-xs font-medium text-muted-foreground truncate mt-1 group-hover:text-primary">{author.displayName}</p>
                    </button>
                ))}
            </div>
        </div>
    );
}
