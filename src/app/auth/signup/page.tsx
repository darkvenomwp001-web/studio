
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
import { UserPlus } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"; 
import { FormEvent } from "react";

export default function SignUpPage() {
  const { signInWithGoogle, loading } = useAuth();

  // Email/Password form submission is disabled for now
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Email/password signup logic would go here if re-enabled
     alert("Email/password sign-up is currently disabled. Please use Google Sign-Up.");
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Join LitVerse!</CardTitle>
        <CardDescription>Create an account to start reading and writing.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" placeholder="YourCreativeName" required disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" placeholder="••••••••" required disabled />
          </div>
           <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input id="confirm-password" name="confirmPassword" type="password" placeholder="••••••••" required disabled />
          </div>
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6" disabled>
            <UserPlus className="mr-2 h-5 w-5" /> Sign Up
          </Button>
          <p className="text-xs text-center text-muted-foreground">Email/Password sign-up is temporarily disabled.</p>
           <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or sign up with
              </span>
            </div>
          </div>
          <Button variant="outline" className="w-full" type="button" onClick={signInWithGoogle} disabled={loading}> 
             {loading ? "Signing up..." : "Sign up with Google"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="text-center text-sm">
         <p className="text-muted-foreground w-full">
          Already have an account?{' '}
          <Link href="/auth/signin" className="font-semibold text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
