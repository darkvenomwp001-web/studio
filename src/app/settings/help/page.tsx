
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
            <Info className="h-10 w-10 text-primary" /> Support Hub
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Updated Archives: May 15, 2026</p>
      </header>
      
      <div className="grid gap-8">
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10 p-8">
                <CardTitle className="text-xl">Frequently Asked Archives</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">How do I fix "Hanging" loading screens?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            This usually happens due to a cache mismatch. Navigate to **Settings &rarr; Data & Cache** and perform a "Deep Reset Persistence." This forces your device to re-sync fresh data from the cloud.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">How does the "Carousel Studio" work?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            The Carousel is manually curated by the platform owner to showcase high-fidelity manuscripts. If you're a writer, your work may be selected based on community engagement and quality.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">What are "Chapter Analytics"?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            In your Manuscript Studio, you can now see real-time reads, votes, and comments for every specific part. This helps you track which chapters resonate most with your audience.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-4" className="border-none px-4">
                        <AccordionTrigger className="hover:no-underline font-bold text-sm text-foreground/90">Is my data safe in "Night Portal" mode?</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                            Absolutely. Appearance modes like Night Portal and Parchment Mode are purely visual overlays and do not affect your data persistence or privacy protocols.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
        
        <div className="grid sm:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-border/40 shadow-lg bg-card/40">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Zap className="h-5 w-5 text-yellow-500" /> Fast Resolution</CardTitle>
                    <CardDescription>Technical issues or bugs.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button className="w-full rounded-2xl h-12 bg-primary hover:bg-primary/90 shadow-lg" onClick={() => router.push('/settings/data')}>
                        Fix App Hanging
                    </Button>
                </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/40 shadow-lg bg-card/40">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> Transmit Signal</CardTitle>
                    <CardDescription>Direct support from the archives.</CardDescription>
                </CardHeader>
                <CardContent>
                    <a href="mailto:support@d4rkv3nom.app">
                        <Button variant="outline" className="w-full rounded-2xl h-12 border-primary/20 hover:bg-primary/5">
                            Contact Archives
                        </Button>
                    </a>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
