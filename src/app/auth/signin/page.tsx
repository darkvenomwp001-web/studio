
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
import { LogIn, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth";
import { FormEvent, useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignInPage() {
  const { signInWithEmailPassword, signInWithGoogle, authLoading, loading: initialAuthLoading } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailOrUsername || !password) {
      toast({ title: "Input Required", description: "Please enter both email/username and password.", variant: "destructive" });
      return;
    }
    // The signInWithEmailPassword function in useAuth now handles if it's an email or username
    await signInWithEmailPassword({ emailOrUsername, passwordOne: password });
  };

  const handleGoogleSignIn = async () => {
    await signInWithGoogle();
  }

  const isAnyLoading = authLoading || initialAuthLoading;

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Welcome Back!</CardTitle>
        <CardDescription>Sign in to continue.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="emailOrUsername">Email or Username</Label>
            <Input 
              id="emailOrUsername" 
              type="text" // Changed from "email" to "text"
              placeholder="you@example.com or YourUsername" 
              required 
              value={emailOrUsername}
              onChange={(e) => setEmailOrUsername(e.target.value)}
              disabled={isAnyLoading} 
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className={`text-xs text-primary hover:underline ${isAnyLoading ? 'pointer-events-none text-muted-foreground' : ''}`}>
                Forgot password?
              </Link>
            </div>
            <Input 
              id="password" 
              type="password" 
              placeholder="••••••••" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isAnyLoading} 
            />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled={isAnyLoading}>
            {authLoading && !initialAuthLoading && !emailOrUsername && !password ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" /> Sign In</>}
          </Button>
          
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignIn} disabled={isAnyLoading}>
            {authLoading && !initialAuthLoading && (emailOrUsername || password) ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign in with Google"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
        <p className="text-muted-foreground w-full">
          New to LitVerse?{' '}
          <Link href="/auth/signup" className={`font-semibold text-primary hover:underline ${isAnyLoading ? 'pointer-events-none text-muted-foreground' : ''}`}>
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
