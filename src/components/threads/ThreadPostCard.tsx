
'use client';

import { useState, useTransition } from 'react';
import type { ThreadPost } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreHorizontal, EyeOff, Loader2, Edit, Pin, Share2, Link as LinkIcon, Trash2 } from 'lucide-react';
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
import { deleteThreadPost, pinThreadPost } from '@/app/actions/threadActions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';


export default function ThreadPostCard({ post, onHide }: { post: ThreadPost, onHide: (postId: string) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessing, startProcessingTransition] = useTransition();
  const [isHiding, setIsHiding] = useState(false);

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

  const handleDeletePost = () => {
    if (!user) return;
    startProcessingTransition(async () => {
        const result = await deleteThreadPost(post.id, user.id);
        if (result.success) {
            toast({ title: 'Post Deleted' });
            // The parent component will handle the removal from the UI via real-time updates.
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
    });
  }

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(postUrl);
    toast({ title: 'Link Copied!', description: 'Post link copied to clipboard.' });
  }

  return (
    <>
      <Dialog>
         <AlertDialog>
          <Card className={cn("transition-opacity duration-300 relative", isHiding && "opacity-0")}>
          {post.isPinned && <Pin className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />}
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
                       {user?.id === post.author.id ? (
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
                              <DropdownMenuSeparator />
                               <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Post
                                  </DropdownMenuItem>
                              </AlertDialogTrigger>
                          </>
                      ) : (
                        <DropdownMenuItem onClick={() => onHide(post.id)}>
                            <EyeOff className="mr-2 h-4 w-4" /> Hide Post
                        </DropdownMenuItem>
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
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                          <Share2 className="mr-2 h-4 w-4" /> Share
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => toast({ title: 'Coming Soon!', description: 'Reposting will be available in a future update.' })}>
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
          
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete your post and remove its data from our servers.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>

          {/* Comments Dialog Content moved inside the main Dialog */}
          <DialogContent className="max-w-lg">
            <DialogHeader>
                <DialogTitle>Comments</DialogTitle>
            </DialogHeader>
            <ThreadPostComments postId={post.id} />
          </DialogContent>
          
          </AlertDialog>
        </Dialog>
    </>
  );
}
