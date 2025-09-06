
'use client'; 

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookHeart, Edit, Users, Loader2, Award, Swords, Rocket, Heart as HeartIcon, BookMarked, Wand2, PlusCircle, Send, Image as ImageIcon, X, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
import CompactStoryCard from '@/components/shared/CompactStoryCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { Story, UserSummary, Prompt, LiveFeedPost } from '@/types';
import { useEffect, useState, FormEvent, useRef, ChangeEvent } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy, limit as firestoreLimit, addDoc, serverTimestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavigationBar from '@/components/layout/BottomNavigationBar';
import Bookshelf from '@/components/shared/Bookshelf';
import StatusFeature from '@/components/status/StatusFeature';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/placeholder-data';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  archiveLiveFeedPost,
  updateLiveFeedPost,
  permanentlyDeleteLiveFeedPost,
} from '@/app/actions/liveFeedActions';
import { createPrompt, archivePrompt, updatePrompt } from '@/app/actions/promptActions';

function ForYouTabContent() {
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [storySpotlight, setStorySpotlight] = useState<Story | null>(null);
  const [featuredAuthors, setFeaturedAuthors] = useState<(UserSummary & { bio?: string, followersCount?: number })[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    setIsDataLoading(true);

    const storiesCol = collection(db, 'stories');
    const storiesQuery = query(
      storiesCol,
      where('visibility', '==', 'Public'),
      orderBy('lastUpdated', 'desc'),
      firestoreLimit(8)
    );

    const unsubscribeStories = onSnapshot(storiesQuery, (snapshot) => {
      const fetchedStories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          author: data.author || { id: 'unknown', username: 'Unknown' },
          lastUpdated: data.lastUpdated?.toDate ? data.lastUpdated.toDate().toISOString() : data.lastUpdated,
        } as Story;
      });

      setTrendingStories(fetchedStories.filter(s => s.status !== 'Draft'));

      if (fetchedStories.length > 0) {
        const availableForSpotlight = fetchedStories.filter(s => s.visibility === 'Public' && (s.status === 'Ongoing' || s.status === 'Completed'));
        if (availableForSpotlight.length > 0) {
          setStorySpotlight(availableForSpotlight[Math.floor(Math.random() * availableForSpotlight.length)]);
        } else if (fetchedStories.length > 0) {
          setStorySpotlight(fetchedStories.filter(s => s.status !== 'Draft')[0]);
        }
      }
    }, (error) => {
      console.error("Error fetching stories in real-time:", error);
    });

    const usersCol = collection(db, 'users');
    const authorsQuery = query(
      usersCol,
      orderBy('followersCount', 'desc'),
      firestoreLimit(6)
    );

    const unsubscribeAuthors = onSnapshot(authorsQuery, (snapshot) => {
      const fetchedAuthors = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          username: data.username,
          displayName: data.displayName || data.username,
          avatarUrl: data.avatarUrl,
          bio: data.bio,
          followersCount: data.followersCount,
        } as UserSummary & { bio?: string, followersCount?: number };
      });
      setFeaturedAuthors(fetchedAuthors);
      setIsDataLoading(false); 
    }, (error) => {
      console.error("Error fetching authors in real-time:", error);
      setIsDataLoading(false);
    });

    return () => {
      unsubscribeStories();
      unsubscribeAuthors();
    };
  }, []);
  
  const popularGenres = [
    { name: "Fantasy", icon: Swords, blurb: "Epic quests & magical realms await.", dataAiHint: "dragon castle", cover: "https://placehold.co/512x800.png" },
    { name: "Sci-Fi", icon: Rocket, blurb: "Explore galaxies & future tech.", dataAiHint: "space station", cover: "https://placehold.co/512x800.png"},
    { name: "Romance", icon: HeartIcon, blurb: "Heartfelt connections & love stories.", dataAiHint: "couple sunset", cover: "https://placehold.co/512x800.png"},
  ];
  
  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-20rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-16 md:space-y-24 py-8">
      {/* Story Spotlight Section */}
      {storySpotlight && (
        <section>
          <h2 className="text-2xl font-headline font-bold mb-8 text-center text-accent flex items-center justify-center gap-3">
            <Award className="h-8 w-8" /> Story Spotlight
          </h2>
          <Card className="w-full max-w-4xl mx-auto overflow-hidden shadow-2xl hover:shadow-primary/20 transition-all duration-300 group">
            <div className="md:flex">
              <div className="md:flex-shrink-0 md:w-1/3 relative aspect-[2/3]">
                <Image
                  src={storySpotlight.coverImageUrl || `https://placehold.co/512x800.png`}
                  alt={storySpotlight.title}
                  layout="fill"
                  objectFit="cover"
                  className="group-hover:scale-105 transition-transform duration-500"
                  data-ai-hint={storySpotlight.dataAiHint || "book cover epic"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent md:bg-gradient-to-r"></div>
              </div>
              <div className="p-6 md:p-8 flex flex-col justify-between flex-1 bg-card">
                <div>
                  <Badge variant="secondary" className="mb-2 bg-accent text-accent-foreground">{storySpotlight.genre}</Badge>
                  <CardTitle className="text-2xl font-headline group-hover:text-primary transition-colors">{storySpotlight.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground mt-1 mb-3">
                    By <Link href={`/profile/${storySpotlight.author.id}`} className="hover:underline font-medium">{storySpotlight.author.displayName || storySpotlight.author.username}</Link>
                  </CardDescription>
                  <p className="text-muted-foreground text-sm line-clamp-4 mb-4">{storySpotlight.summary}</p>
                </div>
                <CardFooter className="p-0 flex flex-col sm:flex-row gap-3">
                  <Link href={`/stories/${storySpotlight.id}`} passHref className="w-full sm:w-auto">
                    <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                      <BookHeart className="mr-2 h-5 w-5" /> Read Now
                    </Button>
                  </Link>
                </CardFooter>
              </div>
            </div>
          </Card>
        </section>
      )}

      {/* Trending Stories Section */}
      <section>
        <div className="flex flex-col mb-6">
            <Link href="/stories" passHref className="self-end">
                <Button variant="outline" className="text-sm">View All Stories <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
            <h2 className="text-2xl font-headline font-bold text-primary mt-1">Trending Stories</h2>
        </div>
        <div className="relative">
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {trendingStories.map(story => (
                <CompactStoryCard key={`trending-${story.id}`} story={story} />
            ))}
            {trendingStories.length === 0 && <p className="text-muted-foreground">No trending stories to display.</p>}
            <div className="flex-shrink-0 w-px"></div>
            </div>
        </div>
      </section>
      
      {/* Quick Dive Genre Teasers Section */}
      <section>
        <h2 className="text-2xl font-headline font-bold mb-8 text-center">Dive Into Your Next Obsession</h2>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {popularGenres.map(genre => {
            const GenreIcon = genre.icon;
            return (
              <Card key={genre.name} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 group">
                <CardHeader className="p-0 relative aspect-[3/2] md:aspect-video">
                  <Image src={genre.cover} alt={genre.name} layout="fill" objectFit="cover" data-ai-hint={genre.dataAiHint} className="group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center">
                    <GenreIcon className="h-12 w-12 text-white mb-2 drop-shadow-lg" />
                    <CardTitle className="text-2xl font-headline text-white drop-shadow-lg">{genre.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">{genre.blurb}</p>
                   <Link href={`/stories?genre=${genre.name.toLowerCase()}`} passHref>
                     <Button variant="ghost" className="text-primary hover:text-primary/80 hover:bg-primary/10 w-full">
                        Explore {genre.name} <ArrowRight className="ml-2 h-4 w-4" />
                     </Button>
                   </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Featured Authors Section */}
      {featuredAuthors.length > 0 && (
      <section>
        <h2 className="text-2xl font-headline font-bold text-accent mb-6">Featured Authors</h2>
         <div className="relative">
            <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-accent/50 scrollbar-track-transparent">
            {featuredAuthors.map(author => (
                <Link href={`/profile/${author.id}`} key={`author-${author.id}`} passHref>
                <div className="flex-shrink-0 w-52 group cursor-pointer">
                    <Card className="flex flex-col items-center p-4 bg-card rounded-lg shadow-md hover:shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 h-full">
                    <Avatar className="w-28 h-28 mb-4 border-4 border-accent/30 group-hover:border-accent transition-colors">
                        <AvatarImage src={author.avatarUrl || `https://placehold.co/120x120.png`} alt={author.displayName || author.username} data-ai-hint="profile person" />
                        <AvatarFallback className="text-3xl">{author.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <h3 className="text-lg font-semibold font-headline text-center group-hover:text-accent transition-colors">{author.displayName || author.username}</h3>
                    <p className="text-xs text-muted-foreground text-center line-clamp-2 mt-1 flex-grow">{(author.bio || "Passionate Creator").substring(0,60)}{author.bio && author.bio.length > 60 ? "..." : ""}</p>
                    </Card>
                </div>
                </Link>
            ))}
            <div className="flex-shrink-0 w-px"></div>
            </div>
        </div>
      </section>
      )}
    </div>
  );
}

function LiveFeedTabContent() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<LiveFeedPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isUserAuthenticated = user && !user.isAnonymous;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

  useEffect(() => {
    const q = query(collection(db, 'liveFeed'), where('isArchived', '==', false), orderBy('timestamp', 'desc'), firestoreLimit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const livePosts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as LiveFeedPost));
      setPosts(livePosts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching live feed: ", error);
      toast({ title: "Error", description: "Could not load the live feed.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast({ title: "Image Too Large", description: `Please select an image smaller than ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB.`, variant: "destructive" });
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setNewPostContent('');
    setImageFile(null);
    setImagePreview(null);
    if (imageInputRef.current) {
        imageInputRef.current.value = "";
    }
  };

  const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isUserAuthenticated) {
      toast({ title: "Please sign in", description: "You must be logged in to post.", variant: "destructive" });
      return;
    }
    if (!newPostContent.trim() && !imageFile) {
        toast({ title: "Cannot post empty content", variant: 'destructive' });
        return;
    }
    if (newPostContent.trim().length > 500) {
        toast({ title: 'Too Long', description: 'Post cannot exceed 500 characters.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    let imageUrl: string | undefined = undefined;

    if (imageFile) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) {
            toast({ title: 'Configuration Error', description: 'Cloudinary environment variables are not set.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('upload_preset', uploadPreset);
        
        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
            const data = await response.json();
            if (data.secure_url) {
                imageUrl = data.secure_url;
            } else {
                throw new Error(data.error?.message || 'Unknown Cloudinary error');
            }
        } catch (error) {
            console.error('Error uploading image to Cloudinary:', error);
            toast({ title: 'Image Upload Failed', description: 'Could not upload your image. Please try again.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }
    }
    
    const authorSummary: UserSummary = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
    
    try {
        const postData: any = {
            author: authorSummary,
            authorId: user.id,
            content: newPostContent.trim(),
            timestamp: serverTimestamp(),
            isArchived: false,
        };

        if (imageUrl) {
            postData.imageUrl = imageUrl;
        }

        await addDoc(collection(db, 'liveFeed'), postData);
        resetForm();
    } catch (error) {
        console.error('Error creating live feed post:', error);
        toast({ title: 'Error', description: 'Could not create post. Please try again.', variant: 'destructive' });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="max-w-xl mx-auto space-y-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Live Feed</CardTitle>
            <CardDescription>Share a quick text update with the community.</CardDescription>
          </CardHeader>
          <form onSubmit={handlePostSubmit}>
            <CardContent>
              <Textarea 
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder={isUserAuthenticated ? "What's happening?" : "Sign in to post in the live feed"}
                maxLength={500}
                disabled={isSubmitting || !isUserAuthenticated}
              />
              {imagePreview && (
                  <div className="mt-4 relative w-full max-w-xs">
                      <Image src={imagePreview} alt="Preview" width={400} height={400} className="rounded-lg object-contain border" />
                      <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                          <X className="h-4 w-4" />
                      </Button>
                  </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between items-center">
              <div>
                  <input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                  <Button type="button" variant="ghost" size="icon" title="Attach an image" onClick={() => imageInputRef.current?.click()} disabled={isSubmitting || !isUserAuthenticated || !!imageFile}>
                      <ImageIcon className="h-5 w-5" />
                  </Button>
              </div>
              <Button type="submit" disabled={isSubmitting || !isUserAuthenticated || (!newPostContent.trim() && !imageFile)}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
                Post
              </Button>
            </CardFooter>
          </form>
        </Card>
        
        {isLoading ? (
          <div className="text-center py-10"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">The feed is quiet... be the first to post!</p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <Card key={post.id}>
                <CardContent className="p-4 relative">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={post.author.avatarUrl} data-ai-hint="profile person"/>
                      <AvatarFallback>{post.author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <Link href={`/profile/${post.author.id}`} className="font-semibold hover:underline">{post.author.displayName}</Link>
                        <p className="text-xs text-muted-foreground">{formatDate(post.timestamp)}</p>
                      </div>
                      {post.content && <p className="text-foreground/90 whitespace-pre-line mt-1">{post.content}</p>}
                      {post.imageUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border">
                              <Image src={post.imageUrl} alt="Live feed image" width={500} height={500} className="w-full h-auto object-contain bg-muted" />
                          </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PromptsTabContent() {
    const { user } = useAuth();
    const [prompts, setPrompts] = useState<Prompt[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const isUserAuthenticated = user && !user.isAnonymous;

    const [newPromptTitle, setNewPromptTitle] = useState('');
    const [newPromptText, setNewPromptText] = useState('');
    const [newPromptGenre, setNewPromptGenre] = useState('fantasy');

    const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
    const [editedPromptData, setEditedPromptData] = useState({ title: '', prompt: '', genre: '' });

    useEffect(() => {
        const q = query(collection(db, 'prompts'), where('isArchived', '==', false), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const promptsData = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
            setPrompts(promptsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching prompts: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    const handlePromptSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isUserAuthenticated) {
            toast({title: "Please sign in", description: "You must be logged in to create a prompt.", variant: "destructive"});
            return;
        }
        if (!newPromptTitle.trim() || !newPromptText.trim() || !newPromptGenre.trim()) {
            toast({ title: 'All Fields Required', description: 'Please fill out all fields to create a prompt.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        const authorSummary: UserSummary = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
        
        const result = await createPrompt({
            title: newPromptTitle,
            prompt: newPromptText,
            genre: newPromptGenre,
            author: authorSummary,
        });

        if (result.success) {
            toast({title: "Prompt Created!", description: "Your new prompt is now available for everyone."});
            setNewPromptTitle('');
            setNewPromptText('');
            setNewPromptGenre('fantasy');
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        }
        setIsSubmitting(false);
    };

    const handleEditPrompt = async () => {
      if (!editingPrompt || !user) return;
      setIsSubmitting(true);

      const originalPrompts = prompts;
      setPrompts(prompts.map(p => p.id === editingPrompt.id ? { ...p, ...editedPromptData } : p));
      setEditingPrompt(null);
      
      const result = await updatePrompt(editingPrompt.id, editedPromptData, user.id);

      if (result.success) {
        toast({ title: 'Prompt Updated' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        setPrompts(originalPrompts);
      }
      setIsSubmitting(false);
    };
  
    const handleArchivePrompt = async (promptToArchive: Prompt) => {
      if (!user) return;
      
      const originalPrompts = prompts;
      setPrompts(prompts.filter(p => p.id !== promptToArchive.id));

      const result = await archivePrompt(promptToArchive.id, user.id);
      if (result.success) {
        toast({ title: 'Prompt Archived' });
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
        setPrompts(originalPrompts);
      }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <>
        <div className="py-8 max-w-3xl mx-auto space-y-8">
             <Card>
                <CardHeader>
                    <CardTitle>Create a New Prompt</CardTitle>
                    <CardDescription>Inspire the community with a new writing challenge.</CardDescription>
                </CardHeader>
                <form onSubmit={handlePromptSubmit}>
                    <CardContent className="space-y-4">
                         <div>
                            <Label htmlFor="prompt-title">Title</Label>
                            <Input id="prompt-title" value={newPromptTitle} onChange={e => setNewPromptTitle(e.target.value)} placeholder="e.g., The Last Sunrise" disabled={isSubmitting || !isUserAuthenticated} />
                         </div>
                          <div>
                            <Label htmlFor="prompt-genre">Genre</Label>
                            <Select value={newPromptGenre} onValueChange={(val) => setNewPromptGenre(val as string)} disabled={isSubmitting || !isUserAuthenticated}>
                                <SelectTrigger id="prompt-genre"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="fantasy">Fantasy</SelectItem>
                                    <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                                    <SelectItem value="romance">Romance</SelectItem>
                                    <SelectItem value="thriller">Thriller</SelectItem>
                                    <SelectItem value="mystery">Mystery</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label htmlFor="prompt-text">Prompt</Label>
                            <Textarea id="prompt-text" value={newPromptText} onChange={e => setNewPromptText(e.target.value)} placeholder="Describe the writing prompt..." disabled={isSubmitting || !isUserAuthenticated} rows={4}/>
                         </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmitting || !isUserAuthenticated || !newPromptTitle.trim() || !newPromptText.trim()}>
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4"/>}
                            Create Prompt
                        </Button>
                    </CardFooter>
                </form>
             </Card>

             <div className="space-y-6">
                {prompts.length > 0 ? prompts.map((item) => (
                    <Card key={item.id} className="shadow-sm hover:shadow-md transition-shadow relative">
                         {user?.id === item.author.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => {
                                setEditingPrompt(item);
                                setEditedPromptData({ title: item.title, prompt: item.prompt, genre: item.genre });
                              }}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                    className="text-yellow-600 focus:bg-yellow-100/10 focus:text-yellow-700"
                                    onSelect={(e) => e.preventDefault()}
                                    >
                                    <Archive className="mr-2 h-4 w-4" /> Archive
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Archive this prompt?</AlertDialogTitle>
                                        <AlertDialogDescription>This will hide the prompt from the main feed. You can view and permanently delete it from your settings.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleArchivePrompt(item)} className="bg-yellow-500 hover:bg-yellow-500/90 text-background">Archive Prompt</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <CardHeader>
                            <div className="flex items-center gap-3">
                               <Edit className="h-6 w-6 text-accent"/>
                               <CardTitle className="font-headline">{item.title}</CardTitle>
                            </div>
                            <CardDescription>Genre: {item.genre} | By: <Link href={`/profile/${item.author.id}`} className="hover:underline">{item.author?.displayName || item.author?.username || 'Community'}</Link></CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-foreground/90">{item.prompt}</p>
                        </CardContent>
                        <CardFooter>
                            <Link href={`/write/edit-details?prompt=${encodeURIComponent(item.prompt)}&title=${encodeURIComponent(item.title)}&genre=${encodeURIComponent(item.genre)}`} passHref>
                                <Button>
                                    <Edit className="mr-2 h-4 w-4"/>
                                    Start Writing
                                </Button>
                            </Link>
                        </CardFooter>
                    </Card>
                )) : (
                    <p className="text-muted-foreground text-center py-10">No prompts available right now. Check back soon!</p>
                )}
             </div>
        </div>
        
        {/* Edit Prompt Dialog */}
        <Dialog open={!!editingPrompt} onOpenChange={(open) => !open && setEditingPrompt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-prompt-title">Title</Label>
                <Input id="edit-prompt-title" value={editedPromptData.title} onChange={e => setEditedPromptData(d => ({...d, title: e.target.value}))} />
              </div>
              <div>
                <Label htmlFor="edit-prompt-genre">Genre</Label>
                <Select value={editedPromptData.genre} onValueChange={(val) => setEditedPromptData(d => ({...d, genre: val}))}>
                  <SelectTrigger id="edit-prompt-genre"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-prompt-text">Prompt</Label>
                <Textarea id="edit-prompt-text" value={editedPromptData.prompt} onChange={e => setEditedPromptData(d => ({...d, prompt: e.target.value}))} rows={5} />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button onClick={handleEditPrompt} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
}


export default function HomePage() {
  const { authLoading } = useAuth();
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 pb-24 md:pb-8">
        <section className="mb-8">
          <StatusFeature />
        </section>

        <Tabs defaultValue="for-you" className="w-full">
          <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-sm -mx-4 px-4 py-2 border-b">
            <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
              <TabsTrigger value="for-you">For You</TabsTrigger>
              <TabsTrigger value="live-feed">Live Feed</TabsTrigger>
              <TabsTrigger value="bookshelf">Bookshelf</TabsTrigger>
              <TabsTrigger value="prompts">Prompts</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="for-you" className="mt-6">
            <ForYouTabContent />
          </TabsContent>
          <TabsContent value="live-feed" className="mt-6">
            <LiveFeedTabContent />
          </TabsContent>
          <TabsContent value="bookshelf" className="mt-6">
            <Bookshelf />
          </TabsContent>
          <TabsContent value="prompts" className="mt-6">
            <PromptsTabContent />
          </TabsContent>
        </Tabs>
      </main>
      <BottomNavigationBar />
    </>
  );
}

    
