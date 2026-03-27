
'use client';

import { useState, useTransition, useRef } from 'react';
import type { ThreadPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreHorizontal, EyeOff, Loader2, Edit, Pin, Share2, Link as LinkIcon, Trash2, Repeat, X } from 'lucide-react';
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

const OWNER_HANDLES = ['authorrafaelnv', 'd4rkv3nom'];

export default function ThreadPostCard({ post }: { post: ThreadPost }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, startProcessingTransition] = useTransition();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isOwner = user && OWNER_HANDLES.includes(user.username);
  const isPostAuthor = user?.id === post.author.id;
  const canManage = isPostAuthor || isOwner;

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

  const handleDeletePost = () => {
    if (!user) return;
    startProcessingTransition(async () => {
        const result = await deleteThreadPost(post.id, user.id);
        if (result.success) {
            toast({ title: 'Post deleted' });
            setIsDeleteDialogOpen(false);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    });
  };

  const formatPostDate = (timestamp: any) => {
    if (!timestamp) return 'now';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
        return 'recently';
    }
  };
  
  if (post.isHidden) {
    return null;
  }
  
  const isRepost = post.type === 'repost' && post.originalPost;
  const mainAuthor = isRepost ? post.originalPost!.author : post.author;
  const displayTimestamp = isRepost ? post.originalPost!.timestamp : post.timestamp;
  const imageUrlForPreview = isRepost ? post.originalPost?.imageUrl : post.imageUrl;

  return (
    <>
      <Dialog>
          <Card className={cn("transition-opacity duration-300 relative border-border/40 shadow-sm")}>
            {post.isPinned && <Pin className="absolute top-3 left-3 h-4 w-4 text-primary" />}
            {isRepost && (
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2 px-4 pt-3">
                <Repeat className="h-3 w-3"/>
                <Link href={`/profile/${post.author.id}`} className="hover:underline">@{post.author.username}</Link> reposted
              </p>
            )}
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 p-4">
              <Link href={`/profile/${mainAuthor.id}`}>
                <Avatar className="border border-border/20">
                  <AvatarImage src={mainAuthor.avatarUrl} alt={mainAuthor.displayName} data-ai-hint="profile person" />
                  <AvatarFallback>{mainAuthor.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1">
                <Link href={`/profile/${mainAuthor.id}`} className="font-bold hover:underline text-sm md:text-base text-foreground">@{mainAuthor.username}</Link>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  {formatPostDate(displayTimestamp)}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {canManage && post.type === 'original' && (
                    <>
                      <DropdownMenuItem onClick={handlePinPost} className="gap-2">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pin className="h-4 w-4" />}
                        {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                      </DropdownMenuItem>
                      <Link href={`/threads/edit/${post.id}`}>
                        <DropdownMenuItem className="gap-2">
                          <Edit className="h-4 w-4" />
                          Edit Post
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}
                  <DropdownMenuItem onClick={handleHidePost} className="gap-2">
                    <EyeOff className="h-4 w-4" /> Hide Post
                  </DropdownMenuItem>
                  {canManage && (
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive gap-2" onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete Post
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <div className="space-y-4">
                    { isRepost ? 
                        (post.originalPost?.content && <p className="whitespace-pre-line text-sm md:text-base leading-relaxed text-foreground/90">{post.originalPost.content}</p>) : 
                        (post.content && <p className="whitespace-pre-line text-sm md:text-base leading-relaxed text-foreground/90">{post.content}</p>)
                    }
                    
                    { (isRepost ? post.originalPost?.storyId : post.storyId) && (
                        <Link href={`/stories/${isRepost ? post.originalPost!.storyId : post.storyId}`}>
                            <div className="border rounded-xl p-3 flex gap-3 hover:bg-muted/50 transition-all shadow-sm bg-muted/20 group/story">
                                <div className="relative w-[50px] h-[75px] rounded-sm overflow-hidden flex-shrink-0">
                                    <Image src={(isRepost ? post.originalPost!.storyCoverUrl : post.storyCoverUrl) || `https://picsum.photos/seed/${post.id}/512/800`} alt={(isRepost ? post.originalPost!.storyTitle : post.storyTitle) || ''} layout="fill" className="object-cover group-hover/story:scale-105 transition-transform" />
                                </div>
                                <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                    <p className="font-bold text-sm truncate group-hover/story:text-primary transition-colors">{(isRepost ? post.originalPost!.storyTitle : post.storyTitle)}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight font-semibold">by @{(isRepost ? post.originalPost!.author.username : post.author.username)}</p>
                                </div>
                            </div>
                        </Link>
                    )}
                    {imageUrlForPreview && (
                        <div 
                            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer shadow-sm border border-border/40 group/image"
                            onClick={() => setIsPreviewOpen(true)}
                        >
                            <Image src={imageUrlForPreview} alt="Post image" layout="fill" className="object-cover group-hover/image:scale-[1.02] transition-transform duration-500" />
                        </div>
                    )}
                    {(isRepost ? post.originalPost?.songUrl : post.songUrl) && (
                        <div className="rounded-xl overflow-hidden shadow-sm border border-border/40">
                            <SpotifyPlayer trackUrl={(isRepost ? post.originalPost!.songUrl : post.songUrl)} />
                        </div>
                    )}
                </div>
            </CardContent>
            <CardFooter className="p-2 border-t border-border/40 flex items-center justify-between">
              <ReactionButton postId={post.id} initialReactionsCount={post.reactionsCount || 0} />
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary transition-colors gap-2">
                  <MessageCircle className="h-4 w-4" /> 
                  <span className="text-xs font-semibold">{post.commentsCount || 0}</span>
                </Button>
              </DialogTrigger>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent transition-colors gap-2">
                    <Repeat className="h-4 w-4" />
                    <span className="text-xs font-semibold">{post.repostCount || 0}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={handleRepost} disabled={isProcessing} className="gap-2">
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <Repeat className="h-4 w-4" />}
                    Repost to my feed
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleCopyLink} className="gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Copy Post Link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
          
          <DialogContent className="max-w-lg p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
            <DialogHeader className="p-4 border-b bg-muted/30">
              <DialogTitle className="text-lg font-headline">Conversation</DialogTitle>
            </DialogHeader>
            <div className="p-4">
                <ThreadPostComments postId={post.id} />
            </div>
          </DialogContent>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this update?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action is permanent and cannot be undone. The post and all of its comments will be removed from D4RKV3NOM.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDeletePost}
                >
                  {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete Permanently'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-4xl h-auto">
            <DialogHeader className="sr-only">
                <DialogTitle>Image Preview</DialogTitle>
                <DialogDescription>Full-screen view of the post image.</DialogDescription>
            </DialogHeader>
            {imageUrlForPreview && (
                <div className="relative w-full h-auto flex items-center justify-center p-4">
                    <Image src={imageUrlForPreview} alt="Post preview" width={1600} height={1600} className="rounded-2xl object-contain w-full h-auto shadow-2xl ring-1 ring-white/10" />
                    <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(false)} className="absolute top-6 right-6 bg-black/40 hover:bg-black/60 text-white rounded-full">
                        <X className="h-6 w-6" />
                    </Button>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </>
  );
}
