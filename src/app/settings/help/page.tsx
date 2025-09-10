
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Mail } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HelpAndSupportPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <Info className="h-8 w-8" /> Help & Support
        </h1>
        <p className="text-muted-foreground">Find answers to common questions and get in touch with us.</p>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Frequently Asked Questions (FAQ)</CardTitle>
        </CardHeader>
        <CardContent>
            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>How do I change my username?</AccordionTrigger>
                    <AccordionContent>
                    You can change your username by navigating to Settings -> Edit Profile. Please note that usernames must be unique.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                    <AccordionTrigger>Can I delete my story permanently?</AccordionTrigger>
                    <AccordionContent>
                    Yes, you can. Navigate to the story's settings page from the writing dashboard. In the "Danger Zone" section, you will find the option to permanently delete your story. This action is irreversible.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                    <AccordionTrigger>What is the difference between Public, Unlisted, and Private stories?</AccordionTrigger>
                    <AccordionContent>
                    <strong>Public:</strong> Your story is visible to everyone and will appear in search results.
                    <br />
                    <strong>Unlisted:</strong> Your story will not appear in search results, but anyone with a direct link can view it.
                    <br />
                    <strong>Private:</strong> Your story is only visible to you and any collaborators you have added. This is the default for new drafts.
                    </AccordionContent>
                </AccordionItem>
                 <AccordionItem value="item-4">
                    <AccordionTrigger>How does the AI Assistant work?</AccordionTrigger>
                    <AccordionContent>
                    The AI Assistant uses advanced language models to help you improve your writing. You can paste your text to get suggestions on grammar, style, and flow. It can also check for potential plagiarism. All AI analysis is done securely.
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle>Contact Us</CardTitle>
            <CardDescription>Still need help? Send us an email and we'll get back to you as soon as possible.</CardDescription>
        </CardHeader>
        <CardContent>
            <a href="mailto:support@litverse.app">
                <Button>
                    <Mail className="mr-2 h-4 w-4" /> Email Support
                </Button>
            </a>
        </CardContent>
      </Card>

    </div>
  );
}
