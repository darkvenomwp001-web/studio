'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Save, KeyRound, Mail, ArrowLeft, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AccountSettingsPage() {
  const { user, loading: authLoadingGlobal, authLoading: specificAuthLoading, updateUserEmailFirebase, updateUserPasswordFirebase } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email || '');
  
  const [currentPasswordForPwChange, setCurrentPasswordForPwChange] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Visibility toggles
  const [showPw1, setShowPw1] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [showPw3, setShowPw3] = useState(false);
  const [showPw4, setShowPw4] = useState(false);

  const [isEmailUpdating, setIsEmailUpdating] = useState(false);
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  
  const isAlphanumeric = (str: string) => /[a-zA-Z]/.test(str) && /[0-9]/.test(str);

  const handleEmailUpdate = async (e: React.FormEvent) => {
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
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
    if (!isAlphanumeric(newPassword)) {
        toast({ title: "Complexity Error", description: "New password must be alphanumeric (letters & numbers).", variant: "destructive"});
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
  
  const anySubmitting = isEmailUpdating || isPasswordUpdating || specificAuthLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8">
        <header>
            <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
            </Button>
            <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
                <ShieldAlert className="h-8 w-8" /> Account Details
            </h1>
            <p className="text-muted-foreground">Manage your private account credentials.</p>
        </header>

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
                  <div className="space-y-2">
                    <Label htmlFor="currentPasswordForEmail">Current Password (for verification)</Label>
                    <div className="relative">
                        <Input id="currentPasswordForEmail" type={showPw1 ? "text" : "password"} value={currentPasswordForEmail} onChange={(e) => setCurrentPasswordForEmail(e.target.value)} placeholder="Enter current password" disabled={anySubmitting} className="pr-10" />
                        <Button
                            type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPw1(!showPw1)}
                        >
                            {showPw1 ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="outline" disabled={anySubmitting}>
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
                  <CardDescription>Update your account password. Must be 6+ chars and alphanumeric.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPasswordForPwChange">Current Password</Label>
                    <div className="relative">
                        <Input id="currentPasswordForPwChange" type={showPw2 ? "text" : "password"} value={currentPasswordForPwChange} onChange={(e) => setCurrentPasswordForPwChange(e.target.value)} placeholder="••••••••" disabled={anySubmitting} className="pr-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPw2(!showPw2)}>
                            {showPw2 ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <Input id="newPassword" type={showPw3 ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min. 6 characters)" disabled={anySubmitting} className="pr-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPw3(!showPw3)}>
                            {showPw3 ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                    <div className="relative">
                        <Input id="confirmNewPassword" type={showPw4 ? "text" : "password"} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Confirm new password" disabled={anySubmitting} className="pr-10" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPw4(!showPw4)}>
                            {showPw4 ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" variant="outline" disabled={anySubmitting}>
                    {isPasswordUpdating || specificAuthLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Change Password
                  </Button>
                </CardFooter>
              </form>
            </Card>
        </div>
    </div>
  );
}
