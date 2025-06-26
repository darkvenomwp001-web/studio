
'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Camera, Send, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

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

function StatusViewer({ isOpen, onOpenChange, selectedUser, userStatuses, onNext, onPrev }: { isOpen: boolean, onOpenChange: (open: boolean) => void, selectedUser: User | null, userStatuses: StatusUpdate[], onNext: () => void, onPrev: () => void }) {
    const [currentStatusIndex, setCurrentStatusIndex] = useState(0);

    useEffect(() => {
        setCurrentStatusIndex(0);
    }, [selectedUser]);

    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
           handleNext();
        }, 5000); // Auto-advance after 5 seconds
        return () => clearTimeout(timer);
    }, [isOpen, currentStatusIndex, selectedUser]);

    const handleNext = () => {
        if (currentStatusIndex < userStatuses.length - 1) {
            setCurrentStatusIndex(prev => prev + 1);
        } else {
            onNext(); // Move to next user
        }
    }
    const handlePrev = () => {
        if (currentStatusIndex > 0) {
            setCurrentStatusIndex(prev => prev - 1);
        } else {
            onPrev(); // Move to prev user
        }
    }

    if (!selectedUser || userStatuses.length === 0) return null;

    const currentStatus = userStatuses[currentStatusIndex];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 m-0 bg-black border-0 max-w-md h-screen sm:h-[90vh] sm:max-h-[90vh] flex flex-col gap-0 rounded-lg">
                <div className="absolute top-0 left-0 right-0 z-10 p-2 flex items-center justify-between bg-gradient-to-b from-black/50">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={selectedUser.avatarUrl} />
                            <AvatarFallback>{selectedUser.username.substring(0,1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-white text-sm font-semibold">{selectedUser.displayName}</span>
                        <span className="text-gray-300 text-xs">{currentStatus.createdAt ? Timestamp.fromMillis(currentStatus.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                    </div>
                     <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 hover:text-white">
                            <X className="h-5 w-5"/>
                        </Button>
                    </DialogClose>
                </div>
                {/* Progress bars */}
                <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
                    {userStatuses.map((_, index) => (
                        <div key={index} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                             <div className="h-full bg-white" style={{ width: index < currentStatusIndex ? '100%' : index === currentStatusIndex ? '100%' : '0%', transition: index === currentStatusIndex ? 'width 5s linear' : 'none' }}></div>
                        </div>
                    ))}
                </div>

                <div className="relative flex-1 flex items-center justify-center">
                    <Image src={currentStatus.mediaUrl} alt="Status Update" layout="fill" objectFit="contain" />
                </div>
                
                 {/* Navigation buttons */}
                <button onClick={handlePrev} className="absolute left-0 top-1/2 -translate-y-1/2 h-20 w-10 text-white flex items-center justify-center"><ChevronLeft /></button>
                <button onClick={handleNext} className="absolute right-0 top-1/2 -translate-y-1/2 h-20 w-10 text-white flex items-center justify-center"><ChevronRight /></button>
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
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    const twentyFourHoursAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const q = query(
      collection(db, 'statusUpdates'),
      where('createdAt', '>', twentyFourHoursAgo),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const statusesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate));
      setAllStatuses(statusesData);

      const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>();
      statusesData.forEach(status => {
          if (!groups.has(status.authorId)) {
              groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
          }
          groups.get(status.authorId)!.statuses.push(status);
      });
      setGroupedStatuses(groups);
      setStatusOrder(Array.from(groups.keys()));
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

    try {
        await addDoc(collection(db, 'statusUpdates'), {
            authorId: user.id,
            authorInfo: authorInfo,
            mediaUrl: imageUrl,
            mediaType: 'image',
            createdAt: serverTimestamp(),
            expiresAt: expiresAt,
        });
        toast({ title: "Status Published!" });
        setIsUploaderOpen(false);
        setImageFile(null);
        setImagePreview(null);
    } catch (error) {
        toast({ title: "Failed to publish status", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };


  if (authLoading) {
    return <div className="h-[98px] w-full bg-card rounded-lg animate-pulse" />;
  }

  if (!user) {
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
       <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Status</DialogTitle>
                    <DialogDescription>Share a photo with your followers for the next 24 hours.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {imagePreview ? (
                        <div className="relative">
                            <Image src={imagePreview} alt="Preview" width={400} height={400} className="w-full h-auto object-contain rounded-lg" />
                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                                <X className="h-4 w-4" />
                            </Button>
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
                </div>
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
        />
    </>
  );
}
