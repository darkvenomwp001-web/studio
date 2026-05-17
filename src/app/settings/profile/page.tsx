'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, UploadCloud, ArrowLeft, Music, User, AtSign, AlignLeft, Info, ExternalLink, Sparkles, Camera, ImagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { User as AppUser, WritingStatus } from '@/types';
import NextImage from 'next/image';

const WRITING_STATUSES: { value: WritingStatus; label: string; icon: string }[] = [
    { value: 'none', label: 'No Status', icon: '😶' },
    { value: 'writing', label: 'Currently Writing', icon: '✍️' },
    { value: 'break', label: 'Taking a Short Break', icon: '☕' },
    { value: 'hiatus', label: 'On Hiatus', icon: '🌧' },
    { value: 'update', label: 'Preparing Big Update', icon: '🔥' },
    { value: 'burnout', label: 'Burned Out', icon: '💤' },
    { value: 'school', label: 'Busy With School', icon: '🎓' },
    { value: 'rewriting', label: 'Rewriting Story', icon: '❤️' },
    { value: 'brainstorming', label: 'Brainstorming Arc', icon: '🎧' },
];

export default function EditProfilePage() {
  const { user, loading: authLoadingGlobal, authLoading: specificAuthLoading, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<'reader' | 'writer' | undefined>(undefined);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [profileSongUrl, setProfileSongUrl] = useState('');
  const [profileSongNote, setProfileSongNote] = useState('');
  const [writingStatus, setWritingStatus] = useState<WritingStatus>('none');
  
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setRole(user.role || 'reader');
      setAvatarPreview(user.avatarUrl || null);
      setCoverPreview(user.coverImageUrl || null);
      setProfileSongUrl(user.profileSongUrl || '');
      setProfileSongNote(user.profileSongNote || '');
      setWritingStatus(user.writingStatus || 'none');
    }
  }, [user]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ title: "File too large", description: "Please select a file smaller than 5MB.", variant: "destructive" });
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'avatar') {
            setAvatarFile(file);
            setAvatarPreview(reader.result as string);
        } else {
            setCoverFile(file);
            setCoverPreview(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) throw new Error("Cloudinary missing");

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    });
    const data = await response.json();
    if (data.secure_url) return data.secure_url;
    throw new Error(data.error?.message || 'Upload failed');
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProfileUpdating(true);

    let newAvatarUrl = user.avatarUrl;
    let newCoverUrl = user.coverImageUrl;

    try {
        if (avatarFile || coverFile) {
            setIsUploading(true);
            if (avatarFile) newAvatarUrl = await uploadToCloudinary(avatarFile);
            if (coverFile) newCoverUrl = await uploadToCloudinary(coverFile);
        }
        
        const updates: Partial<AppUser> = {};
        if (displayName !== user.displayName) updates.displayName = displayName;
        if (username !== user.username) updates.username = username;
        if (newAvatarUrl !== user.avatarUrl) updates.avatarUrl = newAvatarUrl;
        if (newCoverUrl !== user.coverImageUrl) updates.coverImageUrl = newCoverUrl;
        if (bio !== user.bio) updates.bio = bio;
        if (role !== user.role) updates.role = role;
        if (profileSongUrl !== user.profileSongUrl) updates.profileSongUrl = profileSongUrl;
        if (profileSongNote !== user.profileSongNote) updates.profileSongNote = profileSongNote;
        if (writingStatus !== user.writingStatus) updates.writingStatus = writingStatus;

        if (Object.keys(updates).length > 0) {
            await updateUserProfile(updates);
            setAvatarFile(null);
            setCoverFile(null);
        } else {
            toast({ title: "No changes detected." });
        }
    } catch (error) {
        console.error('Update error:', error);
        toast({ title: 'Update Failed', description: 'Could not synchronize your profile data.', variant: 'destructive' });
    } finally {
        setIsUploading(false);
        setIsProfileUpdating(false);
    }
  };

  if (authLoadingGlobal && !user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Entering Studio...</p>
      </div>
    );
  }

  if (!user && !authLoadingGlobal) {
    router.push('/auth/signin');
    return null;
  }
  
  if (!user) return null;

  const anySubmitting = isProfileUpdating || specificAuthLoading || isUploading;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-10">
        <header className="flex flex-col space-y-2">
            <Button variant="ghost" onClick={() => router.push('/settings')} className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Hub
            </Button>
            <h1 className="text-3xl font-headline font-bold text-foreground">Identity Studio</h1>
            <p className="text-muted-foreground text-sm">Refine your community presence and visual aesthetics.</p>
        </header>

        <form onSubmit={handleProfileSubmit} className="space-y-10 pb-20">
          <Card className="shadow-2xl border-none bg-card/50 backdrop-blur-md overflow-hidden rounded-[2.5rem]">
            {/* High-Fidelity Cover Upload Interface */}
            <div className="relative w-full aspect-[21/9] md:aspect-[4/1] bg-muted group cursor-pointer overflow-hidden border-b border-border/40" onClick={() => coverInputRef.current?.click()}>
                {coverPreview ? (
                    <NextImage src={coverPreview} alt="Cover Preview" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/30 animate-pulse">
                        <ImagePlus className="h-12 w-12 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Upload High-Fidelity Banner</p>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button variant="outline" className="bg-white/10 border-white/20 text-white rounded-full gap-2 pointer-events-none">
                        <Camera className="h-4 w-4" /> Change Banner
                    </Button>
                </div>
                <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover')} />
            </div>

            <CardHeader className="relative pb-10 pt-0">
                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16 md:-mt-24 px-6">
                  <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    <Avatar className="h-32 w-32 md:h-44 md:w-44 border-[6px] border-card shadow-2xl transition-transform duration-500 group-hover:scale-105">
                      <AvatarImage src={avatarPreview || ''} alt={displayName} />
                      <AvatarFallback className="text-4xl bg-primary/10 text-primary">{displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <UploadCloud className="text-white h-8 w-8" />
                    </div>
                    <input ref={avatarInputRef} type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" />
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-1">
                    <h2 className="text-2xl font-bold font-headline leading-tight">{displayName || 'Author'}</h2>
                    <p className="text-muted-foreground font-medium text-sm">@{username || 'handle'}</p>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => avatarInputRef.current?.click()} 
                        disabled={anySubmitting}
                        className="rounded-full h-8 px-4 mt-2 font-bold text-[10px] uppercase tracking-widest shadow-sm"
                    >
                         {isUploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <UploadCloud className="mr-2 h-3 w-3" />}
                         Sync Image
                    </Button>
                  </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 space-y-10">
                {/* Author Status Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Sparkles className="h-5 w-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Real-time Activity</h3>
                    </div>
                    <Select value={writingStatus} onValueChange={(v: WritingStatus) => setWritingStatus(v)}>
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/20 border-none shadow-inner transition-all hover:bg-muted/30">
                            <SelectValue placeholder="Current Writing Status..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-3xl border-none shadow-3xl">
                            {WRITING_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value} className="rounded-xl py-3 focus:bg-primary/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg">{status.icon}</span>
                                        <span className="font-bold text-[11px] uppercase tracking-wider">{status.label}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Separator className="opacity-40" />

                {/* Identity Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <User className="h-5 w-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Core Profile</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">Screen Name</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" className="pl-12 h-12 rounded-2xl bg-muted/20 border-none shadow-inner" disabled={anySubmitting} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">Unique Handle</Label>
                            <div className="relative">
                                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                                <Input 
                                    id="username" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value.toLowerCase())} 
                                    placeholder="handle" 
                                    className="pl-12 h-12 rounded-2xl bg-muted/20 border-none shadow-inner" 
                                    disabled={anySubmitting} 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                            <Label htmlFor="bio" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60">Creative Bio</Label>
                            <span className={cn("text-[9px] font-mono font-bold", bio.length > 300 ? "text-destructive" : "text-muted-foreground/40")}>{bio.length}/300</span>
                        </div>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 h-4 w-4 text-muted-foreground/40" />
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell your story..." rows={4} className="pl-12 pt-3.5 resize-none rounded-2xl bg-muted/20 border-none shadow-inner text-sm leading-relaxed" disabled={anySubmitting} maxLength={300} />
                        </div>
                    </div>
                </div>

                <Separator className="opacity-40" />

                {/* Vibe Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Music className="h-5 w-5" />
                        <h3 className="text-sm font-bold uppercase tracking-widest">Atmosphere</h3>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-muted/10 border-2 border-dashed border-border/40 space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="profileSongUrl" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 flex items-center gap-1.5 ml-1">
                                Spotify Soundtrack
                                <Popover>
                                    <PopoverTrigger asChild><Info className="h-3 w-3 cursor-help opacity-40 hover:opacity-100 transition-opacity" /></PopoverTrigger>
                                    <PopoverContent className="text-[10px] w-64 p-4 space-y-3 bg-card/95 backdrop-blur-xl border-none shadow-2xl rounded-2xl">
                                        <p className="font-black uppercase tracking-widest text-primary">Archiving Music:</p>
                                        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground font-medium">
                                            <li>Open the Spotify Interface</li>
                                            <li>Navigate to your Song &rarr; Share</li>
                                            <li>Choose "Copy Link" and paste here</li>
                                        </ol>
                                    </PopoverContent>
                                </Popover>
                            </Label>
                            <Input id="profileSongUrl" value={profileSongUrl} onChange={(e) => setProfileSongUrl(e.target.value)} placeholder="https://open.spotify.com/track/..." className="h-12 rounded-2xl bg-background border-none shadow-sm" disabled={anySubmitting} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="profileSongNote" className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/60 ml-1">Soundtrack Note</Label>
                            <Input id="profileSongNote" value={profileSongNote} onChange={(e) => setProfileSongNote(e.target.value)} placeholder="Currently writing to this loop..." className="h-12 rounded-2xl bg-background border-none shadow-sm" disabled={anySubmitting} />
                        </div>
                    </div>
                </div>
            </CardContent>

            <CardFooter className="bg-muted/10 p-8 flex flex-col sm:flex-row gap-4 border-t border-border/40">
                <Button 
                    type="submit" 
                    disabled={anySubmitting} 
                    className="w-full sm:w-auto min-w-[220px] h-14 text-sm font-bold uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isProfileUpdating || specificAuthLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save Changes
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full sm:w-auto h-14 rounded-full px-10 gap-2 border-border/60 hover:bg-muted font-bold text-xs uppercase tracking-widest" 
                    onClick={() => router.push(`/profile/${user.id}`)}
                    disabled={anySubmitting}
                >
                    <ExternalLink className="h-4 w-4" />
                    View Profile
                </Button>
            </CardFooter>
          </Card>
        </form>
    </div>
  );
}
