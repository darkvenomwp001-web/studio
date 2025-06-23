
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CreateStoryDialog from './CreateStoryDialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// Mock user data for display purposes
const mockUsers = [
  { id: 'mock-1', username: 'Alex', avatarUrl: 'https://placehold.co/60x60.png', dataAiHint: "profile person" },
  { id: 'mock-2', username: 'Bella', avatarUrl: 'https://placehold.co/60x60.png', dataAiHint: "profile person" },
  { id: 'mock-3', username: 'Chris', avatarUrl: 'https://placehold.co/60x60.png', dataAiHint: "profile person" },
];

export default function StoryTray() {
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAddStoryClick = () => {
    if (user) {
      setIsCreateDialogOpen(true);
    } else {
      toast({
        title: "Please Sign In",
        description: "You need to be logged in to post a story.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <div className="w-full border-b pb-3">
        <div className="flex overflow-x-auto space-x-4 py-2 px-4 scrollbar-thin scrollbar-thumb-primary/30 scrollbar-track-transparent">
          {/* Button to add a new story */}
          <button
            onClick={handleAddStoryClick}
            className="text-center w-16 flex-shrink-0"
            aria-label="Add a new story"
          >
            <div className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center border-2 border-dashed border-border hover:border-primary">
                <PlusCircle className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium truncate">Add Story</span>
            </div>
          </button>
          
          {/* Mock user avatars */}
          {mockUsers.map((mockUser) => (
            <Link 
              key={mockUser.id}
              href={`/stories/view/${mockUser.id}`}
              className="flex-shrink-0 w-16 text-center group"
              aria-label={`View ${mockUser.username}'s story`}
            >
              <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 to-pink-500 via-red-500 group-hover:scale-105 transition-transform">
                <div className="bg-background p-0.5 rounded-full h-full w-full">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={mockUser.avatarUrl} alt={mockUser.username} data-ai-hint={mockUser.dataAiHint || 'profile person'} />
                    <AvatarFallback>{mockUser.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <p className="text-xs font-medium text-muted-foreground truncate mt-1 group-hover:text-primary">{mockUser.username}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* The dialog for creating a real story */}
      <CreateStoryDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </>
  );
}
