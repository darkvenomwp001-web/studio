
'use client';

import { useState } from 'react';
import type { ThreadPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, MoreHorizontal, Edit, EyeOff, Save, Loader2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { Textarea } from '../ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateThreadPost, deleteThreadPost } from '@/app/actions/threadActions';


export default function ThreadPostCard({ post, onHide }: { post: ThreadPost, onHide: (postId: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(user && post.likedBy.includes(user.id));
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    const postRef = doc(db, 'feedPosts', post.id);
    if (isLiked) {
      setLikesCount(prev => prev - 1);
      setIsLiked(false);
      await updateDoc(postRef, { likedBy: arrayRemove(user.id), likesCount: likesCount - 1 });
    } else {
      setLikesCount(prev => prev + 1);
      setIsLiked(true);
      await updateDoc(postRef, { likedBy: arrayUnion(user.id), likesCount: likesCount + 1 });
    }
  };

  const handleUpdatePost = async () => {
    if (!user || editedContent.trim() === post.content) {
        setIsEditing(false);
        return;
    }
    setIsProcessing(true);
    const result = await updateThreadPost(post.id, editedContent);
    if (result.success) {
        toast({ title: 'Post Updated' });
        setIsEditing(false);
    } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
    setIsProcessing(false);
  };
  
  const handleDelete = async () => {
      if (!user) return;
      setIsProcessing(true);
      const result = await deleteThreadPost(post.id);
       if (result.success) {
          toast({ title: 'Post Deleted' });
          // The component will be removed from the list by the parent's real-time listener
      } else {
          toast({ title: 'Error', description: result.error, variant: 'destructive' });
          setIsProcessing(false);
      }
  }

  const isOwner = user?.id === post.author.id;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
        <Link href={`/profile/${post.author.id}`}>
          <Avatar>
            <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} />
            <AvatarFallback>{post.author.username.substring(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1">
          <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline">{post.author.displayName}</Link>
          <p className="text-xs text-muted-foreground">
            {post.timestamp?.toDate ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : 'now'}
          </p>
        </div>
        <AlertDialog>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {isOwner ? (
                        <>
                            <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Post
                            </DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Post
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                        </>
                    ) : (
                        <DropdownMenuItem onClick={() => onHide(post.id)}>
                            <EyeOff className="mr-2 h-4 w-4" />
                            Hide Post
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
            {isOwner && (
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this post permanently?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. Your post will be removed forever.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null} Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            )}
        </AlertDialog>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        {isEditing ? (
            <div className="space-y-2">
                <Textarea 
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[80px]"
                />
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdatePost} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4" />}
                        Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
            </div>
        ) : (
            post.content && <p className="whitespace-pre-line">{post.content}</p>
        )}
        
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
        <Button variant="ghost" size="sm">
          <MessageCircle className="mr-2 h-4 w-4" /> {post.commentsCount}
        </Button>
      </CardFooter>
    </Card>
  );
}
