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
    Link as LinkIcon,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDocs, where, limit } from 'firebase/firestore';
import type { CarouselSlide, Story } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const OWNER_HANDLES = ['arnv'];

export default function CarouselAdminPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [slides, setSlides] = useState<CarouselSlide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Current Slide Editor State
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
        const q = query(
            collection(db, 'stories'),
            where('visibility', '==', 'Public'),
            where('title', '>=', storySearch),
            where('title', '<=', storySearch + '\uf8ff'),
            limit(5)
        );
        const snap = await getDocs(q);
        setStoryResults(snap.docs.map(d => ({ id: d.id, ...d.data() } as Story)));
        setIsSearching(false);
    };

    const handleSelectStory = (story: Story) => {
        setSelectedSlide(prev => ({
            ...prev,
            storyId: story.id,
            title: story.title,
            authorUsername: story.author.username,
            ctaLink: `/stories/${story.id}`,
            ctaText: 'Start Reading'
        }));
        setStoryResults([]);
        setStorySearch('');
    };

    const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        setIsUploading(true);
        const file = e.target.files[0];
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset!);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            setSelectedSlide(prev => ({ ...prev, imageUrl: data.secure_url }));
            toast({ title: "Carousel Cover Uploaded!" });
        } catch (error) {
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveSlide = async () => {
        if (!selectedSlide?.imageUrl || !selectedSlide?.title || !selectedSlide?.ctaLink) {
            toast({ title: "Missing Data", description: "Image, Title, and Link are required.", variant: "destructive" });
            return;
        }
        setIsSaving(true);
        const slideId = selectedSlide.id || doc(collection(db, 'featuredCarousel')).id;
        const finalData = {
            ...selectedSlide,
            id: slideId,
            order: selectedSlide.order ?? slides.length,
            isActive: selectedSlide.isActive ?? true,
            createdAt: serverTimestamp()
        };

        try {
            await setDoc(doc(db, 'featuredCarousel', slideId), finalData);
            toast({ title: "Slide Saved Successfully!" });
            setSelectedSlide(null);
        } catch (error) {
            toast({ title: "Error Saving", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSlide = async (id: string) => {
        if (!confirm("Are you sure you want to delete this slide?")) return;
        await deleteDoc(doc(db, 'featuredCarousel', id));
        toast({ title: "Slide Deleted" });
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= slides.length) return;

        const newSlides = [...slides];
        const temp = newSlides[index].order;
        newSlides[index].order = newSlides[targetIndex].order;
        newSlides[targetIndex].order = temp;

        await Promise.all(newSlides.map(s => updateDoc(doc(db, 'featuredCarousel', s.id), { order: s.order })));
    };

    if (isLoading || authLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b p-3 md:p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-4 min-w-0">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="flex-shrink-0"><ArrowLeft className="h-5 w-5" /></Button>
                        <div className="truncate">
                            <h1 className="text-base md:text-xl font-headline font-bold truncate">Carousel Studio</h1>
                            <p className="hidden xs:block text-[8px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground truncate">Curate Discovery</p>
                        </div>
                    </div>
                    <Button onClick={() => setSelectedSlide({ order: slides.length, isActive: true, authorUsername: 'arnv', ctaText: 'Start Reading' })} className="rounded-full gap-2 text-xs md:text-sm h-9 md:h-10 px-3 md:px-4">
                        <Plus className="h-4 w-4" /> <span className="hidden xs:inline">New Slide</span>
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-8 grid lg:grid-cols-12 gap-8">
                {/* Slides List */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                        <LayoutGrid className="h-4 w-4 text-primary" />
                        <h2 className="font-bold text-sm uppercase tracking-widest">Active Queue</h2>
                    </div>
                    {slides.length === 0 ? (
                        <div className="p-8 border-2 border-dashed rounded-3xl text-center text-muted-foreground">
                            No curated slides. Create one to begin.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {slides.map((slide, index) => (
                                <Card key={slide.id} className={cn(
                                    "rounded-3xl border-none shadow-md overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
                                    selectedSlide?.id === slide.id && "ring-2 ring-primary shadow-xl scale-[1.01]"
                                )} onClick={() => setSelectedSlide(slide)}>
                                    <div className="relative aspect-[21/9] bg-muted">
                                        <Image src={slide.imageUrl} alt="" fill className="object-cover" />
                                        {!slide.isActive && <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center font-bold text-white text-[10px] uppercase tracking-widest">Disabled</div>}
                                    </div>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-sm truncate">{slide.title}</h3>
                                            <p className="text-[10px] text-muted-foreground truncate">CTA: {slide.ctaText}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 flex-shrink-0">
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleMove(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleMove(index, 'down'); }} disabled={index === slides.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Editor & Preview */}
                <div className="lg:col-span-8 space-y-8">
                    {selectedSlide ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            {/* Live Preview */}
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Eye className="h-4 w-4 text-accent" />
                                    <h2 className="font-bold text-sm uppercase tracking-widest">Studio Preview</h2>
                                </div>
                                <div className="relative aspect-video md:aspect-[21/9] w-full overflow-hidden rounded-[2rem] md:rounded-[3rem] bg-muted shadow-2xl border-2 md:border-4 border-background transform-gpu">
                                    {selectedSlide.imageUrl ? (
                                        <Image src={selectedSlide.imageUrl} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 p-4 text-center">
                                            <ImagePlus className="h-10 w-10 md:h-12 md:w-12" />
                                            <p className="text-[10px] font-bold mt-2 uppercase tracking-tighter">Waiting for Cover...</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-12">
                                        <div className="space-y-1 md:space-y-2 max-w-xl">
                                            <Badge className="bg-primary text-white text-[8px] md:text-[10px] uppercase tracking-widest">Featured</Badge>
                                            <h2 className="text-xl md:text-5xl font-headline font-bold text-white drop-shadow-xl line-clamp-2">{selectedSlide.title || 'Snappy Headline'}</h2>
                                            <p className="text-[10px] md:text-lg text-white/70 font-medium line-clamp-1">{selectedSlide.subtitle || 'Supporting manuscript description...'}</p>
                                            <div className="pt-2 md:pt-4 flex gap-2 md:gap-4">
                                                <Button size="sm" className="md:size-lg rounded-full px-6 md:px-8 bg-primary hover:bg-primary/90 shadow-2xl font-bold text-[10px] md:text-sm">{selectedSlide.ctaText || 'Read Now'}</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Configuration Panel */}
                            <Card className="rounded-[2rem] md:rounded-[2.5rem] border-none shadow-xl bg-card/50 backdrop-blur-md overflow-hidden">
                                <CardHeader className="bg-muted/30 border-b p-6 md:p-8">
                                    <CardTitle className="text-xl md:text-2xl font-headline font-bold">Configuration</CardTitle>
                                    <CardDescription className="text-xs">Tailor discovery metadata for mobile and desktop.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 md:p-8 space-y-6 md:space-y-8">
                                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                                        <div className="space-y-4 md:space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Headline</Label>
                                                <Input value={selectedSlide.title || ''} onChange={e => setSelectedSlide({...selectedSlide, title: e.target.value})} placeholder="Catchy title" className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-inner" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Sub-Headline</Label>
                                                <Input value={selectedSlide.subtitle || ''} onChange={e => setSelectedSlide({...selectedSlide, subtitle: e.target.value})} placeholder="Short description" className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-inner" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">CTA Text</Label>
                                                <Input value={selectedSlide.ctaText || ''} onChange={e => setSelectedSlide({...selectedSlide, ctaText: e.target.value})} placeholder="e.g. Read Now" className="h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-inner" />
                                            </div>
                                        </div>

                                        <div className="space-y-4 md:space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Target Link</Label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input value={selectedSlide.ctaLink || ''} onChange={e => setSelectedSlide({...selectedSlide, ctaLink: e.target.value})} placeholder="/stories/id..." className="pl-10 h-11 md:h-12 rounded-xl md:rounded-2xl bg-muted/20 border-none shadow-inner" />
                                                </div>
                                            </div>
                                            <div className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Sparkles className="h-4 w-4 text-primary" />
                                                        <span className="text-[10px] font-bold uppercase tracking-widest">Story Linker</span>
                                                    </div>
                                                    {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input placeholder="Search handle..." value={storySearch} onChange={e => setStorySearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearchStories()} className="h-10 rounded-xl bg-background border-none text-xs" />
                                                    <Button size="sm" onClick={handleSearchStories} className="rounded-xl px-4">Find</Button>
                                                </div>
                                                <ScrollArea className="h-32">
                                                    <div className="space-y-2">
                                                        {storyResults.map(s => (
                                                            <div key={s.id} onClick={() => handleSelectStory(s)} className="p-2 bg-background hover:bg-muted rounded-xl flex items-center gap-3 cursor-pointer transition-all border border-transparent hover:border-primary/20 group">
                                                                <div className="relative h-8 w-6 rounded overflow-hidden flex-shrink-0 shadow-sm">
                                                                    <Image src={s.coverImageUrl || `https://picsum.photos/seed/${s.id}/100/150`} alt="" fill className="object-cover" />
                                                                </div>
                                                                <span className="text-[10px] font-bold truncate flex-1 group-hover:text-primary">{s.title}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="opacity-20" />

                                    <div className="flex flex-col gap-6">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                                                <div className="space-y-0.5">
                                                    <Label htmlFor="active-toggle" className="text-[10px] font-bold uppercase tracking-widest cursor-pointer block">Visibility</Label>
                                                    <p className="text-[9px] text-muted-foreground uppercase">Live on homepage</p>
                                                </div>
                                                <Switch id="active-toggle" checked={selectedSlide.isActive} onCheckedChange={v => setSelectedSlide({...selectedSlide, isActive: v})} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border border-border/40">
                                                <div className="space-y-0.5">
                                                    <Label className="text-[10px] font-bold uppercase tracking-widest block">Slide Cover</Label>
                                                    <p className="text-[9px] text-muted-foreground uppercase">{selectedSlide.imageUrl ? 'Change image' : 'No image'}</p>
                                                </div>
                                                <Button size="sm" variant="outline" className="rounded-xl h-9 px-4 gap-2 text-[10px] font-bold uppercase" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                                    {isUploading ? <Loader2 className="h-3 w-3 animate-spin"/> : <ImagePlus className="h-3 w-3"/>}
                                                    {selectedSlide.imageUrl ? 'Edit' : 'Add'}
                                                </Button>
                                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                                            <Button variant="ghost" className="flex-1 rounded-full h-12 font-bold uppercase text-[10px] tracking-widest" onClick={() => setSelectedSlide(null)}>Discard</Button>
                                            <Button onClick={handleSaveSlide} disabled={isSaving || isUploading} className="flex-[2] rounded-full h-12 bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 font-bold uppercase text-[10px] tracking-widest transition-all hover:scale-[1.02] active:scale-95">
                                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                Transmit to Home
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-destructive/5 p-4 flex justify-center">
                                    {selectedSlide.id && (
                                        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 rounded-xl h-9 gap-2 font-bold text-[10px] uppercase" onClick={() => handleDeleteSlide(selectedSlide.id!)}>
                                            <Trash2 className="h-4 w-4" /> Permanently Erase
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </div>
                    ) : (
                        <div className="h-[400px] md:h-[600px] flex flex-col items-center justify-center text-center p-8 md:p-12 bg-card/20 rounded-[2.5rem] md:rounded-[4rem] border-2 md:border-4 border-dashed border-border/20">
                            <div className="p-6 md:p-8 rounded-full bg-primary/5 mb-6">
                                <Sparkles className="h-12 w-12 md:h-16 md:w-16 text-primary/20" />
                            </div>
                            <h2 className="text-2xl md:text-3xl font-headline font-bold mb-2">Editor Standby</h2>
                            <p className="text-muted-foreground text-xs md:text-sm max-w-[280px] md:max-w-sm mx-auto">Select an active slide or launch a new curation from the studio header.</p>
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-left hidden sm:grid">
                                <div className="p-4 rounded-3xl bg-muted/40 border border-border/20">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-primary mb-1">STORY LINKER</h4>
                                    <p className="text-[10px] leading-relaxed text-muted-foreground">Automatically pulls manuscript IDs for precise CTA routing.</p>
                                </div>
                                <div className="p-4 rounded-3xl bg-muted/40 border border-border/20">
                                    <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-accent mb-1">CINEMATIC RATIO</h4>
                                    <p className="text-[10px] leading-relaxed text-muted-foreground">Upload 21:9 landscapes for the most premium desktop visual impact.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
