'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Gavel, Scale, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function TermsOfServicePage() {
  const router = useRouter();

  const rules = [
    {
      id: "1",
      title: "Archive Usage",
      items: [
        "1.1 Creative Rights: You keep all rights to the stories you write and post here. You are the sole author and owner of your manuscripts. We do not claim ownership over any of your creative works.",
        "1.2 Host License: By posting your work, you give us permission to store and show your story to other users on the platform. This is necessary so that people can actually read what you write.",
        "1.3 Content Removal: You have the power to delete your work at any time. Once you delete it, our permission to show it ends, although some cached copies may stay on your device briefly.",
        "1.4 Backup Safety: While we keep your stories safe in our cloud archives, we always recommend keeping a personal copy on your own computer or notebook just in case.",
        "1.5 Integrity: You agree not to try and break the app or look at things that aren't yours. We want to keep everyone's workspace private and functional for all writers."
      ]
    },
    {
      id: "2",
      title: "Community Conduct",
      items: [
        "2.1 Respect Nodes: Always be kind to others. We are a family of writers and readers, and we want everyone to feel welcome and supported in their creative journey.",
        "2.2 Hate Speech: We do not allow any form of bullying or mean comments. If you see someone being unkind, please report them so we can keep the archive safe.",
        "2.3 Impersonation: Please be yourself. Do not try to pretend you are another famous author or a member of our staff. Honesty helps build trust in our community.",
        "2.4 Feedback Protocol: When you leave a comment on a story, try to be helpful. Tell the author what you loved and give suggestions in a nice way to help them grow.",
        "2.5 Report System: If you find something that breaks our rules, use the report button. Our team will look at it and take action to ensure the guidelines are followed."
      ]
    },
    {
      id: "3",
      title: "Content Standards",
      items: [
        "3.1 Maturity Labels: If your story has adult themes or scary parts, please mark it as '18+'. This helps younger readers avoid content that isn't right for them yet.",
        "3.2 Plagiarism: Only post what you have written yourself. Copying someone else's hard work is not allowed and will lead to your account being removed from the archive.",
        "3.3 Graphic Imagery: We want to keep the visual feed clean. Please avoid posting photos that are too violent or inappropriate for a general creative audience.",
        "3.4 Spoilers: Don't ruin the ending for others! If you're talking about a big plot twist, use a spoiler tag so readers can choose when they want to see it.",
        "3.5 Illegal Content: Posting anything illegal will result in an immediate and permanent ban from the multiverse."
      ]
    },
    {
      id: "4",
      title: "Account Security",
      items: [
        "4.1 Password Safety: Your password is like a key to your house. Keep it safe and don't share it with anyone else, even if they say they work for us.",
        "4.2 Shared Accounts: It's best to have your own account. Sharing an account can lead to your stories being deleted or your settings being changed by someone else.",
        "4.3 Unauthorized Access: If you think someone else has been using your account, change your password right away and let our support team know so we can help.",
        "4.4 Device Sync: If you use a computer at school or a library, make sure to log out when you are done so the next person can't see your private drafts.",
        "4.5 Identity Verification: Sometimes we might ask you to prove who you are, especially if you want to be a verified creator. This helps us keep the community authentic."
      ]
    },
    {
      id: "5",
      title: "Interaction Protocol",
      items: [
        "5.1 Direct Messages: Treat the chat like a real conversation. Don't send too many messages at once, and always be respectful when talking to authors or readers.",
        "5.2 Comment Sections: Keep your thoughts focused on the story. The comment section is for talking about the characters, the plot, and the writing itself.",
        "5.3 Signal Tracking: Follow people whose work you truly enjoy. This helps your feed stay interesting and filled with the stories you actually want to read.",
        "5.4 Private Letters: Letters are a special way to connect. Keep them sincere and heartfelt, as they are meant to build meaningful bonds between creators.",
        "5.5 Group Discussions: When participating in a thread with many people, stay positive. We want the group experience to be a highlight of everyone's day."
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
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, idx) => {
                    const splitIndex = item.indexOf(': ');
                    const title = item.substring(0, splitIndex);
                    const content = item.substring(splitIndex + 2);
                    return (
                      <AccordionItem key={idx} value={`${section.id}-${idx}`} className="border-border/20 px-1">
                        <AccordionTrigger className="hover:no-underline py-4 text-left group">
                          <span className="font-bold text-primary shrink-0 transition-transform group-data-[state=open]:scale-105">{title}</span>
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed pb-6 px-1 animate-in fade-in slide-in-from-top-1 duration-300 text-sm md:text-base">
                          {content}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Governance Node &bull; D4RKV3NOM Contract</p>
      </footer>
    </div>
  );
}
