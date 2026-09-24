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
    UploadCloud,
    MoveVertical,
    CheckCircle2,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { db } from '@/lib/firebase';
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc, 
    updateDoc, 
    serverTimestamp, 
    getDocs, 
    where, 
    limit,
    writeBatch
} from 'firebase/firestore';
import type { CarouselSlide, Story } from '@/types';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

    const uploadToCloudinary = async (file: File): Promise<string> => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        
        if (!cloudName || !uploadPreset) throw new Error("Cloudinary calibration missing");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        if (data.secure_url) return data.secure_url;
        throw new Error(data.error?.message || "Transmission failure");
    };

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0] || !selectedSlide) return;
        
        setIsUploading(true);
        try {
            const url = await uploadToCloudinary(e.target.files[0]);
            setSelectedSlide({ ...selectedSlide, imageUrl: url });
            toast({ title: "Image Uploaded", description: "The slide visual is ready." });
        } catch (error) {
            toast({ title: "Upload Failed", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveSlide = async () => {
        if (!selectedSlide?.imageUrl || !selectedSlide?.ctaLink) {
            toast({ title: "Validation Error", description: "Image and Link are required.", variant: "destructive" });
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
            toast({ title: "Slide Synchronized", description: "Changes are now live in the archive." });
            setSelectedSlide(null);
        } catch (error) {
            toast({ title: "Sync Error", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteSlide = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'featuredCarousel', id));
            toast({ title: "Slide Erased" });
            setSelectedSlide(null);
        } catch (error) {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    };

    const moveSlide = async (index: number, direction: 'up' | 'down') => {
        const newSlides = [...slides];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (targetIndex < 0 || targetIndex >= slides.length) return;

        [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];

        const batch = writeBatch(db);
        newSlides.forEach((slide, i) => {
            batch.update(doc(db, 'featuredCarousel', slide.id), { order: i });
        });

        try {
            await batch.commit();
            toast({ title: "Sequence Updated" });
        } catch (e) {
            toast({ title: "Update Failed", variant: "destructive" });
        }
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground animate-pulse">Syncing Studio Nodes...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-background pb-32 animate-in fade-in duration-700">
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b p-4 md:p-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 hover:bg-muted" onClick={() => router.push('/')}>
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div className="space-y-1">
                            <h1 className="text-2xl md:text-3xl font-headline font-bold tracking-tight">Carousel Studio</h1>
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Featured Content Hub</p>
                        </div>
                    </div>
                    <Button onClick={() => setSelectedSlide({ order: slides.length, isActive: true, ctaText: 'Read Now' })} className="rounded-full gap-2 px-8 h-12 font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                        <Plus className="h-5 w-5" /> New Slide
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-4 md:p-10 grid lg:grid-cols-12 gap-10">
                {/* Slide Registry */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Registry ({slides.length})</h2>
                    </div>
                    <ScrollArea className="h-[calc(100vh-250px)] pr-4 -mr-4">
                        <div className="space-y-4">
                            {slides.map((slide, index) => (
                                <div key={slide.id} className="group relative">
                                    <Card 
                                        className={cn(
                                            "rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border-border/40 shadow-sm",
                                            selectedSlide?.id === slide.id ? "ring-2 ring-primary bg-primary/5 shadow-xl" : "hover:bg-muted/30"
                                        )} 
                                        onClick={() => setSelectedSlide(slide)}
                                    >
                                        <div className="relative aspect-[21/9] bg-muted overflow-hidden">
                                            <Image src={slide.imageUrl} alt="" fill className="object-cover transition-transform group-hover:scale-105 duration-700" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="text-white h-8 w-8" />
                                            </div>
                                            {!slide.isActive && (
                                                <Badge className="absolute top-2 left-2 bg-yellow-500 text-white border-none text-[8px] font-black uppercase">Draft</Badge>
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-bold text-sm truncate">{slide.title || 'Untitled Archive'}</h3>
                                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">Order: {slide.order}</p>
                                        </CardContent>
                                    </Card>
                                    <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background" onClick={(e) => { e.stopPropagation(); moveSlide(index, 'up'); }} disabled={index === 0}>
                                            <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg bg-background" onClick={(e) => { e.stopPropagation(); moveSlide(index, 'down'); }} disabled={index === slides.length - 1}>
                                            <ChevronDown className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Configuration Console */}
                <div className="lg:col-span-8">
                    {selectedSlide ? (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            {/* Live Preview Node */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-4">Live Preview</h3>
                                <div className="relative aspect-[21/9] md:aspect-[3/1] rounded-[2.5rem] overflow-hidden bg-muted shadow-2xl border border-border/40 group">
                                    {selectedSlide.imageUrl ? (
                                        <Image src={selectedSlide.imageUrl} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30 italic">No image selected</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent flex flex-col justify-end p-8">
                                        <Button size="lg" className="rounded-full w-fit px-10 font-bold shadow-xl shadow-primary/20 pointer-events-none">
                                            {selectedSlide.ctaText || 'Read Now'}
                                        </Button>
                                    </div>
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-10">
                                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                        </div>
                                    )}
                                </div>
                            </section>

                            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-card/60 backdrop-blur-sm">
                                <CardHeader className="bg-muted/20 border-b p-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 rounded-2xl bg-primary text-white shadow-lg">
                                            <Sparkles className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-2xl font-headline font-bold">Node Settings</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-8 space-y-10">
                                    <div className="grid md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Button Text</Label>
                                                <Input 
                                                    value={selectedSlide.ctaText || ''} 
                                                    onChange={e => setSelectedSlide({...selectedSlide, ctaText: e.target.value})}
                                                    className="h-12 rounded-xl bg-muted/20 border-none shadow-inner text-base font-bold"
                                                    placeholder="E.g. Read Now"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Archive Address (URL)</Label>
                                                <div className="relative">
                                                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                                    <Input 
                                                        value={selectedSlide.ctaLink || ''} 
                                                        onChange={e => setSelectedSlide({...selectedSlide, ctaLink: e.target.value})}
                                                        className="pl-12 h-12 rounded-xl bg-muted/20 border-none shadow-inner"
                                                        placeholder="/stories/xyz..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-6 p-6 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                    <Label className="text-[10px] font-black uppercase tracking-widest">Story Linker</Label>
                                                </div>
                                                {isSearching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                                            </div>
                                            <div className="flex gap-2">
                                                <Input 
                                                    placeholder="Search manuscripts..." 
                                                    value={storySearch} 
                                                    onChange={e => setStorySearch(e.target.value)}
                                                    className="h-10 rounded-xl bg-background border-none shadow-sm text-xs"
                                                />
                                                <Button size="sm" onClick={handleSearchStories} className="rounded-xl h-10 px-4">Find</Button>
                                            </div>
                                            <div className="space-y-1 max-h-32 overflow-auto mt-4 pr-2">
                                                {storyResults.map(s => (
                                                    <button 
                                                        key={s.id} 
                                                        onClick={() => setSelectedSlide({...selectedSlide, ctaLink: `/stories/${s.id}`, title: s.title})} 
                                                        className="w-full text-left text-[10px] font-bold p-2.5 hover:bg-primary/10 rounded-lg truncate transition-all flex items-center justify-between group"
                                                    >
                                                        <span>{s.title}</span>
                                                        <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </button>
                                                ))}
                                                {storyResults.length === 0 && storySearch && !isSearching && <p className="text-[10px] text-muted-foreground text-center py-4 italic">No matches identified</p>}
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="opacity-20" />

                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="flex-1 flex items-center justify-between p-6 bg-muted/20 rounded-3xl border border-border/40 shadow-inner">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Live Status</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Show in homepage carousel</p>
                                            </div>
                                            <Switch 
                                                checked={selectedSlide.isActive} 
                                                onCheckedChange={v => setSelectedSlide({...selectedSlide, isActive: v})} 
                                            />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between p-6 bg-muted/20 rounded-3xl border border-border/40 shadow-inner group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold">Visual Asset</Label>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Update slide photo</p>
                                            </div>
                                            <Button size="icon" variant="outline" className="rounded-2xl h-12 w-12 border-border/60 hover:bg-primary hover:text-white transition-all">
                                                <ImagePlus className="h-5 w-5" />
                                            </Button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/10 p-8 flex flex-col sm:flex-row justify-between gap-4 border-t border-border/20">
                                    <Button variant="ghost" onClick={() => setSelectedSlide(null)} className="rounded-full font-bold uppercase text-[10px] tracking-widest px-8">Discard Changes</Button>
                                    <div className="flex gap-3 w-full sm:w-auto">
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                {selectedSlide.id && (
                                                    <Button variant="ghost" size="icon" className="rounded-full h-14 w-14 text-destructive hover:bg-destructive/10">
                                                        <Trash2 className="h-6 w-6" />
                                                    </Button>
                                                )}
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-[2.5rem] border-none shadow-3xl">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-2xl font-headline font-bold">Delete Slide?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently remove the slide from the archive.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel className="rounded-full px-8">Cancel</AlertDialogCancel>
                                                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90 rounded-full px-8 font-bold" onClick={() => handleDeleteSlide(selectedSlide.id!)}>Delete Node</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        <Button 
                                            onClick={handleSaveSlide} 
                                            disabled={isSaving || isUploading} 
                                            className="flex-1 sm:flex-none min-w-[200px] h-14 rounded-full font-black uppercase text-xs tracking-widest bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
                                            Commit Changes
                                        </Button>
                                    </div>
                                </CardFooter>
                            </Card>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-6 bg-muted/5 rounded-[4rem] border-4 border-dashed border-border/20 animate-pulse">
                            <div className="p-8 rounded-full bg-muted/40">
                                <LayoutGrid className="h-20 w-20 text-muted-foreground/20" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-headline font-bold opacity-20 uppercase tracking-widest">Select Archive Node</h3>
                                <p className="text-sm text-muted-foreground/40 max-w-xs font-medium">Pick a slide from the registry or create a new one to begin calibration.</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}