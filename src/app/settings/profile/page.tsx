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
import { Loader2, Save, UploadCloud, ArrowLeft, UserCog } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
  
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setRole(user.role || 'reader');
      setAvatarPreview(user.avatarUrl || null);
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
                description: 'Cloudinary environment variables are not set. Cannot upload avatar.',
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
                toast({ title: 'Avatar Uploaded', description: 'Your new avatar has been uploaded to Cloudinary.' });
            } else {
                throw new Error(data.error?.message || 'Unknown Cloudinary error');
            }
        } catch (error) {
            console.error('Error uploading avatar to Cloudinary:', error);
            toast({
                title: 'Avatar Upload Failed',
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
    
    await updateUserProfile({ displayName, username, avatarUrl: newAvatarUrl, bio, role });
    setAvatarFile(null);
    setIsProfileUpdating(false);
  };

  if (authLoadingGlobal && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
    <div className="max-w-2xl mx-auto space-y-8 py-8">
        <header>
            <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Button>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <UserCog className="h-8 w-8" /> Edit Profile
            </h1>
            <p className="text-muted-foreground">Update your public profile information.</p>
        </header>

          <Card className="shadow-lg">
            <form onSubmit={handleProfileSubmit}>
              <CardHeader>
                <CardTitle>Your Public Information</CardTitle>
                <CardDescription>This information is visible to other users on the platform.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-32 w-32 border-2 border-primary/30">
                      <AvatarImage src={avatarPreview || `https://placehold.co/128x128.png`} alt={displayName} data-ai-hint="profile person" />
                      <AvatarFallback className="text-3xl">{displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="relative">
                      <Button type="button" onClick={() => document.getElementById('avatarUpload')?.click()} disabled={anySubmitting}>
                         {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                         {isUploading ? 'Uploading...' : 'Change Avatar'}
                      </Button>
                      <Input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" disabled={anySubmitting} />
                    </div>
                    <Label htmlFor="avatarUpload" className="text-xs text-muted-foreground">JPG, PNG, GIF. Max 2MB.</Label>
                  </div>
                  <div className="space-y-4 flex-1 w-full">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" disabled={anySubmitting} />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your unique username" disabled={anySubmitting} />
                      <p className="text-xs text-muted-foreground mt-1">Your D4RKV3NOM URL: D4RKV3NOM.app/user/{username || 'yourusername'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." rows={4} disabled={anySubmitting} />
                </div>
                 <div>
                  <Label htmlFor="role">I am a...</Label>
                  <Select value={role} onValueChange={(value: 'reader' | 'writer') => setRole(value)} disabled={anySubmitting}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select your primary role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reader">Reader</SelectItem>
                      <SelectItem value="writer">Writer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={anySubmitting} className="bg-primary hover:bg-primary/90">
                  {isProfileUpdating || specificAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Profile Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
    </div>
  );
}
