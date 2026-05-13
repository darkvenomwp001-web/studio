
'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Loader2, 
  Send, 
  Radio, 
  Image as ImageIcon, 
  X, 
  Zap, 
  AlertTriangle, 
  Info,
  BadgeAlert
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { id: 'feature', label: 'New Feature', color: 'text-green-500' },
    { id: 'bugfix', label: 'Bug Fix', color: 'text-blue-500' },
    { id: 'maintenance', label: 'Maintenance', color: 'text-orange-500' },
    { id: 'announcement', label: 'Announcement', color: 'text-purple-500' },
];

const STATUSES = ['new', 'progress', 'live', 'fixed'];

export default function CreateBroadcastForm() {
    const { user, addNotification } = useAuth();
    const { toast } = useToast();
    const [content, setContent] = useState('');
    const [category, setCategory] = useState<any>('feature');
    const [status, setStatus] = useState<any>('new');
    const [priority, setPriority] = useState<any>('normal');
    const [isPinned, setIsPinned] = useState(false);
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadFile = async (file: File): Promise<string> => {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset!);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    };

    const handleSubmit = async () => {
        if (!user || !content.trim()) return;
        setIsSubmitting(true);

        try {
            let imageUrl = '';
            if (imageFile) {
                imageUrl = await uploadFile(imageFile);
            }

            const broadcastData = {
                author: { id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl },
                content: content.trim(),
                category,
                status,
                priority,
                isPinned,
                imageUrl,
                timestamp: serverTimestamp(),
                reactionsCount: 0,
                commentsCount: 0,
                reactionCounts: { like: 0, love: 0, haha: 0, sad: 0, angry: 0, happy: 0 }
            };

            await addDoc(collection(db, 'broadcasts'), broadcastData);
            
            // Push Global Notification for major updates
            if (priority === 'high' || category === 'announcement') {
                await addNotification({
                    type: 'app_update',
                    userId: 'ALL_USERS_PLACEHOLDER', // In a real app, this would be a trigger for a Function
                    message: `Official Transmission: ${content.substring(0, 50)}...`,
                    link: `/?tab=broadcast`,
                    actor: { id: user.id, username: user.username, displayName: 'D4RKV3NOM Admin', avatarUrl: user.avatarUrl }
                });
            }

            toast({ title: "Transmission Successful!" });
            setContent('');
            setImageFile(null);
            setImagePreview(null);
            setPriority('normal');
            setIsPinned(false);
        } catch (error) {
            toast({ title: "Transmission Failed", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="rounded-[32px] border-none shadow-2xl bg-card/80 backdrop-blur-md overflow-hidden">
            <CardHeader className="bg-primary/5 p-6 border-b border-primary/10">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-primary text-white shadow-lg">
                        <Radio className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                        <CardTitle className="text-xl font-headline font-bold">Owner Transmission</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">Broadcast Hub Controls</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Type</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-none shadow-inner font-bold text-xs uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {CATEGORIES.map(c => (
                                    <SelectItem key={c.id} value={c.id} className="font-bold text-xs uppercase">{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-none shadow-inner font-bold text-xs uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {STATUSES.map(s => (
                                    <SelectItem key={s} value={s} className="font-bold text-xs uppercase">{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5 hidden sm:block">
                        <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger className="rounded-xl h-11 bg-muted/20 border-none shadow-inner font-bold text-xs uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-none shadow-2xl">
                                {['low', 'normal', 'high'].map(p => (
                                    <SelectItem key={p} value={p} className="font-bold text-xs uppercase">{p}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest ml-1">Transmission Message</Label>
                    <Textarea 
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="Push a technical update or announcement..."
                        className="min-h-[150px] bg-muted/30 border-none shadow-inner rounded-2xl resize-none text-base font-medium p-4 focus-visible:ring-primary/20"
                        disabled={isSubmitting}
                    />
                </div>

                {imagePreview && (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/40 shadow-lg group">
                        <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 rounded-full h-8 w-8 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4 bg-muted/10 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="ghost" size="icon" className="rounded-full h-11 w-11 bg-muted/20 hover:bg-primary/10 hover:text-primary transition-all shadow-sm" onClick={() => imageInputRef.current?.click()} disabled={isSubmitting}>
                        <ImageIcon className="h-5 w-5" />
                    </Button>
                    <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn(
                            "rounded-full h-11 px-6 font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm",
                            isPinned ? "bg-primary text-white shadow-xl" : "bg-muted/20 hover:bg-primary/10"
                        )}
                        onClick={() => setIsPinned(!isPinned)}
                    >
                        <Pin className="h-4 w-4 mr-2" /> {isPinned ? 'Pinned' : 'Pin to top'}
                    </Button>
                </div>
                <Button 
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !content.trim()} 
                    className="w-full sm:w-auto h-11 rounded-full px-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                    Broadcast Transmission
                </Button>
            </CardFooter>
        </Card>
    );
}
