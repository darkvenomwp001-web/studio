
'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, Save, Settings, Trash2, PlusCircle, Edit, BookOpen, Users, Info, Eye, EyeOff, ShieldQuestion } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { placeholderStories, upsertStoryAndSave, deleteChapterFromStory, initializeUserStoryLists, formatDate } from '@/lib/placeholder-data';
import type { Story, Chapter, UserSummary } from '@/types';
import { cn } from '@/lib/utils';

export default function EditStoryDetailsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');

  const [story, setStory] = useState<Story | null>(null);
  const [storyTitle, setStoryTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [genre, setGenre] = useState('fantasy');
  const [tags, setTags] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [language, setLanguage] = useState('English');
  const [isMature, setIsMature] = useState(false);
  const [visibility, setVisibility] = useState<'Public' | 'Private' | 'Unlisted'>('Public');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null);

  useEffect(() => {
     if (typeof window !== 'undefined') {
        initializeUserStoryLists(); // Ensure stories are loaded from localStorage
    }
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user) {
        setIsLoading(true);
        let storyToEdit: Story | undefined | null = null;
        if (queryStoryId) {
            storyToEdit = placeholderStories.find(s => s.id === queryStoryId && s.author.id === user.id);
            if (!storyToEdit) {
                toast({ title: "Error", description: "Story not found or you don't have permission to edit it.", variant: "destructive" });
                router.push('/write');
                return;
            }
        } else { // New story
            storyToEdit = {
                id: `story-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                title: 'New Story Title',
                author: { id: user.id, username: user.username, displayName: user.displayName || user.username, avatarUrl: user.avatarUrl },
                genre: 'fantasy',
                summary: '',
                tags: [],
                chapters: [],
                status: 'Draft',
                lastUpdated: new Date().toISOString(),
                coverImageUrl: 'https://placehold.co/512x800.png',
                language: 'English',
                isMature: false,
                visibility: 'Private',
                collaborators: [],
            };
            // Immediately save this new story structure to localStorage so it has an ID for chapter creation.
            upsertStoryAndSave(storyToEdit);
            // Update URL to include the new storyId for subsequent operations like adding chapters
            router.replace(`/write/edit-details?storyId=${storyToEdit.id}`, { scroll: false });
        }

        if (storyToEdit) {
            setStory(storyToEdit);
            setStoryTitle(storyToEdit.title);
            setSummary(storyToEdit.summary);
            setGenre(storyToEdit.genre.toLowerCase());
            setTags(storyToEdit.tags.join(', '));
            setCoverImageUrl(storyToEdit.coverImageUrl || 'https://placehold.co/512x800.png');
            setLanguage(storyToEdit.language || 'English');
            setIsMature(storyToEdit.isMature || false);
            setVisibility(storyToEdit.visibility || 'Public');
        }
        setIsLoading(false);
    }

  }, [queryStoryId, user, authLoading, router, toast]);

  const handleCoverImageClick = () => {
    // Mock file upload
    const newCover = prompt("Enter new cover image URL (mock):", coverImageUrl);
    if (newCover) {
      setCoverImageUrl(newCover);
      toast({ title: "Cover Image Updated (Mock)", description: "URL set. In a real app, this would be an upload." });
    }
  };

  const handleSaveChanges = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!story || !user) {
      toast({ title: "Error", description: "Cannot save. Story data or user not found.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const updatedStory: Story = {
      ...story,
      title: storyTitle,
      summary: summary,
      genre: genre,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      coverImageUrl: coverImageUrl,
      language: language,
      isMature: isMature,
      visibility: visibility,
      status: visibility === 'Public' && story.chapters.some(c => c.status === 'Published') ? 'Ongoing' : (story.status === 'Completed' ? 'Completed' : 'Draft'), // Adjust status based on visibility and chapters
      lastUpdated: new Date().toISOString(),
      // Chapters are managed separately (content via rich text editor, adding/deleting here)
    };

    upsertStoryAndSave(updatedStory);
    setStory(updatedStory); // Update local state

    setTimeout(() => { // Simulate save delay
      setIsSaving(false);
      toast({ title: "Story Details Saved!", description: "Your story settings have been updated." });
    }, 700);
  };
  
  const confirmDeleteChapter = (chapter: Chapter) => {
    if (!story) return;
    const success = deleteChapterFromStory(story.id, chapter.id);
    if (success) {
        const updatedStory = placeholderStories.find(s => s.id === story.id); // Re-fetch from potentially updated global store
        if (updatedStory) setStory(updatedStory);
        toast({title: "Chapter Deleted", description: `Chapter "${chapter.title}" has been removed.`});
    } else {
        toast({title: "Error", description: "Failed to delete chapter.", variant: "destructive"});
    }
    setChapterToDelete(null);
  };


  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading story details...</p>
      </div>
    );
  }

  if (!story) {
    // This case should ideally be handled by the redirect in useEffect, but as a fallback:
    return (
        <div className="text-center py-10">
            <Info className="mx-auto h-12 w-12 text-destructive mb-4" />
            <p className="text-xl">Story not found or access denied.</p>
            <Link href="/write">
                <Button variant="link" className="mt-2">Go to Writing Dashboard</Button>
            </Link>
        </div>
    );
  }
  
  const getChapterStatusColor = (status?: 'Published' | 'Draft') => {
    if (status === 'Published') return 'text-green-600 dark:text-green-400';
    if (status === 'Draft') return 'text-yellow-600 dark:text-yellow-400';
    return 'text-muted-foreground';
  }


  return (
    <AlertDialog>
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl md:text-4xl font-headline font-bold text-primary">Edit Story Details</h1>
            <p className="text-muted-foreground">Manage your story's cover, title, description, and settings.</p>
        </div>
         <Link href={`/stories/${story.id}`} passHref>
            <Button variant="outline"><Eye className="mr-2 h-4 w-4" /> View Story Page</Button>
        </Link>
      </header>

      <form onSubmit={handleSaveChanges} className="grid md:grid-cols-3 gap-8 items-start">
        {/* Left Column: Cover & Core Info */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Story Cover</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div
                className="aspect-[2/3] w-full max-w-[250px] bg-muted rounded-md overflow-hidden cursor-pointer hover:opacity-80 transition-opacity mb-2 shadow-md"
                onClick={handleCoverImageClick}
                title="Click to change cover (mock)"
              >
                <Image
                  src={coverImageUrl || 'https://placehold.co/512x800.png'}
                  alt={storyTitle || "Story Cover"}
                  width={512}
                  height={800}
                  className="object-cover w-full h-full"
                  data-ai-hint="book cover design"
                />
              </div>
              <Button type="button" variant="link" onClick={handleCoverImageClick} className="text-sm">
                Change Cover (mock)
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Core Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <Label htmlFor="storyTitle" className="text-base">Story Title</Label>
                    <Input
                        id="storyTitle"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        placeholder="Your captivating story title"
                        className="text-lg p-3 border-0 border-b-2 border-input focus:border-primary shadow-none rounded-none focus:ring-0 bg-transparent"
                    />
                </div>
                <div>
                    <Label htmlFor="summary" className="text-base">Story Description (Blurb)</Label>
                    <Textarea
                        id="summary"
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="A short, enticing summary to draw readers in..."
                        rows={6}
                        className="text-base p-3 border-0 border-b-2 border-input focus:border-primary shadow-none rounded-none focus:ring-0 bg-transparent min-h-[120px]"
                    />
                </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Settings & Chapters */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Story Settings</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select value={genre} onValueChange={(val) => setGenre(val as string)}>
                    <SelectTrigger id="genre"><SelectValue placeholder="Select Genre" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fantasy">Fantasy</SelectItem>
                      <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                      <SelectItem value="romance">Romance</SelectItem>
                      <SelectItem value="thriller">Thriller</SelectItem>
                      <SelectItem value="historical">Historical Fiction</SelectItem>
                      <SelectItem value="dystopian">Dystopian</SelectItem>
                      <SelectItem value="mystery">Mystery</SelectItem>
                      <SelectItem value="adventure">Adventure</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger id="language"><SelectValue placeholder="Select Language" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Español (Spanish)</SelectItem>
                      <SelectItem value="French">Français (French)</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g., magic, space opera, slow burn" />
                <div className="mt-2 flex flex-wrap gap-1">
                    {tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="isMature" checked={isMature} onCheckedChange={setIsMature} />
                <Label htmlFor="isMature" className="flex items-center">
                    Mature Content <ShieldQuestion className="ml-1.5 h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" title="Mark if your story contains themes, language, or situations suitable for mature audiences."/>
                </Label>
              </div>
              <div>
                <Label className="mb-2 block">Visibility</Label>
                <RadioGroup value={visibility} onValueChange={(val) => setVisibility(val as 'Public' | 'Private' | 'Unlisted')} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Public" id="visPublic" />
                    <Label htmlFor="visPublic" className="font-normal flex items-center"><Eye className="mr-1.5 h-4 w-4"/>Public</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Unlisted" id="visUnlisted" />
                    <Label htmlFor="visUnlisted" className="font-normal flex items-center"><EyeOff className="mr-1.5 h-4 w-4"/>Unlisted</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Private" id="visPrivate" />
                    <Label htmlFor="visPrivate" className="font-normal flex items-center"><Info className="mr-1.5 h-4 w-4"/>Private (Drafts)</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-1">
                  {visibility === 'Public' && "Visible to everyone and in search results."}
                  {visibility === 'Unlisted' && "Only visible to those with a direct link. Not in search."}
                  {visibility === 'Private' && "Only visible to you and collaborators. Default for drafts."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Table of Contents</CardTitle>
              <Link href={`/write/edit?storyId=${story.id}`} passHref>
                 <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add New Chapter</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {story.chapters.length > 0 ? (
                <ScrollArea className="max-h-96 pr-3">
                  <ul className="space-y-2">
                    {story.chapters.sort((a, b) => a.order - b.order).map(chapter => (
                      <li key={chapter.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                        <div>
                          <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} className="font-medium hover:underline">
                            {chapter.order}. {chapter.title}
                          </Link>
                          <p className={cn("text-xs", getChapterStatusColor(chapter.status))}>
                            Status: {chapter.status || 'Draft'}
                            {chapter.publishedDate && ` - Published: ${formatDate(chapter.publishedDate)}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/write/edit?storyId=${story.id}&chapterId=${chapter.id}`} passHref>
                            <Button variant="ghost" size="icon" title="Edit Chapter"><Edit className="h-4 w-4"/></Button>
                          </Link>
                           {/* Mock Reorder Buttons - No functionality */}
                          {/* <Button variant="ghost" size="icon" title="Reorder (mock)" disabled><ArrowUp className="h-4 w-4"/></Button>
                          <Button variant="ghost" size="icon" title="Reorder (mock)" disabled><ArrowDown className="h-4 w-4"/></Button> */}
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" title="Delete Chapter" onClick={() => setChapterToDelete(chapter)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                          </AlertDialogTrigger>
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              ) : (
                <p className="text-muted-foreground text-center py-4">No chapters yet. Click "Add New Chapter" to start!</p>
              )}
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
                <CardTitle>Collaboration (Mock)</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-3">Manage who can edit this story with you.</p>
                <Link href={`/write/collaborate?storyId=${story.id}`} passHref>
                    <Button variant="outline" className="w-full">
                        <Users className="mr-2 h-4 w-4" /> Collaboration Settings
                    </Button>
                </Link>
            </CardContent>
           </Card>
        </div>

        {/* Floating Save Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button type="submit" size="lg" disabled={isSaving} className="shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 px-6">
            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Save Story Details
          </Button>
        </div>
      </form>

      {chapterToDelete && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chapter: "{chapterToDelete.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chapter? This action cannot be undone and will remove the chapter permanently from this story.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setChapterToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteChapter(chapterToDelete)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              Yes, Delete Chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </div>
    </AlertDialog>
  );
}
