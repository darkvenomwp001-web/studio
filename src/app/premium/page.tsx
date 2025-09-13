
'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, XCircle, Unlock, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const premiumFeatures = [
    {
        icon: <Unlock className="h-6 w-6 text-primary" />,
        title: 'Unlock Exclusive Chapters',
        description: 'Get early access to chapters and bonus content released by authors specifically for premium members.',
    },
    {
        icon: <XCircle className="h-6 w-6 text-primary" />,
        title: 'Ad-Free Reading',
        description: 'Enjoy an uninterrupted reading experience across the entire platform with no ads.',
    },
    {
        icon: <Sparkles className="h-6 w-6 text-primary" />,
        title: 'Enhanced AI Assistant',
        description: 'Access more powerful features in the AI Writing Assistant, including deeper analysis and more suggestions.',
    },
];

export default function PremiumPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    // A real implementation would check for a premium subscription status on the user object
    const isPremiumUser = false; // Mock value

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-12 px-4 text-center">
            <header className="space-y-4">
                <div className="inline-block p-4 bg-primary/10 rounded-full">
                    <Crown className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl md:text-5xl font-headline font-bold text-primary">D4RKV3NOM Premium</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    {isPremiumUser
                        ? "Welcome back, valued member. Explore your exclusive benefits."
                        : "Elevate your reading and writing experience. Unlock exclusive features and support authors."
                    }
                </p>
            </header>

            {isPremiumUser ? (
                <Card className="text-left">
                    <CardHeader>
                        <CardTitle>Your Premium Benefits</CardTitle>
                        <CardDescription>You have access to all exclusive features.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <p>Thank you for supporting the community!</p>
                        {/* You could list currently active benefits or link to exclusive content here */}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid md:grid-cols-3 gap-6 text-left">
                    {premiumFeatures.map((feature, index) => (
                        <Card key={index} className="flex flex-col">
                            <CardHeader className="flex-shrink-0">
                                {feature.icon}
                                <CardTitle className="mt-4">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            
            {!isPremiumUser && (
                <div className="pt-6">
                    <Button size="lg" className="text-lg py-7 px-10" onClick={() => user ? alert("Subscription flow coming soon!") : router.push('/auth/signup')}>
                        {user ? 'Upgrade to Premium' : 'Sign Up to Go Premium'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">(In-app purchases are coming soon)</p>
                </div>
            )}

            {user && (
                 <p className="text-sm text-muted-foreground pt-4">
                    <Link href="/settings/account" className="underline hover:text-primary">Manage Subscription</Link>
                </p>
            )}

        </div>
    );
}
