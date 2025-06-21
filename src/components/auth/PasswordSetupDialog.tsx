
'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function PasswordSetupDialog() {
  const { requiresPasswordSetup, setNewUserPassword, setRequiresPasswordSetup, authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords Mismatch", description: "The passwords do not match.", variant: "destructive" });
      return;
    }
    await setNewUserPassword(password);
  };

  return (
    <Dialog open={requiresPasswordSetup} onOpenChange={setRequiresPasswordSetup}>
      <DialogContent 
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing on click outside
        onEscapeKeyDown={(e) => e.preventDefault()} // Prevent closing with Esc key
        className="sm:max-w-[425px]"
      >
        <DialogHeader>
          <DialogTitle>Set Your Password</DialogTitle>
          <DialogDescription>
            Welcome! To allow signing in with your email and password in the future, please set a password for your account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                        id="new-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="•••••••• (min. 6 characters)"
                        required
                        disabled={authLoading}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <Input
                        id="confirm-new-password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={authLoading}
                    />
                </div>
            </div>
            <DialogFooter>
            <Button type="submit" disabled={authLoading || !password || !confirmPassword}>
                {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Set Password & Continue
            </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
