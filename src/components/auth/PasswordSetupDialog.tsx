'use client';

import { useState, FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function PasswordSetupDialog() {
  const { requiresPasswordSetup, setNewUserPassword, setRequiresPasswordSetup, authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const isAlphanumeric = (str: string) => /[a-zA-Z]/.test(str) && /[0-9]/.test(str);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (!isAlphanumeric(password)) {
        toast({ title: "Complexity Error", description: "Password must be alphanumeric (contain letters and numbers).", variant: "destructive"});
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
            Welcome! To allow signing in with your email and password in the future, please set an alphanumeric password (6+ chars).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <div className="relative">
                        <Input
                            id="new-password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="•••••••• (Letters & Numbers)"
                            required
                            disabled={authLoading}
                            className="pr-10"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                    <div className="relative">
                        <Input
                            id="confirm-new-password"
                            type={showConfirm ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            disabled={authLoading}
                            className="pr-10"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowConfirm(!showConfirm)}>
                            {showConfirm ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                    </div>
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
