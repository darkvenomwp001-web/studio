
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, PlusCircle, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { placeholderStories, upsertStoryAndSave, placeholderUsers } from '@/lib/placeholder-data';
import type { Story, UserSummary } from '@/types';

export default function CollaboratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');

  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [publishAccount, setPublishAccount] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }

    if (user && queryStoryId) {
      setIsLoading(true);
      const foundStory = placeholderStories.find(s => s.id === queryStoryId && s.author.id === user.id);
      if (foundStory) {
        setStory(foundStory);
        setPublishAccount(foundStory.author.id); // Default to story owner
      } else {
        toast({ title: "Error", description: "Story not found or you don't have permission.", variant: "destructive" });
        router.push('/write');
      }
      setIsLoading(false);
    } else if (user && !queryStoryId) {
        toast({ title: "Error", description: "No story ID provided for collaboration.", variant: "destructive" });
        router.push('/write');
    }
  }, [queryStoryId, user, authLoading, router, toast]);

  const handleAddCollaborator = () => {
    if (!story || !collaboratorUsername.trim()) {
      toast({ title: "Input Required", description: "Please enter a username to add.", variant: "destructive" });
      return;
    }
    const collaboratorUser = placeholderUsers.find(u => u.username.toLowerCase() === collaboratorUsername.toLowerCase());
    if (!collaboratorUser) {
      toast({ title: "User Not Found", description: `User "${collaboratorUsername}" not found.`, variant: "destructive" });
      return;
    }
    if (collaboratorUser.id === user?.id) {
      toast({ title: "Cannot Add Self", description: "You cannot add yourself as a collaborator.", variant: "destructive" });
      return;
    }
    if (story.collaborators?.some(c => c.id === collaboratorUser.id)) {
      toast({ title: "Already Collaborator", description: `${collaboratorUser.displayName || collaboratorUser.username} is already a collaborator.`, variant: "destructive" });
      return;
    }

    const newCollaborator: UserSummary = {
      id: collaboratorUser.id,
      username: collaboratorUser.username,
      displayName: collaboratorUser.displayName,
      avatarUrl: collaboratorUser.avatarUrl,
    };

    const updatedCollaborators = [...(story.collaborators || []), newCollaborator];
    const updatedStory = { ...story, collaborators: updatedCollaborators };
    
    upsertStoryAndSave(updatedStory);
    setStory(updatedStory);
    setCollaboratorUsername('');
    toast({ title: "Collaborator Added (Mock)", description: `${newCollaborator.displayName || newCollaborator.username} can now (conceptually) edit this story.` });
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    if (!story) return;
    const updatedCollaborators = story.collaborators?.filter(c => c.id !== collaboratorId);
    const updatedStory = { ...story, collaborators: updatedCollaborators };

    upsertStoryAndSave(updatedStory);
    setStory(updatedStory);
    toast({ title: "Collaborator Removed (Mock)", description: `Collaborator access revoked.` });
  };
  
  const handleSavePublishSettings = () => {
      if(!story) return;
      // This is purely a UI mock for where the story might be published.
      // No actual change in publishing mechanism is implemented.
      const publishTargetUser = placeholderUsers.find(u => u.id === publishAccount);
      toast({
          title: "Publish Settings Updated (Mock)",
          description: `Story will now (conceptually) publish to ${publishTargetUser?.displayName || 'selected account'}'s profile.`,
      });
  };


  if (isLoading || authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4">Loading collaboration settings...</p>
      </div>
    );
  }

  if (!story || !user) {
    return <div className="text-center py-10">Error loading story or user.</div>;
  }

  const potentialPublishAccounts = [story.author, ...(story.collaborators || [])];


  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <header className="flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
         </Button>
         <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Collaboration Settings</h1>
            <p className="text-muted-foreground">Manage collaborators for: <span className="font-semibold">{story.title}</span></p>
         </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Add Collaborators</CardTitle>
          <CardDescription>Invite other users to edit and contribute to this story (mock feature).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter collaborator's username"
              value={collaboratorUsername}
              onChange={(e) => setCollaboratorUsername(e.target.value)}
            />
            <Button onClick={handleAddCollaborator}><PlusCircle className="mr-2 h-4 w-4" /> Add</Button>
          </div>
          {story.collaborators && story.collaborators.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Current Collaborators:</h3>
              <ul className="space-y-2">
                {story.collaborators.map(collab => (
                  <li key={collab.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={collab.avatarUrl} alt={collab.username} data-ai-hint="profile person" />
                        <AvatarFallback>{collab.username.substring(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span>{collab.displayName || collab.username}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(collab.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(!story.collaborators || story.collaborators.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-2">No collaborators added yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Publishing Account (Mock)</CardTitle>
            <CardDescription>Choose which user's account this story will be primarily published under (UI mock only).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
            <div>
                <Label htmlFor="publish-account">Publish As:</Label>
                <Select value={publishAccount} onValueChange={setPublishAccount}>
                    <SelectTrigger id="publish-account">
                        <SelectValue placeholder="Select account to publish under" />
                    </SelectTrigger>
                    <SelectContent>
                        {potentialPublishAccounts.map(acc => (
                            <SelectItem key={acc.id} value={acc.id}>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={acc.avatarUrl} data-ai-hint="profile person"/>
                                        <AvatarFallback>{acc.username.substring(0,1).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {acc.displayName || acc.username} {acc.id === story.author.id && "(Owner)"}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={handleSavePublishSettings} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Save Publishing Settings (Mock)
            </Button>
             <p className="text-xs text-muted-foreground">
                Note: Actual multi-account publishing is a complex feature and is only simulated here.
                The story will always appear under the original author's profile in this mock version.
             </p>
        </CardContent>
      </Card>
      
      <div className="text-center mt-6">
          <Link href={`/write/edit-details?storyId=${story.id}`} passHref>
              <Button variant="link">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to Story Details
              </Button>
          </Link>
      </div>
    </div>
  );
}
