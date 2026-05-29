'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User, StatusUpdate } from '@/types';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import StatusViewer from './StatusViewer';

function CreateStatusBubble() {
  return (
    <Link
      href="/status/create"
      className="relative text-center flex-shrink-0 w-16 md:w-20 cursor-pointer group"
    >
      <div className="relative w-14 h-14 md:w-16 md:h-16 mx-auto group-hover:scale-105 transition-all">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted border-2 border-dashed border-primary/40 flex items-center justify-center shadow-sm">
            <Plus className="h-5 w-5 md:h-6 md:w-6 text-primary" />
        </div>
      </div>
      <p className="text-[9px] md:text-[10px] font-bold uppercase mt-1.5 truncate tracking-tighter opacity-60">Add Status</p>
    </Link>
  );
}

function StatusBubble({ user, onSelect, hasStatus, label }: { user: User, onSelect: (user: User) => void, hasStatus: boolean, label?: string }) {
  return (
    <div
      className="relative text-center flex-shrink-0 w-16 md:w-20 cursor-pointer group"
      onClick={() => onSelect(user)}
    >
      <div className="relative w-14 h-14 md:w-16 md:h-16 mx-auto group-hover:scale-110 transition-transform duration-200">
         <div className={cn(
            "w-14 h-14 md:w-16 md:h-16 p-0.5 rounded-full",
            hasStatus ? "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500" : "bg-muted"
        )}>
            <Avatar className="w-full h-full border-2 border-background">
                <AvatarImage src={user.avatarUrl} data-ai-hint="profile person" />
                <AvatarFallback className="text-[10px] md:text-xs font-bold">{user.username?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
        </div>
      </div>
      <p className="text-[9px] md:text-[10px] font-bold uppercase mt-1.5 truncate tracking-tighter">{label || user.displayName || user.username}</p>
    </div>
  );
}

export default function StatusFeature() {
  const { user } = useAuth();
  const [allStatuses, setAllStatuses] = useState<StatusUpdate[]>([]);
  const [groupedStatuses, setGroupedStatuses] = useState<Map<string, {user: User, statuses: StatusUpdate[]}>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedUserForViewing, setSelectedUserForViewing] = useState<User | null>(null);
  const [statusOrder, setStatusOrder] = useState<string[]>([]);

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

    allStatuses.forEach(status => {
        if (!groups.has(status.authorId)) {
            groups.set(status.authorId, { user: status.authorInfo as User, statuses: [] });
            if (status.authorId === user?.id) {
                newStatusOrder.unshift(status.authorId);
            } else {
                newStatusOrder.push(status.authorId);
            }
        }
        groups.get(status.authorId)!.statuses.push(status);
    });

    setGroupedStatuses(groups);
    setStatusOrder(newStatusOrder);
  }, [allStatuses, user?.id]);

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
    setSelectedUserForViewing(selectedUser);
    setIsViewerOpen(true);
  };

  return (
    <div className='py-4 -mx-4 px-4 overflow-hidden border-b border-border/40 bg-card/20 w-full max-w-full'>
      <ScrollArea className="w-full whitespace-nowrap scrollbar-none">
        <div className="flex items-start space-x-3 md:space-x-4 pb-2 px-1">
            {isLoading ? (
                [...Array(6)].map((_, i) => <div key={i} className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-muted animate-pulse flex-shrink-0" />)
            ) : (
                <>
                    {user && !user.isAnonymous && (
                        <CreateStatusBubble />
                    )}

                    {statusOrder.map((userId) => {
                        const group = groupedStatuses.get(userId);
                        if (!group || group.statuses.length === 0) return null;
                        return (
                            <StatusBubble 
                                key={userId} 
                                user={group.user} 
                                hasStatus={true} 
                                onSelect={handleSelectUser}
                                label={userId === user?.id ? 'My Status' : undefined}
                            />
                        );
                    })}
                </>
            )}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

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
