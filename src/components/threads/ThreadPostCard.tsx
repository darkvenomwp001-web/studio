
'use client';

import { useState, useTransition } from 'react';
import type { ThreadPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreHorizontal, EyeOff, Loader2, Edit, Pin, Share2, Link as LinkIcon, Trash2, Repeat } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import SpotifyPlayer from '../shared/SpotifyPlayer';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ThreadPostComments from './ThreadPostComments';
import ReactionButton from './ReactionButton';
import { deleteThreadPost, pinThreadPost, hideThreadPost, repostThreadPost } from '@/app/actions/threadActions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


function OriginalPostContent({ post }: { post: ThreadPost | ThreadPost['originalPost'] }) {
    if (!post) return null;
    return (
        <div className="space-y-4">
            {post.content && <p className="whitespace-pre-line">{post.content}</p>}
            
            {post.storyId && (
                <Link href={`/stories/${post.storyId}`}>
                    <div className="border rounded-lg p-3 flex gap-3 hover:bg-muted/50 transition-colors">
                        <Image src={post.storyCoverUrl || `https://picsum.photos/seed/${post.id}/512/800`} alt={post.storyTitle || ''} width={50} height={75} className="rounded-sm object-cover" />
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
                </div>
            )}
        </div>
    )
}


export default function ThreadPostCard({ post }: { post: ThreadPost }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, startProcessingTransition] = useTransition();

  const handlePinPost = () => {
      if (!user) return;
      startProcessingTransition(async () => {
          const result = await pinThreadPost(post.id, user.id);
          if (result.success) {
              toast({ title: post.isPinned ? 'Post Unpinned' : 'Post Pinned!' });
          } else {
              toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
      });
  }

  const handleRepost = () => {
      if (!user) {
        toast({title: "Please sign in to repost.", variant: "destructive"});
        return;
      };
      const originalPostId = post.type === 'repost' ? post.originalPost!.id : post.id;
      startProcessingTransition(async () => {
          const result = await repostThreadPost(originalPostId, user);
          if (result.success) {
              toast({ title: 'Reposted!' });
          } else {
              toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
      });
  }

  const handleHidePost = () => {
      if (!user) return;
      startProcessingTransition(async () => {
          const result = await hideThreadPost(post.id, user.id);
          if (result.success) {
              toast({ title: 'Post Hidden' });
          } else {
              toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
      });
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({ title: 'Link Copied!', description: 'Post link copied to clipboard.' });
  }
  
  if (post.isHidden) {
    return null;
  }
  
  const isRepost = post.type === 'repost' && post.originalPost;
  const mainAuthor = isRepost ? post.originalPost!.author : post.author;
  const displayTimestamp = isRepost ? post.originalPost!.timestamp : post.timestamp;


  return (
    <Dialog>
       <AlertDialog>
        <Card className={cn("transition-opacity duration-300 relative")}>
        {post.isPinned && <Pin className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />}
        {isRepost && (
            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2 px-4 pt-3">
                <Repeat className="h-3 w-3"/>
                <Link href={`/profile/${post.author.id}`} className="hover:underline">{post.author.displayName}</Link> reposted
            </p>
        )}
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
            <Link href={`/profile/${mainAuthor.id}`}>
            <Avatar>
                <AvatarImage src={mainAuthor.avatarUrl} alt={mainAuthor.displayName} data-ai-hint="profile person" />
                <AvatarFallback>{mainAuthor.username.substring(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            </Link>
            <div className="flex-1">
            <Link href={`/profile/${mainAuthor.id}`} className="font-semibold hover:underline">{mainAuthor.displayName}</Link>
            <p className="text-xs text-muted-foreground">
                {displayTimestamp?.toDate ? formatDistanceToNow(displayTimestamp.toDate(), { addSuffix: true }) : 'now'}
            </p>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                     {user?.id === post.author.id && post.type === 'original' && (
                        <>
                            <DropdownMenuItem onClick={handlePinPost}>
                                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pin className="mr-2 h-4 w-4" />}
                                {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                            </DropdownMenuItem>
                            <Link href={`/threads/edit/${post.id}`}>
                                <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Post
                                </DropdownMenuItem>
                            </Link>
                        </>
                    )}
                    <DropdownMenuItem onClick={handleHidePost}>
                        <EyeOff className="mr-2 h-4 w-4" /> Hide Post
                    </DropdownMenuItem>
                    {user?.id === post.author.id && (
                         <AlertDialogTrigger asChild>
                           <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                               <Trash2 className="mr-2 h-4 w-4"/>
                               Delete Post
                           </DropdownMenuItem>
                        </AlertDialogTrigger>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
        <CardContent className="p-4 pt-0">
           <OriginalPostContent post={isRepost ? post.originalPost! : post} />
        </CardContent>
        <CardFooter className="p-2 border-t flex items-center justify-between">
            <ReactionButton postId={post.id} initialReactionsCount={post.reactionsCount || 0} />
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                    <MessageCircle className="mr-2 h-4 w-4" /> {post.commentsCount || 0} Comments
                </Button>
            </DialogTrigger>
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <Repeat className="mr-2 h-4 w-4" />{post.repostCount || 0} Reposts
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleRepost} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4" />}
                        Repost
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCopyLink}>
                        <LinkIcon className="mr-2 h-4 w-4" />
                        Copy Link
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardFooter>
        </Card>
        
        <DialogContent className="max-w-lg">
          <DialogHeader>
              <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <ThreadPostComments postId={post.id} />
        </DialogContent>

         <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post?</AlertDialogTitle>
                  <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this post.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => {
                          if (!user) return;
                          startProcessingTransition(async () => {
                              await deleteThreadPost(post.id, user.id);
                              toast({ title: 'Post deleted' });
                          });
                      }}
                  >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        
       </AlertDialog>
      </Dialog>
  );
}
