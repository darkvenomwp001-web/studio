
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Eye, Lock, Database, Cloud } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground flex items-center gap-4">
            <ShieldCheck className="h-10 w-10 text-emerald-500" /> Privacy Policy
        </h1>
        <p className="text-muted-foreground text-sm font-medium">Last Calibration: May 15, 2026</p>
      </header>
      
      <div className="grid gap-6">
        <Card className="rounded-[2.5rem] border-border/40 shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-emerald-500/5 border-b border-emerald-500/10 p-8">
                <CardTitle className="text-xl flex items-center gap-3">
                    <Lock className="h-6 w-6 text-emerald-500" /> Data Sovereignty
                </CardTitle>
                <CardDescription>Your work, your data, your privacy.</CardDescription>
            </CardHeader>
            <CardContent className="p-8 prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed text-foreground/80">
                <section>
                    <h3 className="text-foreground font-bold flex items-center gap-2"><Database className="h-4 w-4" /> Local Persistence (IndexedDB)</h3>
                    <p>D4RKV3NOM stores an encrypted copy of your current active manuscripts in your browser's local storage to allow for offline writing and fast loading. This data is private to your device and is only transmitted to our secure cloud when you trigger a "Save" or "Publish" action.</p>
                </section>

                <section>
                    <h3 className="text-foreground font-bold flex items-center gap-2"><Cloud className="h-4 w-4" /> AI Privacy Protocol</h3>
                    <p>Our AI Writing Assistant analyzes your text in real-time to provide style and grammar suggestions. **We do not train our machine learning models on your private manuscripts.** AI analysis happens in an ephemeral session that is discarded once the response is delivered.</p>
                </section>

                <section>
                    <h3 className="text-foreground font-bold flex items-center gap-2"><Eye className="h-4 w-4" /> Analytics & Visibility</h3>
                    <p>We track read counts, votes, and comments to provide writers with engagement metrics. These analytics are aggregated. We never sell your personal reading habits to third-party advertising nodes.</p>
                </section>

                <section>
                    <h3 className="text-foreground font-bold">GDPR & The Right to Erase</h3>
                    <p>As of May 2026, we provide a "Deep Wipe" tool in the Data settings. This allows you to instantly purge every byte of data we hold about you, both in our cloud storage and on your local device.</p>
                </section>
            </CardContent>
            <footer className="p-6 bg-muted/20 border-t border-border/20 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Encryption Node & bull; D4RKV3NOM Privacy Core</p>
            </footer>
        </Card>
      </div>
    </div>
  );
}
