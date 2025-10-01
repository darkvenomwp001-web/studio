
'use client';

import { useState } from 'react';
import type { ThreadPost, User } from '@/types';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { toggleLikeThreadPost, deleteThreadPost } from '@/app/actions/threadActions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface FeedPostCardProps {
  post: ThreadPost;
  currentUser: User;
}

export default function FeedPostCard({ post, currentUser }: FeedPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.likedBy.includes(currentUser.id));
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleLikeClick = async () => {
    // Optimistic UI update
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    const result = await toggleLikeThreadPost(post.id, currentUser.id);
    if (!result.success) {
      // Revert UI on failure
      setIsLiked(isLiked);
      setLikesCount(likesCount);
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    const result = await deleteThreadPost(post.id, currentUser.id);
    if (!result.success) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
      setIsDeleting(false);
    } else {
      toast({ title: 'Post Deleted' });
      // The post will be removed from the feed by the real-time listener in HomeFeed.
    }
  };

  const isOwner = post.author.id === currentUser.id;

  return (
    <AlertDialog>
      <Card className="w-full">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Link href={`/profile/${post.author.id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} data-ai-hint="profile person" />
                <AvatarFallback>{post.author.username?.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1">
              <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline">
                {post.author.displayName}
              </Link>
              <p className="text-xs text-muted-foreground">
                {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
              </p>
            </div>
            {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Post
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
          </div>

          {post.content && (
              <p className="text-foreground/90 whitespace-pre-line">
              {post.content}
              </p>
          )}

          {post.imageUrl && (
              <div className="rounded-lg overflow-hidden border">
                  <Image src={post.imageUrl} alt="Post image" width={500} height={500} className="w-full h-auto object-contain" />
              </div>
          )}
        </CardContent>
        <CardFooter className="p-2 border-t flex items-center gap-2">
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={handleLikeClick}>
            <Heart className={cn("h-4 w-4", isLiked && "fill-red-500 text-red-500")} />
            <span className="text-sm">{likesCount}</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex items-center gap-1.5" onClick={() => toast({ title: 'Coming Soon!', description: 'Commenting on posts will be available in a future update.'})}>
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{post.commentsCount}</span>
          </Button>
        </CardFooter>
      </Card>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your post.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeletePost} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
