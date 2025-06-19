
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
import { Loader2, UserCog, Image as ImageIcon, KeyRound, Mail, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, loading: authLoading, updateUserProfile, updateUserEmail_mock, updateUserPassword_mock } = useAuth();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [role, setRole] = useState<'reader' | 'writer' | undefined>(undefined);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [passwordForEmailChange, setPasswordForEmailChange] = useState('');

  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [isAccountUpdating, setIsAccountUpdating] = useState(false);


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

    // In a real app, if avatarFile exists, upload it to Firebase Storage first
    // then get the downloadURL to save in user.avatarUrl
    let newAvatarUrl = user.avatarUrl;
    if (avatarFile) {
      // Mocking upload: In real app, this would be an async upload call
      // For now, we'll just use the preview URL if it's a data URI or a new placeholder.
      // This is a simplification. Real upload is more complex.
      newAvatarUrl = avatarPreview || user.avatarUrl; // Using the preview for mock
       toast({title: "Avatar Updated (Mock)", description: "In a real app, this would upload to storage."});
    }
    
    await updateUserProfile({ 
        displayName, 
        // username: username, // Firebase Auth doesn't have a separate 'username'. Usually displayName is used.
                               // If you need a distinct username, store it in Firestore/RTDB.
                               // For this example, we assume 'username' from our AppUser model is distinct if needed,
                               // but not directly updatable on Firebase Auth user object itself via updateProfile.
                               // We'll update it in our local user object.
        username, // this will update the local context if your AppUser type has it
        avatarUrl: newAvatarUrl, 
        bio, 
        role 
    });
    setIsProfileUpdating(false);
  };

  const handleEmailUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) {
        toast({title: "Input Missing", description: "New email cannot be empty.", variant: "destructive"});
        return;
    }
    // Password for email change is often required for re-authentication
    if (!passwordForEmailChange.trim()) {
        toast({title: "Password Required", description: "Please enter your current password to change email.", variant: "destructive"});
        return;
    }
    setIsAccountUpdating(true);
    // Mock function for now
    await updateUserEmail_mock(newEmail);
    // In real app, re-authentication with passwordForEmailChange might be needed here first.
    // Then call actual updateFirebaseEmail(auth.currentUser, newEmail)
    setIsAccountUpdating(false);
    setPasswordForEmailChange('');
  };

  const handlePasswordUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmNewPassword) {
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
    setIsAccountUpdating(true);
    // Mock function for now
    await updateUserPassword_mock(newPassword);
    // In real app, re-authentication with currentPassword might be needed here first.
    // Then call actual updateFirebasePassword(auth.currentUser, newPassword)
    setIsAccountUpdating(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  if (authLoading && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center py-10">Please log in to access settings.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="text-center">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center justify-center gap-3">
          <UserCog className="h-10 w-10" /> Account Settings
        </h1>
        <p className="text-muted-foreground">Manage your profile, account details, and preferences.</p>
      </header>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg shadow-sm">
          <TabsTrigger value="profile" className="font-headline data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            Profile
          </TabsTrigger>
          <TabsTrigger value="account" className="font-headline data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md">
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card className="shadow-lg">
            <form onSubmit={handleProfileSubmit}>
              <CardHeader>
                <CardTitle>Edit Your Profile</CardTitle>
                <CardDescription>Update your public profile information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-32 w-32 border-2 border-primary/30">
                      <AvatarImage src={avatarPreview || `https://placehold.co/128x128.png`} alt={displayName} data-ai-hint="profile person" />
                      <AvatarFallback className="text-3xl">{displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Input id="avatarUpload" type="file" accept="image/*" onChange={handleAvatarChange} className="text-sm file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-xs file:bg-muted file:text-muted-foreground hover:file:bg-primary/10" />
                    <Label htmlFor="avatarUpload" className="text-xs text-muted-foreground">JPG, PNG, GIF. Max 2MB.</Label>
                  </div>
                  <div className="space-y-4 flex-1 w-full">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your full name" />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your unique username" />
                      <p className="text-xs text-muted-foreground mt-1">Your D4RKV3NOM URL: D4RKV3NOM.com/user/{username || 'yourusername'}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us a little about yourself..." rows={4} />
                </div>
                 <div>
                  <Label htmlFor="role">I am a...</Label>
                  <Select value={role} onValueChange={(value: 'reader' | 'writer') => setRole(value)}>
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
                <Button type="submit" disabled={isProfileUpdating} className="bg-primary hover:bg-primary/90">
                  {isProfileUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
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
                  <CardDescription>Change the email address associated with your account. This will require re-authentication in a real application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentEmail">Current Email</Label>
                    <Input id="currentEmail" type="email" value={user.email || ''} disabled readOnly />
                  </div>
                  <div>
                    <Label htmlFor="newEmail">New Email Address</Label>
                    <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="your.new.email@example.com" />
                  </div>
                   <div>
                    <Label htmlFor="passwordForEmail">Current Password (for verification)</Label>
                    <Input id="passwordForEmail" type="password" value={passwordForEmailChange} onChange={(e) => setPasswordForEmailChange(e.target.value)} placeholder="Enter current password" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="outline" disabled={isAccountUpdating}>
                    {isAccountUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Update Email (Mock)
                  </Button>
                </CardFooter>
              </form>
            </Card>

            <Card className="shadow-lg">
              <form onSubmit={handlePasswordUpdate}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-accent" /> Change Password</CardTitle>
                  <CardDescription>Update your account password. This will require re-authentication in a real application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min. 6 characters)" />
                  </div>
                  <div>
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="outline" disabled={isAccountUpdating}>
                    {isAccountUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Change Password (Mock)
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
