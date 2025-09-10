
'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Poll } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Camera, Send, X, ChevronLeft, ChevronRight, Archive, Vote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { archiveStatusUpdate } from '@/app/actions/statusActions';
import { ScrollArea } from '@/components/ui/scroll-area';


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

function StatusViewer({ isOpen, onOpenChange, selectedUser, userStatuses, onNext, onPrev, onStatusArchived }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedUser: User | null, userStatuses: StatusUpdate[], onNext: () => void, onPrev: () => void, onStatusArchived: (statusId: string, userId: string) => void }) {
    const { user: currentUser } = useAuth();
    const { toast } = useToast();
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
    const [animationKey, setAnimationKey] = useState(0);

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
    
    const handleArchive = async (statusId: string) => {
        if (!currentUser) return;
        const result = await archiveStatusUpdate(statusId, currentUser.id);
        if (result.success) {
            toast({ title: 'Status Archived', description: 'This status has been moved to your archive.'});
            onStatusArchived(statusId, currentUser.id);
            onOpenChange(false);
        } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive'});
        }
    }

    const currentStatus = userStatuses[currentStatusIndex];

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
                           <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white" onClick={() => handleArchive(currentStatus.id)}>
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

export default function StatusFeature() {
  const { user, loading: authLoading } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
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
  
  const { toast } = useToast();

  useEffect(() => {
    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'statusUpdates'),
      where('createdAt', '>', twentyFourHoursAgo),
      where('isArchived', '==', false),
      where('isTrashed', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statusesData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));
      setAllStatuses(statusesData);

      const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
      const newStatusOrder: string[] = [];
      
      statusesData.forEach(status => {
          if (!groups.has(status.authorId)) {
              groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
              newStatusOrder.push(status.authorId);
          }
          groups.get(status.authorId)!.statuses.push(status);
      });
      setGroupedStatuses(groups);
      setStatusOrder(newStatusOrder);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching statuses:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

   const handleStatusArchived = (statusId: string, userId: string) => {
    setGroupedStatuses(prevGroups => {
        const newGroups = new Map(prevGroups);
        const userGroup = newGroups.get(userId);
        if (userGroup) {
            userGroup.statuses = userGroup.statuses.filter(s => s.id !== statusId);
            if (userGroup.statuses.length === 0) {
                newGroups.delete(userId);
                setStatusOrder(prevOrder => prevOrder.filter(id => id !== userId));
            } else {
                newGroups.set(userId, { ...userGroup });
            }
        }
        return newGroups;
    });
  };

  const resetUploader = () => {
    setImageFile(null);
    setImagePreview(null);
    setTextOverlay('');
    setShowPollCreator(false);
    setPollQuestion('');
    setPollOption1('');
    setPollOption2('');
  }

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

  const handleSubmitStatus = async () => {
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
    const expiresAt = Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

    const statusData: Omit<StatusUpdate, 'id'> = {
        authorId: user.id,
        authorInfo: authorInfo,
        mediaUrl: imageUrl,
        mediaType: 'image',
        expiresAt: expiresAt,
        createdAt: serverTimestamp(),
        isArchived: false,
        isTrashed: false,
    };
    
    if (textOverlay.trim()) {
        statusData.textOverlay = textOverlay.trim();
    }
    
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
        toast({ title: "Status Published!" });
        setIsUploaderOpen(false);
        resetUploader();
    } catch (error) {
        toast({ title: "Failed to publish status", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create a New Status</DialogTitle>
                    <DialogDescription>Share a photo with your followers for the next 24 hours.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="py-4 space-y-4">
                      {imagePreview ? (
                          <div className="relative">
                              <Image src={imagePreview} alt="Preview" width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                              <div className="absolute top-2 right-2 flex gap-2">
                                <Button variant="secondary" size="icon" className="h-7 w-7" onClick={() => setShowPollCreator(!showPollCreator)}>
                                      <Vote className="h-4 w-4" />
                                </Button>
                                <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => { setImageFile(null); setImagePreview(null); }}>
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
                          <Input
                            type="text"
                            placeholder="Add a caption..."
                            value={textOverlay}
                            onChange={(e) => setTextOverlay(e.target.value)}
                            maxLength={100}
                          />
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
                    <Button onClick={handleSubmitStatus} disabled={!imageFile || isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Publish Status
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <StatusViewer
            isOpen={isViewerOpen}
            onOpenChange={setIsViewerOpen}
            selectedUser={selectedUserForViewing}
            userStatuses={selectedUserForViewing ? groupedStatuses.get(selectedUserForViewing.id)?.statuses || [] : []}
            onNext={handleNextUser}
            onPrev={handlePrevUser}
            onStatusArchived={handleStatusArchived}
        />
    </>
  );
}
