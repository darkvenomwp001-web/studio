'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, MessageCircle, Image, Star, Quote, Palette, Mail, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const features = [
    {
        title: "Stories & Writing",
        icon: BookOpen,
        color: "text-blue-500",
        desc: "The heart of DVHIDEOUT. Writers can publish their stories chapter by chapter. Readers can follow, read, and vote for their favorites."
    },
    {
        title: "My Journal (Updates)",
        icon: MessageCircle,
        color: "text-green-500",
        desc: "A social feed where authors post quick updates about their life or their next story part. It's the best way to stay connected with readers."
    },
    {
        title: "Photo Gallery",
        icon: Image,
        color: "text-pink-500",
        desc: "A private photo space. Your pictures are only visible to your mutual friends (people you follow who follow you back)."
    },
    {
        title: "Letters",
        icon: Mail,
        color: "text-orange-500",
        desc: "Heartfelt direct messages from readers to authors about specific story parts. Authors can reply privately or publicly."
    },
    {
        title: "Highlights",
        icon: Quote,
        color: "text-purple-500",
        desc: "Saved your favorite lines while reading. You can keep them for yourself or share them with the community to discuss."
    },
    {
        title: "Custom Themes",
        icon: Palette,
        color: "text-yellow-500",
        desc: "Personalize the app with custom accent colors, dark mode, OLED mode, and even a Parchment mode for reading."
    },
    {
        title: "Safety First",
        icon: ShieldCheck,
        color: "text-emerald-500",
        desc: "Built-in blocking, content filters, and spoiler warnings to keep the community a safe space for everyone."
    }
];

export default function FeaturesInfoPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
            How DVHIDEOUT Works
        </h1>
        <p className="text-muted-foreground text-sm font-medium">A guide to all the features designed for you.</p>
      </header>
      
      <div className="grid gap-4 md:grid-cols-2">
        {features.map((f, i) => (
            <Card key={i} className="rounded-3xl border-none shadow-lg bg-card/40 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className={`p-3 rounded-2xl bg-muted/50 ${f.color}`}>
                        <f.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg font-bold">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
            </Card>
        ))}
      </div>
      
      <footer className="pt-10 text-center">
        <Button onClick={() => router.push('/')} className="rounded-full px-10 h-12 font-bold uppercase text-xs tracking-widest">Start Exploring</Button>
      </footer>
    </div>
  );
}

