
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Send, Loader2, Book, Music, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Story, Song } from '@/types';
import Image from 'next/image';
import { Separator } from '../ui/separator';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const OWNER_USERNAME = 'authorrafaelnv';

export default function CreatePostForm() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Attachments
    const [attachedStory, setAttachedStory] = useState<Story | null>(null);
    const [attachedImage, setAttachedImage] = useState<File | null>(null);
    const [attachedImagePreview, setAttachedImagePreview] = useState<string | null>(null);
    const [attachedSong, setAttachedSong] = useState<Song | null>(null);
    const [lyricSnippet, setLyricSnippet] = useState<string | null>(null);
    
    // Story Search
    const [storySearchTerm, setStorySearchTerm] = useState('');
    const [storySearchResults, setStorySearchResults] = useState<Story[]>([]);
    const [isSearchingStories, setIsSearchingStories] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);

    // Only allow the owner to see this form
    if (!user || user.username !== OWNER_USERNAME) return null;

    const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                toast({ title: 'Image Too Large', description: `Please select an image smaller than ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB.`, variant: 'destructive' });
                return;
            }
            setAttachedImage(file);
            setAttachedImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSearchStories = async () => {
        if (!storySearchTerm.trim()) return;
        setIsSearchingStories(true);
        try {
            const q = query(
                collection(db, 'stories'), 
                where('visibility', '==', 'Public'), 
                where('title', '>=', storySearchTerm), 
                where('title', '<=', storySearchTerm + '\uf8ff'),
                limit(10)
            );
            const querySnapshot = await getDocs(q);
            setStorySearchResults(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story)));
        } catch (error) {
            console.error("Error searching stories:", error);
            toast({ title: "Search Failed", variant: "destructive" });
        } finally {
            setIsSearchingStories(false);
        }
    };
    
    const handleSubmit = async () => {
        if (!user || (!content.trim() && !attachedStory && !attachedImage && !attachedSong)) {
            toast({ title: 'Post is empty!', description: 'Please write something or add an attachment.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        let imageUrl = '';

        if (attachedImage) {
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
            const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
            if (!cloudName || !uploadPreset) {
                toast({ title: 'Configuration Error', variant: 'destructive' });
                setIsSubmitting(false);
                return;
            }
            const formData = new FormData();
            formData.append('file', attachedImage);
            formData.append('upload_preset', uploadPreset);
            try {
                const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
                const data = await res.json();
                imageUrl = data.secure_url;
            } catch (error) {
                toast({ title: 'Image upload failed', variant: 'destructive' });
                setIsSubmitting(false);
                return;
            }
        }
        
        try {
            await addDoc(collection(db, 'feedPosts'), {
                author: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
                content: content.trim(),
                storyId: attachedStory?.id || null,
                storyTitle: attachedStory?.title || null,
                storyCoverUrl: attachedStory?.coverImageUrl || null,
                imageUrl: imageUrl || null,
                songUrl: attachedSong ? `https://open.spotify.com/track/${attachedSong.id}` : null,
                songLyricSnippet: lyricSnippet || null,
                reactionsCount: 0,
                commentsCount: 0,
                timestamp: serverTimestamp()
            });
            setContent('');
            setAttachedStory(null);
            setAttachedImage(null);
            setAttachedImagePreview(null);
            setAttachedSong(null);
            setLyricSnippet(null);
            toast({ title: 'Announcement Published!' });
        } catch (error) {
            console.error("Error creating post:", error);
            toast({ title: "Failed to publish announcement", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const hasAttachment = attachedStory || attachedImagePreview || attachedSong;

    return (
        <Dialog>
          <Card className="mb-6 overflow-hidden">
              <CardHeader className="px-4 pt-4 pb-0">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">New Announcement</p>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <Avatar>
                      <AvatarImage src={user.avatarUrl} alt={user.displayName} data-ai-hint="profile person" />
                      <AvatarFallback>{user.username.substring(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="w-full">
                      <Textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="What's the latest update?"
                          className="bg-transparent border-0 focus-visible:ring-0 shadow-none resize-none p-0 min-h-[60px] text-base"
                      />
                  </div>
                </div>

                {hasAttachment && (
                  <div className="mt-4 pl-14 space-y-3">
                      {attachedImagePreview && (
                          <div className="relative w-32 h-32">
                              <Image src={attachedImagePreview} alt="Preview" layout="fill" objectFit="cover" className="rounded-md" />
                              <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full" onClick={() => { setAttachedImage(null); setAttachedImagePreview(null); }}>
                                  <X className="h-4 w-4" />
                              </Button>
                          </div>
                      )}
                      {attachedStory && (
                          <div className="relative p-2 border rounded-md flex items-center gap-2">
                              <Image src={attachedStory.coverImageUrl || `https://picsum.photos/seed/${attachedStory.id}/512/800`} alt={attachedStory.title} width={40} height={60} className="rounded-sm object-cover" />
                              <div className="flex-1">
                                  <p className="font-semibold text-sm">{attachedStory.title}</p>
                                  <p className="text-xs text-muted-foreground">by {attachedStory.author.displayName}</p>
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachedStory(null)}>
                                  <X className="h-4 w-4" />
                              </Button>
                          </div>
                      )}
                  </div>
                )}
              </CardContent>
              <Separator />
              <CardFooter className="p-2 flex justify-between items-center">
                  <div className="flex">
                      <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                      <Button variant="ghost" size="icon" onClick={() => imageInputRef.current?.click()}><ImageIcon className="h-5 w-5 text-muted-foreground" /></Button>
                      
                       <DialogTrigger asChild>
                           <Button variant="ghost" size="icon"><Book className="h-5 w-5 text-muted-foreground" /></Button>
                      </DialogTrigger>
                  </div>
                  <Button onClick={handleSubmit} disabled={isSubmitting || (!content.trim() && !hasAttachment)}>
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Post Announcement
                  </Button>
              </CardFooter>
          </Card>
          
          {/* Attach Story Modal */}
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Attach a Story</DialogTitle>
                  <DialogDescription>Search for one of your stories to attach to this announcement.</DialogDescription>
              </DialogHeader>
              <div className="flex gap-2">
                  <Input placeholder="Search story title..." value={storySearchTerm} onChange={e => setStorySearchTerm(e.target.value)} />
                  <Button onClick={handleSearchStories} disabled={isSearchingStories}>{isSearchingStories ? <Loader2 className="animate-spin h-4 w-4" /> : 'Search'}</Button>
              </div>
              <ScrollArea className="h-60 mt-4">
                  {storySearchResults.map(story => (
                      <DialogClose asChild key={story.id}>
                        <div className="p-2 border-b flex items-center justify-between hover:bg-muted cursor-pointer" onClick={() => setAttachedStory(story)}>
                            <div className="flex items-center gap-3">
                                <Image src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/80/120`} alt={story.title} width={30} height={45} className="rounded-sm object-cover" />
                                <span>{story.title}</span>
                            </div>
                            <Button size="sm" variant="outline">Attach</Button>
                        </div>
                      </DialogClose>
                  ))}
              </ScrollArea>
          </DialogContent>
        </Dialog>
    );
}
