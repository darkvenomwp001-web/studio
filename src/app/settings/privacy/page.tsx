'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Share2, Search, UserCheck, HardDrive, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      id: "1",
      title: "Information Collected",
      items: [
        "1.1 Profile Data: We store your chosen name, bio, and visual avatar.",
        "1.2 Login Credentials: Your email and password are encrypted for safety.",
        "1.3 Usage Logs: We track your reading progress to help you resume stories.",
        "1.4 Interaction Signals: We store your reactions, comments, and votes.",
        "1.5 Device Info: Basic technical info to optimize the app for your screen."
      ]
    },
    {
      id: "2",
      title: "How We Use Data",
      items: [
        "2.1 Story Sync: Data is used to keep your library updated across devices.",
        "2.2 Connections: We use follow data to build your community feed.",
        "2.3 Notifications: Signals are used to alert you of new parts or replies.",
        "2.4 App Improvement: Anonymous data helps us fix bugs and add features.",
        "2.5 Security Monitoring: We monitor activity to prevent bullying and spam."
      ]
    },
    {
      id: "3",
      title: "Signal Sharing",
      items: [
        "3.1 Public Content: Your public stories and comments are visible to everyone.",
        "3.2 Close Friends: Private photos are only shared with your mutual friends.",
        "3.3 Profile Visibility: Your bio and avatar are public unless you lock them.",
        "3.4 External Links: We do not share your private data with outside parties.",
        "3.5 Search Index: Public stories may appear in community search results."
      ]
    },
    {
      id: "4",
      title: "Tracking & Cookies",
      items: [
        "4.1 Session Memory: We use local storage to keep you logged in.",
        "4.2 Setting Persistence: Your theme and font choices are saved on your device.",
        "4.3 Offline Access: Story data is cached locally for reading without signal.",
        "4.4 Performance Tools: We use simple tools to measure how fast pages load.",
        "4.5 Third-Party Tracking: We avoid intrusive tracking from outside networks."
      ]
    },
    {
      id: "5",
      title: "Data Storage",
      items: [
        "5.1 Cloud Archives: Your main data is stored in secure digital vaults.",
        "5.2 Local Cache: Temporary copies of stories are kept on your phone/PC.",
        "5.3 Data Retention: We keep your info as long as your account is active.",
        "5.4 Encryption: Sensitive nodes like passwords are never readable by humans.",
        "5.5 Server Location: Data is processed in secure global server centers."
      ]
    },
    {
      id: "6",
      title: "Your Choices",
      items: [
        "6.1 Profile Locking: You can choose to make your profile private.",
        "6.2 Story Privacy: Set any manuscript to Private or Unlisted anytime.",
        "6.3 Notification Controls: Pick exactly what alerts you want to receive.",
        "6.4 Data Export: You can request a copy of your archived information.",
        "6.5 Account Deletion: You can permanently erase your identity and data."
      ]
    },
    {
      id: "7",
      title: "Children's Privacy",
      items: [
        "7.1 Age Minimum: Users must meet the community age requirement.",
        "7.2 Parent Controls: We encourage guardians to monitor young readers.",
        "7.3 Safe Zones: Content filters help keep the app age-appropriate.",
        "7.4 Data Protection: We extra-protect data from younger community members.",
        "7.5 Direct Support: Contact us if you have concerns about a minor's data."
      ]
    },
    {
      id: "8",
      title: "Global Transfers",
      items: [
        "8.1 Data Portability: Your data moves with you wherever you travel.",
        "8.2 Regional Rules: We follow international standards for data protection.",
        "8.3 Secure Paths: Data is sent through encrypted tunnels between nodes.",
        "8.4 Cloud Stability: We use multiple servers to prevent data loss.",
        "8.5 Borderless Access: Read and write from anywhere in the world."
      ]
    },
    {
      id: "9",
      title: "Policy Updates",
      items: [
        "9.1 Regular Audits: we check this policy often to keep it updated.",
        "9.2 Change Alerts: We will notify you if major privacy rules change.",
        "9.3 Version Control: You can see when this policy was last calibrated.",
        "9.4 Agreement: Using the app means you accept the current privacy plan.",
        "9.5 Contact Hub: Reach out if you have any privacy questions."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground">Privacy Node</h1>
        <p className="text-muted-foreground text-sm font-medium">How we protect and manage your information.</p>
      </header>
      
      <div className="grid gap-6">
        {sections.map((section) => (
          <Card key={section.id} className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="bg-emerald-500/5 border-b p-6 border-emerald-500/10">
                <CardTitle className="text-xl font-headline font-bold flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  {section.title}
                </CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">Privacy Protocol {section.id}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
                <ul className="space-y-4">
                  {section.items.map((item, idx) => (
                    <li key={idx} className="text-sm md:text-base text-muted-foreground leading-relaxed flex gap-3">
                      <span className="font-bold text-emerald-600 shrink-0">{item.split(': ')[0]}</span>
                      <span>{item.split(': ')[1]}</span>
                    </li>
                  ))}
                </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Privacy Calibration Node & bull; D4RKV3NOM Core</p>
      </footer>
    </div>
  );
}
