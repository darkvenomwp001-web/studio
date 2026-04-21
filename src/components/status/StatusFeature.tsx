'use client';

import { useState, useEffect, useRef, ChangeEvent, useTransition, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate, Song } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, serverTimestamp, addDoc, Timestamp, orderBy, doc, updateDoc, setDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, X, Type, Palette, Image as LucideImageIcon, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import StatusViewer from './StatusViewer';
import { Textarea } from '../ui/textarea';

const gradientBackgrounds = [
  'bg-gradient-to-br from-gray-700 via-gray-900 to-black',
  'bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500',
  'bg-gradient-to-br from-green-300 via-blue-500 to-purple-600',
  'bg-gradient-to-br from-yellow-200 via-green-200 to-green-500',
  'bg-gradient-to-br from-red-200 via-red-300 to-yellow-200',
  'bg-gradient-to-br from-sky-400 to-sky-200',
];

function StatusBubble({ user, onSelect, hasStatus }: { user: User, onSelect: (user: User) => void, hasStatus: boolean }) {
  const { user: authUser } = useAuth();
  const isOwn = authUser?.id === user.id;

  return (
    <div
      className="relative text-center flex-shrink-0 w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      <div className="relative w-16 h-16 mx-auto group-hover:scale-110 transition-transform duration-200">
         <div className={cn(
            "w-16 h-16 p-0.5 rounded-full",
            hasStatus ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" : "bg-muted"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
            <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
            <AvatarFallback>{user.username?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
        </div>
        
        {isOwn && !hasStatus && (
           <div className="absolute bottom-0 right-0 z-10 w-6 h-6 bg-primary border-2 border-background rounded-full flex items-center justify-center shadow-md">
              <Plus className="h-3 w-3 text-white" />
           </div>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase mt-1 truncate tracking-tighter">{isOwn ? 'Add Status' : user.displayName || user.username}</p>
    </div>
  );
}

export default function StatusFeature() {
  const { user, loading: authLoading } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [noteContent, setNoteContent] = useState('');
  const [backgroundStyle, setBackgroundStyle] = useState<string>('');
  const [noteStyle, setNoteStyle] = useState<{font: 'sans' | 'serif' | 'mono', alignment: 'left' | 'center' | 'right'}>({ font: 'sans', alignment: 'center' });

  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);
  
  const [activeUploaderTab, setActiveUploaderTab] = useState('text');
  const [statusVisibility, setStatusVisibility] = useState<'public' | 'close-friends'>('public');

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!user || user.isAnonymous) {
        setIsLoading(false);
        return;
    }

    const now = Timestamp.now();
    const publishedQuery = query(
      collection(db, 'statusUpdates'),
      where('status', '==', 'published'),
      where('isHidden', '==', false),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );
    
    const unsubPublished = onSnapshot(publishedQuery, (snapshot) => {
        const liveStatuses = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as StatusUpdate))
            .filter(s => {
                if (s.visibility === 'close-friends' && user && !user.closeFriendIds?.includes(s.authorId) && s.authorId !== user.id) {
                    return false;
                }
                return true;
            });
        
        setAllStatuses(liveStatuses);
        setIsLoading(false);
    });

    return () => unsubPublished();
  }, [user]);

  useEffect(() => {
    const groups = new Map<string, {user: User, statuses: StatusUpdate[]}>(new Map());
    const newStatusOrder: string[] = [];

    if (user && !user.isAnonymous) {
      const currentUserLive = allStatuses.filter(s => s.authorId === user.id);
      groups.set(user.id, { user: user as User, statuses: currentUserLive });
      newStatusOrder.push(user.id);
    }
    
    allStatuses.forEach(status => {
        if (status.authorId === user?.id) return;
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            newStatusOrder.push(status.authorId);
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user]);

  const handleNextUser = () => {
    const currentIndex = statusOrder.indexOf(selectedUserForViewing?.id || '');
    if (currentIndex !== -1 && currentIndex < statusOrder.length - 1) {
        const nextId = statusOrder[currentIndex + 1];
        setSelectedUserForViewing(groupedStatuses.get(nextId)!.user);
    } else {
        setIsViewerOpen(false);
    }
  };

  const handlePrevUser = () => {
    const currentIndex = statusOrder.indexOf(selectedUserForViewing?.id || '');
    if (currentIndex > 0) {
        const prevId = statusOrder[currentIndex - 1];
        setSelectedUserForViewing(groupedStatuses.get(prevId)!.user);
    } else {
        setIsViewerOpen(false);
    }
  };

  const handleSelectUser = (selectedUser: User) => {
    const group = groupedStatuses.get(selectedUser.id);
    if (group && group.statuses.length > 0) {
        setSelectedUserForViewing(selectedUser);
        setIsViewerOpen(true);
    } else {
        setIsCreatorOpen(true);
    }
  };

  const handleMediaSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMediaFile(file);
      setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      const reader = new FileReader();
      reader.onload = (event) => setMediaPreview(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleTextSubmit = async () => {
    if (!user || !noteContent.trim()) return;
    setIsSubmitting(true);
    const durationHours = 24;
    const expiryTime = Timestamp.fromMillis(Date.now() + durationHours * 60 * 60 * 1000);

    const statusData = {
        authorId: user.id,
        authorInfo: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'published',
        expiresAt: expiryTime,
        isHidden: false,
        visibility: statusVisibility,
        note: noteContent.trim(),
        backgroundStyle,
        noteStyle
    };
    
    addDoc(collection(db, 'statusUpdates'), statusData)
        .then(() => {
            toast({ title: 'Status Published!' });
            setIsUploaderOpen(false);
            setNoteContent('');
        })
        .finally(() => setIsSubmitting(false));
  };

  return (
    <div className='py-4 -mx-4 px-4 overflow-hidden'>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-start space-x-4">
            {isLoading ? (
                [...Array(4)].map((_, i) => <div key={i} className="w-16 h-16 rounded-full bg-muted animate-pulse flex-shrink-0" />)
            ) : (
                statusOrder.map((userId) => {
                    const group = groupedStatuses.get(userId);
                    if (!group) return null;
                    return <StatusBubble key={userId} user={group.user} hasStatus={group.statuses.length > 0} onSelect={handleSelectUser} />
                })
            )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <Dialog open={isCreatorOpen} onOpenChange={setIsCreatorOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl p-6 border-none shadow-2xl">
              <DialogHeader>
                  <DialogTitle className="font-headline text-2xl">Create Status</DialogTitle>
                  <DialogDescription>What's your creative vibe today?</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-6">
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl" onClick={() => { setIsUploaderOpen(true); setIsCreatorOpen(false); setActiveUploaderTab('text'); }}>
                      <Type className="h-6 w-6"/>
                      <span className="text-xs font-bold uppercase tracking-widest">Text</span>
                  </Button>
                  <Button variant="outline" className="h-24 flex-col gap-2 rounded-2xl" onClick={() => { mediaInputRef.current?.click(); }}>
                      <LucideImageIcon className="h-6 w-6"/>
                      <span className="text-xs font-bold uppercase tracking-widest">Art</span>
                  </Button>
                  <input type="file" ref={mediaInputRef} className="hidden" accept="image/*,video/*" onChange={handleMediaSelect} />
              </div>
          </DialogContent>
      </Dialog>

      <Dialog open={isUploaderOpen} onOpenChange={setIsUploaderOpen}>
          <DialogContent className="p-0 border-none sm:max-w-md flex flex-col rounded-3xl overflow-hidden">
              <div className={cn("h-[400px] p-6 flex flex-col justify-center items-center text-white", backgroundStyle || 'bg-muted')}>
                  <Textarea
                      placeholder="Type your status..."
                      value={noteContent}
                      onChange={e => setNoteContent(e.target.value)}
                      className="bg-transparent border-0 focus-visible:ring-0 text-3xl font-bold text-center resize-none shadow-none placeholder:text-white/50"
                  />
              </div>
              <div className="p-4 bg-background border-t flex justify-between items-center">
                  <div className="flex gap-2">
                      {gradientBackgrounds.map(bg => (
                          <button key={bg} onClick={() => setBackgroundStyle(bg)} className={cn("w-6 h-6 rounded-full border border-white/20", bg)} />
                      ))}
                  </div>
                  <Button onClick={handleTextSubmit} disabled={isSubmitting || !noteContent.trim()}>
                      {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Publish'}
                  </Button>
              </div>
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
    </div>
  );
}
