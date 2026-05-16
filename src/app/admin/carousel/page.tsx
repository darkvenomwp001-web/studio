'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
    Loader2, 
    Plus, 
    Trash2, 
    Save, 
    ArrowLeft, 
    ImagePlus, 
    Eye, 
    Search, 
    ChevronUp, 
    ChevronDown,
    LayoutGrid,
    Sparkles,
    Link as LinkIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, getDocs, where, limit } from 'firebase/firestore';
import type { CarouselSlide, Story } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const OWNER_HANDLES = ['arnv'];

export default function CarouselAdminPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [slides, setSlides] = useState<CarouselSlide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [selectedSlide, setSelectedSlide] = useState<Partial<CarouselSlide> | null>(null);
    const [storySearch, setStorySearch] = useState('');
    const [storyResults, setStoryResults] = useState<Story[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !OWNER_HANDLES.includes(user.username)) {
            router.push('/');
            return;
        }

        const q = query(collection(db, 'featuredCarousel'), orderBy('order', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setSlides(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CarouselSlide)));
            setIsLoading(false);
        });

        return () => unsub();
    }, [user, authLoading, router]);

    const handleSearchStories = async () => {
        if (!storySearch.trim()) return;
        setIsSearching(true);
        const q = query(collection(db, 'stories'), where('visibility', '==', 'Public'), where('title', '>=', storySearch), where('title', '<=', storySearch + '\uf8ff'), limit(5));
        const snap = await getDocs(q);
        setStoryResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
        setIsSearching(false);
    };

    const handleSaveSlide = async () => {
        if (!selectedSlide?.imageUrl || !selectedSlide?.ctaLink) return;
        setIsSaving(true);
        const slideId = selectedSlide.id || doc(collection(db, 'featuredCarousel')).id;
        const finalData = { ...selectedSlide, id: slideId, order: selectedSlide.order ?? slides.length, isActive: selectedSlide.isActive ?? true, createdAt: serverTimestamp() };

        try {
            await setDoc(doc(db, 'featuredCarousel', slideId), finalData);
            toast({ title: "Slide Saved!" });
            setSelectedSlide(null);
        } catch (error) {
            toast({ title: "Error Saving", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSlide = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteDoc(doc(db, 'featuredCarousel', id));
            toast({ title: "Slide Deleted" });
            setSelectedSlide(null);
        } catch (error) {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/')}><ArrowLeft className="h-5 w-5" /></Button>
                        <h1 className="text-xl font-headline font-bold">Carousel Studio</h1>
                    </div>
                    <Button onClick={() => setSelectedSlide({ order: slides.length, isActive: true, ctaText: 'Read Now' })} className="rounded-full gap-2"><Plus className="h-4 w-4" /> New Slide</Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-4">
                    {slides.map((slide, index) => (
                        <Card key={slide.id} className={cn("rounded-2xl cursor-pointer", selectedSlide?.id === slide.id && "ring-2 ring-primary")} onClick={() => setSelectedSlide(slide)}>
                            <div className="relative aspect-[21/9] bg-muted rounded-t-2xl overflow-hidden">
                                <Image src={slide.imageUrl} alt="" fill className="object-cover" />
                            </div>
                            <CardContent className="p-4"><h3 className="font-bold text-sm truncate">{slide.title || 'Untitled Slide'}</h3></CardContent>
                        </Card>
                    ))}
                </div>

                <div className="lg:col-span-8 space-y-8">
                    {selectedSlide ? (
                        <Card className="rounded-[2rem] shadow-xl">
                            <CardHeader><CardTitle>Slide Config</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <Label>CTA Text</Label>
                                        <Input value={selectedSlide.ctaText || ''} onChange={e => setSelectedSlide({...selectedSlide, ctaText: e.target.value})} />
                                        <Label>Target Link</Label>
                                        <Input value={selectedSlide.ctaLink || ''} onChange={e => setSelectedSlide({...selectedSlide, ctaLink: e.target.value})} />
                                    </div>
                                    <div className="space-y-4 bg-muted/20 p-4 rounded-2xl">
                                        <Label>Story Linker</Label>
                                        <div className="flex gap-2">
                                            <Input placeholder="Search..." value={storySearch} onChange={e => setStorySearch(e.target.value)} />
                                            <Button size="sm" onClick={handleSearchStories}>Find</Button>
                                        </div>
                                        <div className="space-y-2 max-h-32 overflow-auto">
                                            {storyResults.map(s => <button key={s.id} onClick={() => setSelectedSlide({...selectedSlide, ctaLink: `/stories/${s.id}`, title: s.title})} className="w-full text-left text-xs p-2 hover:bg-muted rounded-lg truncate">{s.title}</button>)}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                                    <Label>Live Visibility</Label>
                                    <Switch checked={selectedSlide.isActive} onCheckedChange={v => setSelectedSlide({...selectedSlide, isActive: v})} />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl">
                                    <Label>Slide Image</Label>
                                    <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>Upload</Button>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleSaveSlide} />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button variant="ghost" onClick={() => setSelectedSlide(null)}>Discard</Button>
                                <div className="flex gap-2">
                                    {selectedSlide.id && <Button variant="destructive" onClick={() => handleDeleteSlide(selectedSlide.id!)}><Trash2 className="h-4 w-4" /></Button>}
                                    <Button onClick={handleSaveSlide} disabled={isSaving}>Save Slide</Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ) : <div className="p-20 text-center text-muted-foreground border-2 border-dashed rounded-[3rem]">Select a slide to edit</div>}
                </div>
            </main>
        </div>
    );
}
