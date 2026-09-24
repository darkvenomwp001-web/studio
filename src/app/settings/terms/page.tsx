'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Gavel, Scale, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TermsOfServicePage() {
  const router = useRouter();

  const rules = [
    {
      id: "1",
      title: "Archive Usage",
      items: [
        "1.1 Creative Rights: You keep all rights to the stories you write and post here.",
        "1.2 Host License: By posting, you let us display and store your work for readers.",
        "1.3 Content Removal: You can delete your work at any time to remove the license.",
        "1.4 Backup Safety: We suggest keeping copies of your work on your own device too.",
        "1.5 Integrity: Do not attempt to bypass app security or access private archives."
      ]
    },
    {
      id: "2",
      title: "Community Conduct",
      items: [
        "2.1 Respect Nodes: Treat all creators and readers with kindness and respect.",
        "2.2 Hate Speech: We have zero tolerance for hate, bullying, or harassment.",
        "2.3 Impersonation: Do not pretend to be another creator or the platform owner.",
        "2.4 Feedback Protocol: Keep story reviews constructive and helpful, not harmful.",
        "2.5 Report System: Use the report tools to flag any behavior that breaks these rules."
      ]
    },
    {
      id: "3",
      title: "Content Standards",
      items: [
        "3.1 Maturity Labels: You must label any stories with mature themes as '18+'.",
        "3.2 Plagiarism: Only post work that you have written yourself.",
        "3.3 Graphic Imagery: Extremely violent or explicit visuals are not permitted.",
        "3.4 Spoilers: Respect others by using spoiler tags for major plot reveals.",
        "3.5 Illegal Content: Posting anything illegal will result in immediate ban."
      ]
    },
    {
      id: "4",
      title: "Account Security",
      items: [
        "4.1 Password Safety: You are responsible for keeping your login info private.",
        "4.2 Shared Accounts: We do not recommend sharing your identity with others.",
        "4.3 Unauthorized Access: Report any strange activity on your account immediately.",
        "4.4 Device Sync: Be careful when using public devices to access your archive.",
        "4.5 Identity Verification: Some features may require basic proof of identity."
      ]
    },
    {
      id: "5",
      title: "Interaction Protocol",
      items: [
        "5.1 Direct Messages: Do not spam authors or fellow readers with messages.",
        "5.2 Comment Sections: Keep the conversation focused on the story or update.",
        "5.3 Signal Tracking: Follow users you genuinely want to connect with.",
        "5.4 Private Letters: Heartfelt letters should remain respectful and sincere.",
        "5.5 Group Discussions: Maintain a positive atmosphere in all community threads."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground">Community Rules</h1>
        <p className="text-muted-foreground text-sm font-medium">Clear guidelines for a healthy literary multiverse.</p>
      </header>
      
      <div className="grid gap-6">
        {rules.map((section) => (
          <Card key={section.id} className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b p-6">
                <CardTitle className="text-xl font-headline font-bold">{section.title}</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Rule Section {section.id}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <ul className="space-y-4">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="text-sm md:text-base text-muted-foreground leading-relaxed flex gap-3">
                      <span className="font-bold text-primary shrink-0">{item.split(': ')[0]}</span>
                      <span>{item.split(': ')[1]}</span>
                    </li>
                  ))}
                </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Governance Node & bull; D4RKV3NOM Contract</p>
      </footer>
    </div>
  );
}
