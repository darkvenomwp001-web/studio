
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
import { LogIn } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const { signInWithGoogle, loading: googleLoading } = useAuth();
  const [emailPasswordLoading, setEmailPasswordLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailPasswordLoading(true);
    // Firebase email/password sign-in logic would go here.
    // For now, we'll keep the alert.
    alert("Email/password sign-in is not yet implemented with Firebase. Please use Google Sign-In.");
    setEmailPasswordLoading(false);
  };

  const isAnyLoading = googleLoading || emailPasswordLoading;

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Welcome Back!</CardTitle>
        <CardDescription>Sign in to continue your LitVerse journey.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" required disabled={isAnyLoading} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="#" className={`text-xs text-primary hover:underline ${isAnyLoading ? 'pointer-events-none text-muted-foreground' : ''}`}>
                Forgot password?
              </Link>
            </div>
            <Input id="password" type="password" placeholder="••••••••" required disabled={isAnyLoading} />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled={isAnyLoading}>
            {emailPasswordLoading ? "Processing..." : <><LogIn className="mr-2 h-5 w-5" /> Sign In</>}
          </Button>
          <p className="text-xs text-center text-muted-foreground">Email/Password sign-in is not yet fully implemented.</p>
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
          <Button variant="outline" className="w-full" type="button" onClick={signInWithGoogle} disabled={isAnyLoading}>
            {googleLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
        <p className="text-muted-foreground w-full">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className={`font-semibold text-primary hover:underline ${isAnyLoading ? 'pointer-events-none text-muted-foreground' : ''}`}>
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
