
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, MailCheck, Send } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
    const { user, sendVerificationEmail, reloadUser, signOutFirebase, authLoading } = useAuth();
    const router = useRouter();
    const [isSending, startResendTransition] = useTransition();
    const [isChecking, startCheckTransition] = useTransition();

    // If a verified user lands here, redirect them away.
    useEffect(() => {
        if (user?.emailVerified) {
            router.push('/');
        }
    }, [user, router]);

    const handleResendEmail = () => {
        startResendTransition(async () => {
            await sendVerificationEmail();
        });
    };

    const handleCheckVerification = () => {
        startCheckTransition(async () => {
            await reloadUser();
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
            <Card className="w-full max-w-md shadow-2xl bg-card/80 backdrop-blur-sm border-border/20">
                <CardHeader className="text-center">
                    <MailCheck className="mx-auto h-12 w-12 text-primary mb-4" />
                    <CardTitle className="text-2xl font-headline">Verify Your Email</CardTitle>
                    <CardDescription>
                        A verification link has been sent to <span className="font-semibold text-primary">{user?.email}</span>. Please check your inbox (and spam folder) to continue.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleCheckVerification} className="w-full h-12 rounded-xl text-lg font-bold" disabled={isChecking || authLoading}>
                        {isChecking ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                        I've Verified My Email
                    </Button>
                    <Button onClick={handleResendEmail} variant="secondary" className="w-full h-12 rounded-xl font-bold" disabled={isSending || authLoading}>
                        {isSending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                        Resend Verification Email
                    </Button>
                </CardContent>
                <CardFooter className="flex-col gap-4 text-sm pt-4 border-t border-border/10">
                    <p className="text-muted-foreground text-center">
                        Wrong email?{' '}
                        <button onClick={signOutFirebase} className="font-semibold text-primary hover:underline">
                            Sign out
                        </button> to use a different account.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
