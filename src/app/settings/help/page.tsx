'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Info, Mail, MessageCircle, Zap, Shield, Book } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HelpAndSupportPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
            <Info className="h-10 w-10 text-primary" /> Help & Support
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Last updated: May 15, 2026</p>
      </header>
      
      <div className="grid gap-8">
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                <CardTitle className="text-xl">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">How do I fix loading issues?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            If the app feels slow or stuck, go to **Settings > Data & Cache** and click "Hard Reset." This will refresh your app data and fix most issues.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">How do I get my story featured on the home page?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            The home page carousel is managed by the owner to show the most active and high-quality stories. Keep writing and engaging with your readers to increase your chances!
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">Who can see my photos?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            Only mutual followers (people you follow who follow you back) can see your photo posts. This keeps your personal moments shared only with friends.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">Is my writing private?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            Yes. You can set any story or chapter to "Private" so only you can see it. You can also use "Unlisted" to share it only with people who have the link.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
        
        <div className="grid sm:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-border/40 shadow-lg bg-card/40">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" /> Fast Fix</CardTitle>
                    <CardDescription>Resolve technical issues instantly.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full rounded-2xl h-12 bg-primary hover:bg-primary/90 shadow-lg" onClick={() => router.push('/settings/data')}>
                        Fix Loading Issues
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/40 shadow-lg bg-card/40">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Email Us</CardTitle>
                    <CardDescription>Get direct help from the team.</CardDescription>
                </CardHeader>
                <CardContent>
                    <a href="mailto:darkvenomwp@gmail.com">
                        <Button variant="outline" className="w-full rounded-2xl h-12 border-primary/20 hover:bg-primary/5">
                            Contact Support
                        </Button>
                    </a>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
