
'use client';

import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ArrowLeft, BarChart, Quote, Users, Sparkles } from 'lucide-react';

export default function ChapterEchoesPage() {
    const router = useRouter();
    const params = useParams();

    const storyId = params.storyId as string;
    const chapterId = params.chapterId as string;

    return (
        <div className="container mx-auto max-w-4xl py-8 space-y-8">
            <header>
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4"/>
                    Back to Chapter
                </Button>
                <div className="text-center">
                    <h1 className="text-4xl font-headline font-bold text-primary flex items-center justify-center gap-3">
                        <Sparkles className="h-10 w-10" />
                        Chapter Echoes
                    </h1>
                    <p className="text-muted-foreground mt-2">See how this chapter resonated with the community. (Coming Soon!)</p>
                </div>
            </header>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="opacity-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Quote className="h-5 w-5 text-accent" />
                            Popular Quotes
                        </CardTitle>
                        <CardDescription>See which lines were highlighted the most by readers.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">Feature coming soon</p>
                    </CardContent>
                </Card>
                <Card className="opacity-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart className="h-5 w-5 text-accent" />
                            Mood Analysis
                        </CardTitle>
                        <CardDescription>Visualize the emotional journey of this chapter.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">Feature coming soon</p>
                    </CardContent>
                </Card>
                <Card className="opacity-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-accent" />
                            Character Mentions
                        </CardTitle>
                        <CardDescription>Track which characters were discussed the most.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md text-center">Feature coming soon</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
