'use client'

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth";
import { FormEvent, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignUpPage() {
  const { signUpWithEmailPassword, authLoading, loading: initialAuthLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [passwordOne, setPasswordOne] = useState('');
  const [passwordTwo, setPasswordTwo] = useState('');
  const [showPasswordOne, setShowPasswordOne] = useState(false);
  const [showPasswordTwo, setShowPasswordTwo] = useState(false);
  const { toast } = useToast();

  const isAlphanumeric = (str: string) => {
    // Requires at least one letter and one number
    return /[a-zA-Z]/.test(str) && /[0-9]/.test(str);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !email || !passwordOne || !passwordTwo) {
      toast({ title: "Input Required", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    if (passwordOne !== passwordTwo) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (passwordOne.length < 6) {
        toast({ title: "Weak Password", description: "Password should be at least 6 characters long.", variant: "destructive" });
        return;
    }
    if (!isAlphanumeric(passwordOne)) {
        toast({ 
            title: "Data Integrity Violation", 
            description: "For security, passwords must be alphanumeric (contain both letters and numbers).", 
            variant: "destructive" 
        });
        return;
    }
    await signUpWithEmailPassword({ username, email, passwordOne });
  };

  const isAnyLoading = authLoading || initialAuthLoading;

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Join D4RKV3NOM!</CardTitle>
        <CardDescription>Create an account to start your adventure.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input 
              id="username" 
              name="username" 
              placeholder="YourCreativeName" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isAnyLoading} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="you@example.com" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isAnyLoading} 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input 
                id="password" 
                name="password" 
                type={showPasswordOne ? "text" : "password"}
                placeholder="•••••••• (min. 6 characters)" 
                required 
                value={passwordOne}
                onChange={(e) => setPasswordOne(e.target.value)}
                disabled={isAnyLoading} 
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswordOne(!showPasswordOne)}
                disabled={isAnyLoading}
              >
                {showPasswordOne ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">Requirements: 6+ chars, alphanumeric.</p>
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input 
                id="confirm-password" 
                name="confirmPassword" 
                type={showPasswordTwo ? "text" : "password"}
                placeholder="••••••••" 
                required 
                value={passwordTwo}
                onChange={(e) => setPasswordTwo(e.target.value)}
                disabled={isAnyLoading} 
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswordTwo(!showPasswordTwo)}
                disabled={isAnyLoading}
              >
                {showPasswordTwo ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled={isAnyLoading}>
            {authLoading && !initialAuthLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><UserPlus className="mr-2 h-5 w-5" /> Sign Up with Email</>}
          </Button>
          
           <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" type="button" onClick={() => window.location.href='/auth/signin'} disabled={isAnyLoading}> 
             Go to Sign In
          </Button>
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
         <p className="text-muted-foreground w-full">
          By signing up, you agree to our Terms and Privacy Policy.
        </p>
      </CardFooter>
    </Card>
  )
}
