
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
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import type { Story, UserSummary, User as AppUser } from '@/types';

export default function CollaboratePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const queryStoryId = searchParams.get('storyId');

  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [collaboratorUsername, setCollaboratorUsername] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin');
      return;
    }

    let unsubscribeStory: (() => void) | undefined;

    if (user && queryStoryId) {
      setIsLoading(true);
      const storyDocRef = doc(db, 'stories', queryStoryId);
      unsubscribeStory = onSnapshot(storyDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const storyData = { id: docSnap.id, ...docSnap.data() } as Story;
           if (storyData.author.id !== user.id) {
            toast({ title: "Access Denied", description: "Only the story author can manage collaborators.", variant: "destructive" });
            router.push(`/write/edit-details?storyId=${queryStoryId}`);
            return;
          }
          setStory(storyData);
        } else {
          toast({ title: "Error", description: "Story not found.", variant: "destructive" });
          router.push('/write');
        }
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching story for collaboration:", error);
        toast({ title: "Error", description: "Could not load story details.", variant: "destructive" });
        setIsLoading(false);
        router.push('/write');
      });
    } else if (user && !queryStoryId) {
        toast({ title: "Error", description: "No story ID provided for collaboration.", variant: "destructive" });
        router.push('/write');
        setIsLoading(false);
    } else if (!user && !authLoading) {
        setIsLoading(false);
    }
    
    return () => {
      if (unsubscribeStory) unsubscribeStory();
    };
  }, [queryStoryId, user, authLoading, router, toast]);

  const handleAddCollaborator = async () => {
    if (!story || !collaboratorUsername.trim() || !user) {
      toast({ title: "Input Required", description: "Please enter a username to add.", variant: "destructive" });
      return;
    }
    if (story.author.id !== user.id) {
        toast({ title: "Permission Denied", description: "Only the story author can add collaborators.", variant: "destructive" });
        return;
    }

    setIsProcessing(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', collaboratorUsername.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ title: "User Not Found", description: `User "${collaboratorUsername}" not found.`, variant: "destructive" });
        setIsProcessing(false);
        return;
      }
      
      const collaboratorUserDoc = querySnapshot.docs[0];
      const collaboratorUserData = {id: collaboratorUserDoc.id, ...collaboratorUserDoc.data()} as AppUser;

      if (collaboratorUserData.id === user.id) {
        toast({ title: "Cannot Add Self", description: "You are the author and cannot add yourself as a collaborator.", variant: "destructive" });
        setIsProcessing(false);
        return;
      }
      if (story.collaborators?.some(c => c.id === collaboratorUserData.id)) {
        toast({ title: "Already Collaborator", description: `${collaboratorUserData.displayName || collaboratorUserData.username} is already a collaborator.`, variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      const newCollaborator: UserSummary = {
        id: collaboratorUserData.id,
        username: collaboratorUserData.username,
        displayName: collaboratorUserData.displayName,
        avatarUrl: collaboratorUserData.avatarUrl,
      };

      const updatedCollaborators = [...(story.collaborators || []), newCollaborator];
      const updatedCollaboratorIds = [...(story.collaboratorIds || []), newCollaborator.id];
      const storyDocRef = doc(db, 'stories', story.id);
      await updateDoc(storyDocRef, { 
          collaborators: updatedCollaborators,
          collaboratorIds: updatedCollaboratorIds,
          lastUpdated: serverTimestamp()
      });
      setCollaboratorUsername('');
      toast({ title: "Collaborator Added", description: `${newCollaborator.displayName || newCollaborator.username} can now contribute to this story.` });
    } catch (error) {
        console.error("Error adding collaborator:", error);
        toast({title: "Error", description: "Could not add collaborator. Please try again.", variant: "destructive"});
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: string) => {
    if (!story || !user) return;
    if (story.author.id !== user.id) {
        toast({ title: "Permission Denied", description: "Only the story author can remove collaborators.", variant: "destructive" });
        return;
    }
    setIsProcessing(true);
    const updatedCollaborators = story.collaborators?.filter(c => c.id !== collaboratorId);
    const updatedCollaboratorIds = story.collaboratorIds?.filter(id => id !== collaboratorId);
    try {
        const storyDocRef = doc(db, 'stories', story.id);
        await updateDoc(storyDocRef, { 
            collaborators: updatedCollaborators,
            collaboratorIds: updatedCollaboratorIds,
            lastUpdated: serverTimestamp() 
        });
        toast({ title: "Collaborator Removed", description: `Collaborator access revoked.` });
    } catch (error) {
        console.error("Error removing collaborator:", error);
        toast({title: "Error", description: "Could not remove collaborator. Please try again.", variant: "destructive"});
    } finally {
        setIsProcessing(false);
    }
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
    return <div className="text-center py-10">Error loading story or user information. Please ensure you are logged in and the story ID is correct.</div>;
  }


  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      <header className="flex items-center gap-4">
         <Button variant="outline" size="icon" onClick={() => router.push(`/write/edit-details?storyId=${story.id}`)} aria-label="Back to story details">
            <ArrowLeft className="h-5 w-5" />
         </Button>
         <div>
            <h1 className="text-3xl font-headline font-bold text-primary">Collaboration Settings</h1>
            <p className="text-muted-foreground">Manage collaborators for: <span className="font-semibold">{story.title}</span></p>
         </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Manage Collaborators</CardTitle>
          <CardDescription>Invite other users to edit and contribute to this story. Only the original author can manage collaborators.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter collaborator's username"
              value={collaboratorUsername}
              onChange={(e) => setCollaboratorUsername(e.target.value)}
              disabled={isProcessing}
            />
            <Button onClick={handleAddCollaborator} disabled={isProcessing || !collaboratorUsername.trim()}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} 
                Add
            </Button>
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
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCollaborator(collab.id)} className="text-destructive hover:text-destructive" disabled={isProcessing}>
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
            <CardTitle>Publishing Account</CardTitle>
            <CardDescription>This story will be published under the original author's account. Collaborators can edit content.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={story.author.avatarUrl} data-ai-hint="profile person"/>
                    <AvatarFallback>{story.author.username.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{story.author.displayName || story.author.username}</p>
                    <p className="text-xs text-muted-foreground">Original Author (Publisher)</p>
                </div>
            </div>
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
