
'use client';

import { useState, useEffect } from 'react';
import type { ThreadPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreHorizontal, EyeOff, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { deleteThreadPost, updateThreadPost } from '@/app/actions/threadActions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ThreadPostComments from './ThreadPostComments';

export default function ThreadPostCard({ post }: { post: ThreadPost }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLiked, setIsLiked] = useState(user && post.likedBy?.includes(user.id));
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);

  // This effect ensures the like status is updated if the post prop changes (e.g., from a real-time listener in the parent).
  useEffect(() => {
    setIsLiked(user && post.likedBy?.includes(user.id));
    setLikesCount(post.likesCount || 0);
  }, [post.likedBy, post.likesCount, user]);


  const handleLike = async () => {
    if (!user || user.isAnonymous) return;
    const postRef = doc(db, 'feedPosts', post.id);
    
    // Optimistic update
    const newLikedState = !isLiked;
    const newLikesCount = newLikedState ? likesCount + 1 : likesCount - 1;
    setIsLiked(newLikedState);
    setLikesCount(newLikesCount);

    try {
        if (newLikedState) {
            await updateDoc(postRef, { likedBy: arrayUnion(user.id), likesCount: newLikesCount });
        } else {
            await updateDoc(postRef, { likedBy: arrayRemove(user.id), likesCount: newLikesCount });
        }
    } catch (error) {
        // Revert on error
        setIsLiked(!newLikedState);
        setLikesCount(likesCount);
        console.error("Error updating like:", error);
        toast({ title: 'Error', description: 'Could not update like status.', variant: 'destructive'});
    }
  };
  
  const isOwner = user?.id === post.author.id;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!isOwner || !user) return;
    setIsDeleting(true);
    const result = await deleteThreadPost(post.id, user.id);
    if(result.success) {
        toast({ title: "Post Deleted" });
        // The post will disappear from the feed due to the real-time listener in the parent.
    } else {
        toast({ title: "Error", description: result.error, variant: 'destructive'});
    }
    setIsDeleting(false);
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
                        {isOwner && (
                        <>
                            <DropdownMenuItem asChild>
                                <Link href={`/threads/edit/${post.id}`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Post
                                </Link>
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
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
                                <p className="text-sm text-muted-foreground">Attached Story</p>
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
            <CardFooter className="p-2 border-t flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleLike} className={cn(isLiked && 'text-red-500')}>
                <Heart className={cn("mr-2 h-4 w-4", isLiked && "fill-current")} /> {likesCount}
                </Button>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <MessageCircle className="mr-2 h-4 w-4" /> {post.commentsCount || 0}
                    </Button>
                </DialogTrigger>
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
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
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
