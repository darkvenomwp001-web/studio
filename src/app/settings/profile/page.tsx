'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, UploadCloud, ArrowLeft, UserCog, Music, User, AtSign, AlignLeft, Info, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

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
  const [profileSongUrl, setProfileSongUrl] = useState('');
  const [profileSongNote, setProfileSongNote] = useState('');
  
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setRole(user.role || 'reader');
      setAvatarPreview(user.avatarUrl || null);
      setProfileSongUrl(user.profileSongUrl || '');
      setProfileSongNote(user.profileSongNote || '');
    }
  }, [user]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "Image too large", description: "Please select an image smaller than 2MB.", variant: "destructive" });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsProfileUpdating(true);

    let newAvatarUrl = user.avatarUrl;
    if (avatarFile) {
        setIsUploading(true);
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            toast({
                title: 'Configuration Error',
                description: 'Cloudinary configuration is missing. Avatar cannot be updated.',
                variant: 'destructive',
            });
            setIsUploading(false);
            setIsProfileUpdating(false);
            return;
        }

        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('upload_preset', uploadPreset);

        try {
            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (data.secure_url) {
                newAvatarUrl = data.secure_url;
            } else {
                throw new Error(data.error?.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Avatar upload error:', error);
            toast({
                title: 'Upload Failed',
                description: 'Could not upload your new avatar. Please try again.',
                variant: 'destructive',
            });
            setIsProfileUpdating(false);
            setIsUploading(false);
            return;
        } finally {
            setIsUploading(false);
        }
    }
    
    await updateUserProfile({ 
        displayName, 
        username, 
        avatarUrl: newAvatarUrl, 
        bio, 
        role,
        profileSongUrl,
        profileSongNote 
    });
    setAvatarFile(null);
    setIsProfileUpdating(false);
  };

  if (authLoadingGlobal && !user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading your profile...</p>
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
    <div className="max-w-3xl mx-auto space-y-8 py-8 px-4">
        <header className="flex flex-col space-y-2">
            <Button variant="ghost" onClick={() => router.push('/settings')} className="w-fit -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Button>
            <h1 className="text-3xl font-headline font-bold text-foreground">Edit Profile</h1>
            <p className="text-muted-foreground">Customize how you appear to the community.</p>
        </header>

        <form onSubmit={handleProfileSubmit} className="space-y-8">
          <Card className="shadow-xl border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-8 border-b">
                <div className="flex flex-col items-center sm:flex-row sm:items-end gap-6">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-2xl transition-transform group-hover:scale-105 duration-300">
                      <AvatarImage src={avatarPreview || `https://placehold.co/160x160.png?text=${displayName.charAt(0)}`} alt={displayName} data-ai-hint="profile person" />
                      <AvatarFallback className="text-4xl bg-primary/10 text-primary">{displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <button 
                        type="button"
                        onClick={() => document.getElementById('avatarUpload')?.click()}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        disabled={anySubmitting}
                    >
                        <UploadCloud className="text-white h-8 w-8" />
                    </button>
                    <Input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={anySubmitting} />
                  </div>
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <h2 className="text-2xl font-bold font-headline">{displayName || 'Your Name'}</h2>
                    <p className="text-muted-foreground font-mono text-sm">@{username || 'username'}</p>
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => document.getElementById('avatarUpload')?.click()} 
                        disabled={anySubmitting}
                        className="mt-2"
                    >
                         {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                         {isUploading ? 'Uploading...' : 'Change Avatar'}
                    </Button>
                  </div>
                </div>
            </CardHeader>

            <CardContent className="p-6 space-y-8">
                {/* Identity Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <User className="h-5 w-5" />
                        <h3 className="text-lg font-headline">Identity</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="displayName" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Display Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" className="pl-10 h-11" disabled={anySubmitting} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Username</Label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Unique handle" className="pl-10 h-11" disabled={anySubmitting} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 px-1">Unique URL: D4RKV3NOM.app/profile/{username || '...'}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label htmlFor="bio" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">About You</Label>
                            <span className={cn("text-[10px] font-mono", bio.length > 300 ? "text-destructive" : "text-muted-foreground")}>{bio.length}/300</span>
                        </div>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the community your story..." rows={4} className="pl-10 pt-2.5 resize-none" disabled={anySubmitting} maxLength={300} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Primary Role</Label>
                        <Select value={role} onValueChange={(value: 'reader' | 'writer') => setRole(value)} disabled={anySubmitting}>
                            <SelectTrigger id="role" className="h-11">
                                <SelectValue placeholder="Are you a reader or a writer?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="reader" className="flex items-center gap-2">Reader</SelectItem>
                                <SelectItem value="writer" className="flex items-center gap-2">Writer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator />

                {/* Vibe Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Music className="h-5 w-5" />
                        <h3 className="text-lg font-headline">The Vibe</h3>
                    </div>
                    <Card className="bg-muted/20 border-dashed border-2">
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="profileSongUrl" className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1.5">
                                    Spotify Track URL
                                    <Popover>
                                        <PopoverTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground" /></PopoverTrigger>
                                        <PopoverContent className="text-xs w-64 p-3 space-y-2">
                                            <p className="font-bold">How to find this:</p>
                                            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                                                <li>Open Spotify</li>
                                                <li>Go to a Song &rarr; Share</li>
                                                <li>Select "Copy Song Link"</li>
                                            </ol>
                                        </PopoverContent>
                                    </Popover>
                                </Label>
                                <Input id="profileSongUrl" value={profileSongUrl} onChange={(e) => setProfileSongUrl(e.target.value)} placeholder="https://open.spotify.com/track/..." className="h-11" disabled={anySubmitting} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="profileSongNote" className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Song Dedication / Note</Label>
                                <Input id="profileSongNote" value={profileSongNote} onChange={(e) => setProfileSongNote(e.target.value)} placeholder="e.g., Currently writing to this loop..." className="h-11" disabled={anySubmitting} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>

            <CardFooter className="bg-muted/10 p-6 flex flex-col sm:flex-row gap-4 border-t">
                <Button 
                    type="submit" 
                    disabled={anySubmitting} 
                    className="w-full sm:w-auto min-w-[200px] h-12 text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isProfileUpdating || specificAuthLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Save All Changes
                </Button>
                <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full sm:w-auto h-12" 
                    onClick={() => router.push(`/profile/${user.id}`)}
                    disabled={anySubmitting}
                >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Live Profile
                </Button>
            </CardFooter>
          </Card>
        </form>
    </div>
  );
}
