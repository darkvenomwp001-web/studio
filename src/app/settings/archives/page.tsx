
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { db } from '@/lib/firebase';
import { 
    collection, 
    query, 
    where, 
    orderBy, 
    onSnapshot,
    doc,
    updateDoc
} from 'firebase/firestore';
import { 
    Loader2, 
    ArrowLeft, 
    Archive, 
    EyeOff, 
    Grid, 
    List, 
    MoreHorizontal, 
    RotateCcw, 
    Trash2, 
    Book, 
    MessageCircle, 
    Quote, 
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import NextImage from 'next/image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

type ViewMode = 'grid' | 'list';

export default function ArchivesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [isLoading, setIsLoading] = useState(true);

    const [archivedPosts, setArchivedPosts] = useState<any[]>([]);
    const [archivedPrompts, setArchivedPrompts] = useState<any[]>([]);
    const [privateStories, setPrivateStories] = useState<any[]>([]);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);

        // Fetch hidden/archived posts
        const postsQuery = query(
            collection(db, 'feedPosts'),
            where('author.id', '==', user.id),
            where('isHidden', '==', true)
        );
        const unsubPosts = onSnapshot(postsQuery, (snap) => {
            setArchivedPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch archived prompts
        const promptsQuery = query(
            collection(db, 'prompts'),
            where('author.id', '==', user.id),
            where('isArchived', '==', true)
        );
        const unsubPrompts = onSnapshot(promptsQuery, (snap) => {
            setArchivedPrompts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch private manuscripts/drafts
        const storiesQuery = query(
            collection(db, 'stories'),
            where('author.id', '==', user.id),
            where('visibility', '!=', 'Public')
        );
        const unsubStories = onSnapshot(storiesQuery, (snap) => {
            setPrivateStories(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setIsLoading(false);
        });

        return () => {
            unsubPosts();
            unsubPrompts();
            unsubStories();
        };
    }, [user]);

    const handleRestore = async (type: string, id: string) => {
        const ref = doc(db, type, id);
        const updateData = type === 'feedPosts' ? { isHidden: false } : { isArchived: false, visibility: 'Public' };
        
        try {
            await updateDoc(ref, updateData);
            toast({ title: "Node Restored", description: "This signal is back in your main archive." });
        } catch (e) {
            toast({ title: "Failed to restore", variant: "destructive" });
        }
    };

    if (loading || !user) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Private Vault...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
            <header className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 h-11 w-11 shadow-sm" onClick={() => router.back()}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="min-w-0">
                            <h1 className="text-3xl font-headline font-bold truncate tracking-tight">Archived Nodes</h1>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">Digital Vault</p>
                        </div>
                    </div>
                    <div className="flex items-center bg-muted/30 p-1 rounded-2xl border border-border/40 shadow-inner">
                        <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="rounded-xl h-10 w-10" onClick={() => setViewMode('grid')}><Grid className="h-4 w-4"/></Button>
                        <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="rounded-xl h-10 w-10" onClick={() => setViewMode('list')}><List className="h-4 w-4"/></Button>
                    </div>
                </div>
            </header>

            <Tabs defaultValue="signals" className="w-full">
                <div className="flex justify-center mb-10">
                    <TabsList className="bg-muted/50 p-1 rounded-full border border-border/40 shadow-sm backdrop-blur-md h-12 w-full max-w-sm">
                        <TabsTrigger value="signals" className="rounded-full font-bold flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <MessageCircle className="h-4 w-4" /> Signals
                        </TabsTrigger>
                        <TabsTrigger value="manuscripts" className="rounded-full font-bold flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <Book className="h-4 w-4" /> Manuscripts
                        </TabsTrigger>
                        <TabsTrigger value="visuals" className="rounded-full font-bold flex-1 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <ImageIcon className="h-4 w-4" /> Visuals
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="signals" className="space-y-4 animate-in fade-in duration-500">
                    {archivedPosts.length > 0 ? (
                        <div className={cn(
                            viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "space-y-3"
                        )}>
                            {archivedPosts.map(post => (
                                <Card key={post.id} className="rounded-3xl border-border/40 overflow-hidden bg-card/40 hover:bg-muted/30 transition-all group">
                                    <CardContent className={cn("p-4", viewMode === 'grid' && "aspect-square flex flex-col justify-between")}>
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="text-[8px] uppercase tracking-tighter bg-primary/5 text-primary border-primary/20">Hidden</Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4"/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem onClick={() => handleRestore('feedPosts', post.id)} className="gap-2"><RotateCcw className="h-4 w-4"/> Restore</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive gap-2"><Trash2 className="h-4 w-4"/> Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <p className="text-sm font-medium line-clamp-3 mt-2">{post.content}</p>
                                        <p className="text-[9px] font-black uppercase text-muted-foreground/40 mt-4">
                                            {post.timestamp ? formatDistanceToNow(post.timestamp.toDate(), { addSuffix: true }) : ''}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyArchive />
                    )}
                </TabsContent>

                <TabsContent value="manuscripts" className="space-y-4 animate-in fade-in duration-500">
                    {privateStories.length > 0 ? (
                        <div className={cn(
                            viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 gap-4" : "space-y-3"
                        )}>
                            {privateStories.map(story => (
                                <Card key={story.id} className="rounded-3xl border-border/40 overflow-hidden bg-card/40 group">
                                    <div className="relative aspect-[3/4] w-full bg-muted">
                                        <NextImage src={story.coverImageUrl || `https://picsum.photos/seed/${story.id}/200/300`} alt="" fill className="object-cover opacity-60 grayscale" />
                                        <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-4">
                                            <h4 className="text-white font-bold text-sm truncate">{story.title}</h4>
                                            <p className="text-white/60 text-[9px] uppercase font-black">{story.visibility}</p>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                             <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white bg-black/20 backdrop-blur-md"><MoreHorizontal className="h-4 w-4"/></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="rounded-xl">
                                                    <DropdownMenuItem onClick={() => router.push(`/write/edit-details?storyId=${story.id}`)} className="gap-2"><Book className="h-4 w-4"/> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRestore('stories', story.id)} className="gap-2"><Globe className="h-4 w-4"/> Make Public</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <EmptyArchive />
                    )}
                </TabsContent>

                <TabsContent value="visuals" className="space-y-4 animate-in fade-in duration-500">
                    <EmptyArchive />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EmptyArchive() {
    return (
        <div className="text-center py-32 bg-muted/5 rounded-[3rem] border-2 border-dashed border-border/40 max-w-2xl mx-auto flex flex-col items-center gap-6">
            <Archive className="h-16 w-16 text-muted-foreground/20 mx-auto" />
            <div className="space-y-2">
                <h3 className="text-2xl font-headline font-bold text-foreground">Archive is Empty</h3>
                <p className="text-sm text-muted-foreground px-12 italic">Your retracted nodes and hidden signals will stay safe in this vault.</p>
            </div>
        </div>
    );
}
