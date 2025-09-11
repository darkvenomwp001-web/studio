'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Poll } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Camera, Send, X, ChevronLeft, ChevronRight, Vote, Trash2, RotateCcw, Archive, Sparkles, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardFooter } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { restoreStatusUpdate, permanentlyDeleteStatusUpdate, archiveStatusUpdate } from '@/app/actions/statusActions';
import { getStatusCaptions } from '@/app/actions/aiActions';
import { cn } from '@/lib/utils';


const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

function StatusBubble({ user, statuses, onSelect }: { user: User, statuses: StatusUpdate[], onSelect: (user: User) => void }) {
  return (
    <div 
      className="relative text-center flex-shrink-0 w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      <div className="w-16 h-16 p-0.5 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 mx-auto group-hover:scale-110 transition-all">
        <Avatar className="w-full h-full border-2 border-background">
          <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
          <AvatarFallback>{user.username.substring(0,1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
      <p className="text-xs mt-1 truncate">{user.displayName || user.username}</p>
    </div>
  );
}

function StatusViewer({ isOpen, onOpenChange, selectedUser, userStatuses, onNext, onPrev, onStatusArchived }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedUser: User | null, userStatuses: StatusUpdate[], onNext: () => void, onPrev: () => void, onStatusArchived: (userId: string, statusId: string) => void }) {
    const { user: currentUser } = useAuth();
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);
    const { toast } = useToast();

    useEffect(() => {
        setCurrentStatusIndex(0);
        setAnimationKey(prev => prev + 1); // Reset animation
    }, [selectedUser]);

    useEffect(() => {
        if (!isOpen || !userStatuses || userStatuses.length === 0) return;
        const timer = setTimeout(() => {
           handleNext();
        }, 5000); // Auto-advance after 5 seconds
        return () => clearTimeout(timer);
    }, [isOpen, currentStatusIndex, selectedUser, userStatuses]);

    const handleNext = () => {
        setAnimationKey(prev => prev + 1);
        if (currentStatusIndex < userStatuses.length - 1) {
            setCurrentStatusIndex(prev => prev + 1);
        } else {
            onNext(); // Move to next user
        }
    }
    const handlePrev = () => {
        setAnimationKey(prev => prev + 1);
        if (currentStatusIndex > 0) {
            setCurrentStatusIndex(prev => prev - 1);
        } else {
            onPrev(); // Move to prev user
        }
    }

    const currentStatus = userStatuses[currentStatusIndex];

    const handleArchive = async () => {
        if (!currentUser || !currentStatus) return;
        const result = await archiveStatusUpdate(currentStatus.id, currentUser.id);
        if (result.success) {
            toast({ title: "Status Archived" });
            onStatusArchived(currentStatus.authorId, currentStatus.id);
            onOpenChange(false);
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    if (!selectedUser || !currentStatus) {
        return null;
    }
    
    const isOwnStatus = currentUser?.id === selectedUser.id;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 m-0 bg-black border-0 max-w-md h-screen sm:h-[90vh] sm:max-h-[90vh] flex flex-col gap-0 rounded-lg">
                <DialogHeader className="sr-only">
                    <DialogTitle>Status update from {selectedUser.displayName}</DialogTitle>
                    <DialogDescription>A temporary status update that disappears after 24 hours. This is status {currentStatusIndex + 1} of {userStatuses.length}.</DialogDescription>
                </DialogHeader>
                <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedUser.avatarUrl} />
                            <AvatarFallback>{selectedUser.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm font-semibold">{selectedUser.displayName}</span>
                        <span className="text-gray-300 text-xs">{currentStatus.createdAt ? (currentStatus.createdAt as Timestamp).toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                     <div className="flex items-center gap-1">
                        {isOwnStatus && (
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={handleArchive}>
                                <Archive className="h-5 w-5" />
                            </Button>
                        )}
                        <DialogClose asChild>
                          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                              <X className="h-5 w-5"/>
                          </Button>
                        </DialogClose>
                     </div>
                </div>
                {/* Progress bars */}
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                    {userStatuses.map((_, index) => (
                        <div key={index} className="h-0.5 flex-1 bg-white/30 rounded-full overflow-hidden">
                             <div 
                                key={animationKey}
                                className="h-full bg-white" 
                                style={{ 
                                    width: index < currentStatusIndex ? '100%' : index === currentStatusIndex ? '100%' : '0%', 
                                    animation: index === currentStatusIndex ? 'width-grow 5s linear' : 'none' 
                                }}
                            ></div>
                        </div>
                    ))}
                </div>

                <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                    <Image src={currentStatus.mediaUrl} alt="Status Update" layout="fill" objectFit="contain" />
                     {currentStatus.textOverlay && (
                        <div className="absolute bottom-10 left-4 right-4 z-10">
                            <p className="text-white text-center text-lg font-semibold bg-black/50 p-2 rounded-md shadow-lg">
                                {currentStatus.textOverlay}
                            </p>
                        </div>
                    )}
                </div>
                
                 {/* Navigation buttons */}
                <button onClick={handlePrev} className="absolute left-0 top-1/3 bottom-1/3 w-1/2 text-white flex items-center justify-start"></button>
                <button onClick={handleNext} className="absolute right-0 top-1/3 bottom-1/3 w-1/2 text-white flex items-center justify-end"></button>
            </DialogContent>
        </Dialog>
    )
}

const photoFilters = [
    { name: 'None', style: 'filter-none' },
    { name: 'Noir', style: 'filter-grayscale-100 contrast-125' },
    { name: 'Vintage', style: 'filter-sepia-60' },
    { name: 'Cold', style: 'filter-hue-rotate-180 saturate-150' },
    { name: 'Vibrant', style: 'filter-saturate-200' },
] as const;

export default function StatusFeature() {
  const { user, loading: authLoading } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
  const [draftStatuses, setDraftStatuses] = useState<StatusUpdate[]>([]);
  const [trashedStatuses, setTrashedStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOption1, setPollOption1] = useState('');
  const [pollOption2, setPollOption2] = useState('');
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [isGeneratingCaptions, startCaptionTransition] = useTransition();

  const [selectedFilter, setSelectedFilter] = useState<(typeof photoFilters)[number]['style']>('filter-none');

  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
        setIsLoading(false);
        return;
    }

    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const liveQuery = query(
      collection(db, 'statusUpdates'),
      // where('authorId', '!=', user.id), // a simple way to filter for others
      where('createdAt', '>', twentyFourHoursAgo),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    const draftQuery = query(collection(db, 'statusUpdates'), where('authorId', '==', user.id), where('status', '==', 'draft'), orderBy('createdAt', 'desc'));
    const trashQuery = query(collection(db, 'statusUpdates'), where('authorId', '==', user.id), where('isTrashed', '==', true), orderBy('trashedAt', 'desc'));


    const unsubLive = onSnapshot(liveQuery, (snapshot) => {
      const statusesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));
      setAllStatuses(statusesData);
    });
    
    const unsubDrafts = onSnapshot(draftQuery, (snapshot) => {
        setDraftStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
    });

    const unsubTrash = onSnapshot(trashQuery, (snapshot) => {
        setTrashedStatuses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate)));
    });

    setIsLoading(false);

    return () => {
        unsubLive();
        unsubDrafts();
        unsubTrash();
    };
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    const liveStatuses = allStatuses.filter(s => s.status === 'published' && s.expiresAt && (s.expiresAt as Timestamp).toMillis() > Date.now() );
    
    // Put current user's status first if it exists
    const currentUserLive = liveStatuses.filter(s => s.authorId === user?.id);
    if (currentUserLive.length > 0) {
        groups.set(user!.id, { user: user as User, statuses: currentUserLive });
        newStatusOrder.push(user!.id);
    }
    
    // Then add others
    liveStatuses.forEach(status => {
        if (status.authorId === user?.id) return; // Already added
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            newStatusOrder.push(status.authorId);
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user]);


  const handleSelectUser = (user: User) => {
    setSelectedUserForViewing(user);
    setIsViewerOpen(true);
  }

  const handleNextUser = () => {
    const currentIndex = statusOrder.findIndex(id => id === selectedUserForViewing?.id);
    if (currentIndex > -1 && currentIndex < statusOrder.length - 1) {
        const nextUserId = statusOrder[currentIndex + 1];
        setSelectedUserForViewing(groupedStatuses.get(nextUserId)!.user);
    } else {
        setIsViewerOpen(false); // Close if last user
    }
  };
  const handlePrevUser = () => {
    const currentIndex = statusOrder.findIndex(id => id === selectedUserForViewing?.id);
    if (currentIndex > 0) {
        const prevUserId = statusOrder[currentIndex - 1];
        setSelectedUserForViewing(groupedStatuses.get(prevUserId)!.user);
    } else {
         setIsViewerOpen(false); // Close if first user
    }
  }

  const resetUploader = () => {
    setImageFile(null);
    setImagePreview(null);
    setTextOverlay('');
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
    setSuggestedCaptions([]);
    setSelectedFilter('filter-none');
  }

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast({ title: "Image Too Large", description: `Please select an image smaller than ${MAX_IMAGE_SIZE_BYTES / (1024*1024)}MB.`, variant: "destructive" });
        return;
      }
      setImageFile(file);

      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStatusSubmit = async (status: 'published' | 'draft') => {
    if (!imageFile || !user) return;
    setIsSubmitting(true);
    
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
    
    let imageUrl = '';
    try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await response.json();
        if (data.secure_url) {
            imageUrl = data.secure_url;
        } else {
            throw new Error(data.error?.message || 'Unknown Cloudinary error');
        }
    } catch (error) {
        toast({ title: 'Image Upload Failed', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const authorInfo = { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl };
    
    const statusData: Omit<StatusUpdate, 'id'> = {
        authorId: user.id,
        authorInfo: authorInfo,
        mediaUrl: imageUrl,
        mediaType: 'image',
        createdAt: serverTimestamp(),
        isArchived: false,
        isTrashed: false,
        status,
        expiresAt: status === 'published' ? Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000) : null,
    };
    
    if (textOverlay.trim()) statusData.textOverlay = textOverlay.trim();
    
    if (showPollCreator && pollQuestion.trim() && pollOption1.trim() && pollOption2.trim()) {
        statusData.poll = {
            question: pollQuestion.trim(),
            options: [
                { id: 'opt1', text: pollOption1.trim(), votes: [] },
                { id: 'opt2', text: pollOption2.trim(), votes: [] }
            ]
        };
    }

    try {
        await addDoc(collection(db, 'statusUpdates'), statusData);
        toast({ title: `Status ${status === 'published' ? 'Published!' : 'Saved as Draft!'}` });
        setIsUploaderOpen(false);
        resetUploader();
    } catch (error) {
        toast({ title: "Failed to save status", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handlePublishDraft = async (draftId: string) => {
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);
    await updateDoc(doc(db, "statusUpdates", draftId), {
        status: 'published',
        expiresAt: expiresAt,
        createdAt: serverTimestamp(), // Update timestamp on publish
    });
    toast({title: "Draft Published!"});
  }

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDoc(doc(db, "statusUpdates", draftId));
    toast({title: "Draft Deleted"});
  }
  
  const handleRestoreFromTrash = async (statusId: string) => {
    const result = await restoreStatusUpdate(statusId, user!.id);
    if(result.success) toast({title: "Status Restored"});
    else toast({title: "Error", description: result.error, variant: 'destructive'});
  }

  const handleDeleteFromTrash = async (statusId: string) => {
     const result = await permanentlyDeleteStatusUpdate(statusId, user!.id);
     if(result.success) toast({title: "Status Permanently Deleted"});
     else toast({title: "Error", description: result.error, variant: 'destructive'});
  }
  
  const handleGenerateCaptions = () => {
    if (!imagePreview) return;
    startCaptionTransition(async () => {
        setSuggestedCaptions([]);
        const result = await getStatusCaptions({ photoDataUri: imagePreview });
        if ('error' in result) {
            toast({ title: "AI Error", description: result.error, variant: "destructive" });
        } else {
            setSuggestedCaptions(result.captions);
        }
    });
  }

  const onStatusArchived = (archivedUserId: string, statusId: string) => {
        setAllStatuses(prev => prev.filter(s => s.id !== statusId));
        const userGroups = new Map(groupedStatuses);
        const userGroup = userGroups.get(archivedUserId);
        if (userGroup) {
            userGroup.statuses = userGroup.statuses.filter(s => s.id !== statusId);
            if (userGroup.statuses.length === 0) {
                userGroups.delete(archivedUserId);
                setStatusOrder(prev => prev.filter(id => id !== archivedUserId));
            }
        }
        setGroupedStatuses(userGroups);
  };


  if (authLoading) {
    return <div className="h-[98px] w-full bg-card rounded-lg animate-pulse" />;
  }

  if (!user || user.isAnonymous) {
    return null;
  }
  
  return (
    <>
      <div className="bg-card p-3 rounded-lg shadow-sm">
      <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-muted">
          {/* Add/Edit Note Bubble */}
          <div className="text-center flex-shrink-0 w-20">
              <button 
                  onClick={() => setIsUploaderOpen(true)} 
                  className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center border-2 border-dashed border-primary/50 hover:border-primary transition-colors relative group"
              >
                  <Plus className="h-6 w-6 text-primary" />
              </button>
              <p className="text-xs mt-1 truncate">Add Status</p>
          </div>

          {isLoading ? (
              [...Array(4)].map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-20 text-center">
                       <div className="w-16 h-16 rounded-full bg-muted animate-pulse mx-auto"></div>
                       <div className="h-2 w-12 bg-muted rounded mt-2 mx-auto animate-pulse"></div>
                  </div>
              ))
          ) : (
            statusOrder.map((userId) => {
                const group = groupedStatuses.get(userId);
                if (!group) return null;
                return <StatusBubble key={userId} user={group.user} statuses={group.statuses} onSelect={handleSelectUser} />
            })
          )}
      </div>
      </div>
       <Dialog open={isUploaderOpen} onOpenChange={(open) => { setIsUploaderOpen(open); if(!open) resetUploader(); }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Manage Status</DialogTitle>
                    <DialogDescription>Upload a new status, or manage your drafts and trash.</DialogDescription>
                </DialogHeader>
                 <Tabs defaultValue="upload" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="upload">Upload</TabsTrigger>
                        <TabsTrigger value="drafts">Drafts</TabsTrigger>
                        <TabsTrigger value="trash">Trash</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload">
                        <ScrollArea className="max-h-[60vh] pr-4">
                            <div className="py-4 space-y-4">
                                {imagePreview ? (
                                    <div className="relative">
                                        <Image src={imagePreview} alt="Preview" width={400} height={400} className={cn("w-full h-auto object-contain rounded-lg transition-all", selectedFilter)} />
                                        <div className="absolute top-2 right-2 flex gap-2">
                                            <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setShowPollCreator(!showPollCreator)}>
                                                <Vote className="h-4 w-4" />
                                            </Button>
                                            <Button variant="destructive" size="icon" className="h-7 w-7" onClick={resetUploader}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div 
                                        className="w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted"
                                        onClick={() => imageInputRef.current?.click()}
                                    >
                                        <Camera className="h-10 w-10 text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">Click to upload an image</p>
                                        <Input type="file" ref={imageInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                                    </div>
                                )}
                                
                                {imagePreview && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Filters</Label>
                                            <ScrollArea className="w-full whitespace-nowrap">
                                                <div className="flex space-x-2 pb-2">
                                                    {photoFilters.map(filter => (
                                                        <div key={filter.name} onClick={() => setSelectedFilter(filter.style)} className="text-center cursor-pointer">
                                                            <Image src={imagePreview} alt={filter.name} width={60} height={60} className={cn("rounded-md object-cover w-16 h-16 border-2 transition-all", selectedFilter === filter.style ? 'border-primary' : 'border-transparent', filter.style)} />
                                                            <p className="text-xs mt-1">{filter.name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <ScrollBar orientation="horizontal" />
                                            </ScrollArea>
                                        </div>

                                        <Input type="text" placeholder="Add a caption..." value={textOverlay} onChange={(e) => setTextOverlay(e.target.value)} maxLength={100} />
                                        
                                        <Button variant="outline" size="sm" onClick={handleGenerateCaptions} disabled={isGeneratingCaptions}>
                                            {isGeneratingCaptions ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Wand2 className="h-4 w-4 mr-2" />}
                                            Generate AI Captions
                                        </Button>
                                        
                                        {suggestedCaptions.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {suggestedCaptions.map((caption, i) => (
                                                    <Button key={i} size="sm" variant="secondary" onClick={() => setTextOverlay(caption)}>{caption}</Button>
                                                ))}
                                            </div>
                                        )}

                                        {showPollCreator && (
                                            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                                                <Label>Create a Poll</Label>
                                                <Input placeholder="Poll Question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
                                                <div className="flex gap-2">
                                                    <Input placeholder="Option 1" value={pollOption1} onChange={e => setPollOption1(e.target.value)} />
                                                    <Input placeholder="Option 2" value={pollOption2} onChange={e => setPollOption2(e.target.value)} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                         <DialogFooter>
                            <Button variant="outline" onClick={() => handleStatusSubmit('draft')} disabled={!imageFile || isSubmitting}>Save as Draft</Button>
                            <Button onClick={() => handleStatusSubmit('published')} disabled={!imageFile || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Publish Status
                            </Button>
                        </DialogFooter>
                    </TabsContent>
                    <TabsContent value="drafts">
                        <ScrollArea className="h-96">
                            <div className="space-y-2 p-1">
                                {draftStatuses.length > 0 ? draftStatuses.map(draft => (
                                    <Card key={draft.id} className="flex items-center p-2">
                                        <Image src={draft.mediaUrl} alt="Draft" width={60} height={60} className="rounded-md object-cover mr-3 aspect-square" />
                                        <p className="text-sm flex-1 truncate">{draft.textOverlay || "No caption"}</p>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => handlePublishDraft(draft.id)}>Publish</Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleDeleteDraft(draft.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </Card>
                                )) : <p className="text-center text-muted-foreground py-10">No drafts saved.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="trash">
                         <ScrollArea className="h-96">
                            <div className="space-y-2 p-1">
                                {trashedStatuses.length > 0 ? trashedStatuses.map(item => (
                                    <Card key={item.id} className="flex items-center p-2">
                                        <Image src={item.mediaUrl} alt="Trashed item" width={60} height={60} className="rounded-md object-cover mr-3 aspect-square" />
                                        <p className="text-sm flex-1 truncate">{item.textOverlay || "No caption"}</p>
                                        <div className="flex gap-1">
                                            <Button size="sm" variant="outline" onClick={() => handleRestoreFromTrash(item.id)}><RotateCcw className="h-4 w-4"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete Forever?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFromTrash(item.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </Card>
                                )) : <p className="text-center text-muted-foreground py-10">Trash is empty.</p>}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>

        <StatusViewer
            isOpen={isViewerOpen}
            onOpenChange={setIsViewerOpen}
            selectedUser={selectedUserForViewing}
            userStatuses={selectedUserForViewing ? groupedStatuses.get(selectedUserForViewing.id)?.statuses || [] : []}
            onNext={handleNextUser}
            onPrev={handlePrevUser}
            onStatusArchived={onStatusArchived}
        />
    </>
  );
}
