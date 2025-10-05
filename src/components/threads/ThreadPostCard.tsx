
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { ThreadPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreHorizontal, EyeOff, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ThreadPostComments from './ThreadPostComments';
import ReactionButton from './ReactionButton';
import { deleteThreadPost } from '@/app/actions/threadActions';

export default function ThreadPostCard({ post, onHide }: { post: ThreadPost, onHide: (postId: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, startDeleteTransition] = useTransition();

  const isOwner = user?.id === post.author.id;

  const handleDelete = () => {
    if (!isOwner || !user) return;
    startDeleteTransition(async () => {
      const result = await deleteThreadPost(post.id, user.id);
      if (result.success) {
        toast({ title: 'Post Deleted' });
        // The onHide function will visually remove it from the feed.
        onHide(post.id);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    });
  }
  
  return (
    <AlertDialog>
        <Dialog>
            <Card>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
                <Link href={`/profile/${post.author.id}`}>
                <Avatar>
                    <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} data-ai-hint="profile person" />
                    <AvatarFallback>{post.author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                </Link>
                <div className="flex-1">
                <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline">{post.author.displayName}</Link>
                <p className="text-xs text-muted-foreground">
                    {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'now'}
                </p>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onHide(post.id)}>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide Post
                        </DropdownMenuItem>
                         {isOwner && (
                            <>
                             <DropdownMenuSeparator />
                             <DropdownMenuItem asChild>
                                <Link href={`/threads/edit/${post.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Post
                                </Link>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Post
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                           </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
                {post.content && <p className="whitespace-pre-line">{post.content}</p>}
                
                {post.storyId && (
                    <Link href={`/stories/${post.storyId}`}>
                        <div className="border rounded-lg p-3 flex gap-3 hover:bg-muted/50 transition-colors">
                            <Image src={post.storyCoverUrl || ''} alt={post.storyTitle || ''} width={50} height={75} className="rounded-sm object-cover" />
                            <div>
                                <p className="font-bold">{post.storyTitle}</p>
                                <p className="text-sm text-muted-foreground">by {post.author.displayName}</p>
                            </div>
                        </div>
                    </Link>
                )}
                {post.imageUrl && (
                    <div className="relative aspect-video rounded-lg overflow-hidden">
                        <Image src={post.imageUrl} alt="Post image" layout="fill" objectFit="cover" />
                    </div>
                )}
                {post.songUrl && (
                    <div>
                        <SpotifyPlayer trackUrl={post.songUrl} />
                        {post.songLyricSnippet && (
                            <blockquote className="mt-2 text-sm italic border-l-2 pl-4 text-muted-foreground">
                                "{post.songLyricSnippet}"
                            </blockquote>
                        )}
                    </div>
                )}

            </CardContent>
            <CardFooter className="p-2 border-t flex items-center justify-between">
                <ReactionButton postId={post.id} initialReactionsCount={post.reactionsCount || 0} />
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <MessageCircle className="mr-2 h-4 w-4" /> {post.commentsCount || 0} Comments
                    </Button>
                </DialogTrigger>
            </CardFooter>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your post.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                         {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>

            {/* Comments Dialog */}
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Comments</DialogTitle>
                </DialogHeader>
                <ThreadPostComments postId={post.id} />
            </DialogContent>
        </Dialog>
    </AlertDialog>
  );
}
