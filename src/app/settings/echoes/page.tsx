
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Star, TrendingUp, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function EchoesPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <Sparkles className="h-8 w-8" /> Echoes
        </h1>
        <p className="text-muted-foreground">Rediscover your journey and impact on the community. (Feature Coming Soon!)</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="opacity-60">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Your Most Voted Chapter
                </CardTitle>
                <CardDescription>A look back at the chapter that resonated most with readers.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground p-8 bg-muted/50 rounded-md text-center">Analytics coming soon</p>
            </CardContent>
        </Card>
        <Card className="opacity-60">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Follower Milestones
                </CardTitle>
                <CardDescription>Celebrate the moments your community grew.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground p-8 bg-muted/50 rounded-md text-center">Analytics coming soon</p>
            </CardContent>
        </Card>
         <Card className="opacity-60 md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    A Look Back at Your Comments
                </CardTitle>
                <CardDescription>Rediscover the conversations and moments you were a part of.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground p-8 bg-muted/50 rounded-md text-center">Feature coming soon</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
