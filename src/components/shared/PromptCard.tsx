
import type { Prompt } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PenSquare, User } from 'lucide-react';
import Link from 'next/link';

interface PromptCardProps {
    prompt: Prompt;
}

export default function PromptCard({ prompt }: PromptCardProps) {
    return (
        <Card className="w-72 flex-shrink-0 group flex flex-col hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
                <CardTitle className="text-md font-headline group-hover:text-primary transition-colors">{prompt.title}</CardTitle>
                <CardDescription className="text-xs flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    By {prompt.author.displayName || prompt.author.username}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground line-clamp-3">{prompt.prompt}</p>
            </CardContent>
            <CardFooter>
                 <Button variant="outline" size="sm" className="w-full" onClick={() => alert("Coming soon: View submissions or start writing!")}>
                    <PenSquare className="mr-2 h-4 w-4" />
                    Start Writing
                </Button>
            </CardFooter>
        </Card>
    )
}
