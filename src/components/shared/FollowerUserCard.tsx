'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { User as AppUser } from '@/types';

interface FollowerUserCardProps {
  user: AppUser;
}

export default function FollowerUserCard({ user }: FollowerUserCardProps) {
  const displayName = user.displayName || user.username;

  return (
    <div className="w-28 md:w-32 flex-shrink-0 text-center group">
      <Link href={`/profile/${user.id}`} passHref>
        <Avatar className="h-20 w-20 md:h-24 md:w-24 mx-auto border-2 border-border group-hover:border-primary transition-colors cursor-pointer">
          <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} alt={displayName || 'User profile'} data-ai-hint={user.dataAiHint || "profile person"} />
          <AvatarFallback>{(displayName || 'U').substring(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <Link href={`/profile/${user.id}`} passHref>
        <p className="mt-2 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors cursor-pointer">
          {displayName || 'Unknown User'}
        </p>
      </Link>
      <p className="text-xs text-muted-foreground">{user.followersCount || 0} Followers</p>
    </div>
  );
}
