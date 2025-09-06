
'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserCog, Save, KeyRound, Mail, UploadCloud, Info, FileText, ShieldCheck, HelpCircle, Archive, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { user, loading: authLoadingGlobal, authLoading: specificAuthLoading, updateUserProfile, updateUserEmailFirebase, updateUserPasswordFirebase } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<'reader' | 'writer' | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  
  const [currentPasswordForPwChange, setCurrentPasswordForPwChange] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isEmailUpdating, setIsEmailUpdating] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.username || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
      setRole(user.role || 'reader');
      setAvatarPreview(user.avatarUrl || null);
      setNewEmail(user.email || ''); 
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

  const handleEmailUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) {
        toast({title: "Input Missing", description: "New email cannot be empty.", variant: "destructive"});
        return;
    }
    if (!currentPasswordForEmail.trim()) {
        toast({title: "Password Required", description: "Please enter your current password to change email.", variant: "destructive"});
        return;
    }
    setIsEmailUpdating(true);
    const success = await updateUserEmailFirebase(newEmail, currentPasswordForEmail);
    if (success) {
      setCurrentPasswordForEmail(''); 
    }
    setIsEmailUpdating(false);
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPasswordForPwChange || !newPassword || !confirmNewPassword) {
        toast({title: "Input Missing", description: "All password fields are required.", variant: "destructive"});
        return;
    }
    if (newPassword !== confirmNewPassword) {
        toast({title: "Password Mismatch", description: "New passwords do not match.", variant: "destructive"});
        return;
    }
    if (newPassword.length < 6) {
        toast({title: "Weak Password", description: "New password must be at least 6 characters.", variant: "destructive"});
        return;
    }
    setIsPasswordUpdating(true);
    const success = await updateUserPasswordFirebase(currentPasswordForPwChange, newPassword);
    if (success) {
      setCurrentPasswordForPwChange('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
    setIsPasswordUpdating(false);
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

  const anySubmitting = isProfileUpdating || isEmailUpdating || isPasswordUpdating || specificAuthLoading || isUploading;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center justify-center gap-3">
          <UserCog className="h-10 w-10" /> Account Settings
        </h1>
        <p className="text-muted-foreground">Manage your profile, account details, and preferences.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-muted/50 p-1 rounded-lg shadow-sm">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="archive">Archive</TabsTrigger>
          <TabsTrigger value="trash">Trash</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-lg">
            <form onSubmit={handleProfileSubmit}>
              <CardHeader>
                <CardTitle>Edit Your Profile</CardTitle>
                <CardDescription>Update your public profile information. Changes are saved to your account.</CardDescription>
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
                      <p className="text-xs text-muted-foreground mt-1">Your D4RKV3NOM URL: d4rkv3nom.app/user/{username || 'yourusername'}</p>
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
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <div className="space-y-6">
            <Card className="shadow-lg">
              <form onSubmit={handleEmailUpdate}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-accent" /> Update Email</CardTitle>
                  <CardDescription>Change the email address associated with your account. This requires your current password for verification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentEmailDisabled">Current Email</Label>
                    <Input id="currentEmailDisabled" type="email" value={user.email || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="newEmail">New Email Address</Label>
                    <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="your.new.email@example.com" disabled={anySubmitting}/>
                  </div>
                  <div>
                    <Label htmlFor="currentPasswordForEmail">Current Password (for verification)</Label>
                    <Input id="currentPasswordForEmail" type="password" value={currentPasswordForEmail} onChange={(e) => setCurrentPasswordForEmail(e.target.value)} placeholder="Enter current password" disabled={anySubmitting} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="outline" disabled={anySubmitting || isEmailUpdating}>
                    {isEmailUpdating || specificAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Update Email
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="shadow-lg">
              <form onSubmit={handlePasswordUpdate}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-accent" /> Change Password</CardTitle>
                  <CardDescription>Update your account password. This requires your current password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPasswordForPwChange">Current Password</Label>
                    <Input id="currentPasswordForPwChange" type="password" value={currentPasswordForPwChange} onChange={(e) => setCurrentPasswordForPwChange(e.target.value)} placeholder="••••••••" disabled={anySubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min. 6 characters)" disabled={anySubmitting} />
                  </div>
                  <div>
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" disabled={anySubmitting} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="outline" disabled={anySubmitting || isPasswordUpdating}>
                    {isPasswordUpdating || specificAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Change Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-accent" /> Archived Content
              </CardTitle>
              <CardDescription>
                View your archived content here. You can choose to restore it or delete it permanently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/archive">
                <Button variant="outline">View Your Archive</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="trash" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" /> Trash
              </CardTitle>
              <CardDescription>
                View items you have moved to the trash. Items will be permanently deleted after 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/settings/trash">
                <Button variant="outline">View Your Trash</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle>About D4RKV3NOM</CardTitle>
                    <CardDescription>Information, policies, and help resources for the D4RKV3NOM platform.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>
                                <div className="flex items-center gap-2"><Info className="h-4 w-4 text-accent" /> About D4RKV3NOM</div>
                            </AccordionTrigger>
                            <AccordionContent className="prose prose-sm dark:prose-invert">
                                D4RKV3NOM is a next-generation platform for readers and writers to connect, create, and share captivating stories. Our mission is to empower storytellers and build a vibrant community around the magic of words.
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>
                                 <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-accent" /> Terms of Service</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground">Please review our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link> to understand the rules and guidelines for using D4RKV3NOM.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-3">
                            <AccordionTrigger>
                                 <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Privacy Policy</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground">Your privacy is important to us. Learn how we collect, use, and protect your data in our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</p>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-4">
                            <AccordionTrigger>
                                 <div className="flex items-center gap-2"><HelpCircle className="h-4 w-4 text-accent" /> Help & Support</div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <p className="text-sm text-muted-foreground">Have questions or need help? Visit our Help Center or <Link href="/contact" className="text-primary hover:underline">contact our support team</Link>.</p>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
