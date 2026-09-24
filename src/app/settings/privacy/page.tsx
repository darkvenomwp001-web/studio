'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Share2, Search, UserCheck, HardDrive, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const sections = [
    {
      id: "1",
      title: "Information Collected",
      items: [
        "1.1 Profile Data: We save the name you choose, your bio, and your profile picture. This information helps other people in the community find you and connect with your writing style.",
        "1.2 Login Credentials: We keep your email and a special scrambled version of your password. This ensures only you can enter your account and keeps your identity safe from others.",
        "1.3 Usage Logs: We keep track of how much you have read in a story. This lets the app remember exactly where you left off so you can jump back in without searching for your spot.",
        "1.4 Interaction Signals: When you like, comment, or vote, we save that action. This helps us show authors how much their work is appreciated and lets you see your own activity history.",
        "1.5 Device Info: We check what kind of phone or computer you are using. This helps us make sure the text and buttons look perfect on your specific screen size and resolution."
      ]
    },
    {
      id: "2",
      title: "How We Use Data",
      items: [
        "2.1 Story Sync: We use your data to make sure your library looks the same on your phone and your computer. Your reading spot is saved instantly in our cloud.",
        "2.2 Connections: We look at who you follow to decide what stories to show you first. This ensures your home feed is always filled with your favorite creators.",
        "2.3 Notifications: We send you alerts when someone you follow posts a new part. This keeps you connected and ensures you never miss a beat in the story.",
        "2.4 App Improvement: We look at which buttons are used the most to understand how to make the app better. This helps us decide what features to build next.",
        "2.5 Security Monitoring: We watch for any suspicious login attempts to protect your account. Our system alerts us if someone is trying to get into your archive."
      ]
    },
    {
      id: "3",
      title: "Signal Sharing",
      items: [
        "3.1 Public Content: Anything you set to 'Public' can be seen by everyone. This includes your public stories, your comments, and any highlights you choose to share.",
        "3.2 Close Friends: We have a special 'Close Friends' list for your photos. Only people you choose can see these personal moments, keeping them safe from strangers.",
        "3.3 Profile Visibility: People can see your bio and avatar to get to know you. If you want more privacy, you can lock your profile so only friends can see it.",
        "3.4 External Links: We never sell your personal information to advertisers. Your data stays within our network and is used only to improve your experience.",
        "3.5 Search Index: When people search for a genre, your public stories might show up. This helps new readers discover your work and follow your journey."
      ]
    },
    {
      id: "4",
      title: "Tracking & Cookies",
      items: [
        "4.1 Session Memory: We use a tiny bit of storage on your device to keep you logged in. This means you don't have to type your password every single time you open the app.",
        "4.2 Setting Persistence: We save your theme and font choices locally. This makes the app feel like home every time you return, with your preferred styles ready to go.",
        "4.3 Offline Access: We save copies of your library stories on your device. This lets you keep reading your favorite chapters even when you have no internet or signal.",
        "4.4 Performance Tools: We use simple technology to see how fast the app is running. If a page is slow, this data helps us find the problem and fix it quickly.",
        "4.5 Third-Party Tracking: We avoid using trackers from other big companies that follow you around the web. Your activity on our app is your business."
      ]
    },
    {
      id: "5",
      title: "Data Storage",
      items: [
        "5.1 Cloud Archives: Your manuscripts and profile info are kept in highly secure digital vaults. We use the latest technology to ensure your data is never lost or stolen.",
        "5.2 Local Cache: We use your phone's memory to store temporary files. This makes images load faster and saves your mobile data when you're browsing.",
        "5.3 Data Retention: We keep your information as long as you have an account. If you decide to leave us, we will remove your personal data from our active systems.",
        "5.4 Encryption: Things like your email and password are coded so that even our staff can't read them. Your secrets are safe in our digital lockbox.",
        "5.5 Server Location: We use a global network of servers to process your data. This ensures the app is fast and reliable no matter where you are in the world."
      ]
    },
    {
      id: "6",
      title: "Your Choices",
      items: [
        "6.1 Profile Locking: You have the choice to make your profile completely private. This means only people you approve can follow you and see your creative archive.",
        "6.2 Story Privacy: You are in control of who reads your work. You can change any story from Public to Private or Unlisted with just a single tap in the settings.",
        "6.3 Notification Controls: You can pick and choose which alerts you want on your phone. If you want to be quiet for a while, you can turn them all off.",
        "6.4 Data Export: You can ask for a copy of everything we have saved about you. We believe you should always know what information is in your archive.",
        "6.5 Account Deletion: If you ever want to move on, you can delete your account. This will erase your identity and all your data from our active community."
      ]
    },
    {
      id: "7",
      title: "Children's Privacy",
      items: [
        "7.1 Age Minimum: To keep everyone safe, we require users to be of a certain age. This helps us ensure the community is filled with people who understand the rules.",
        "7.2 Parent Controls: We encourage guardians to monitor young readers. Knowing what your child is reading is a great way to stay involved.",
        "7.3 Safe Zones: We use filters to hide mature content from younger members. Our goal is to make the archive a comfortable place for readers of many ages.",
        "7.4 Data Protection: We take extra care with information from our younger users. Protecting the next generation of writers is a top priority for our team.",
        "7.5 Direct Support: Contact us if you have concerns about a minor's data. We are dedicated to maintaining a safe environment for all creators."
      ]
    },
    {
      id: "8",
      title: "Global Transfers",
      items: [
        "8.1 Data Portability: Your reading list and stories move with you. No matter what device you use to log in, your archive will be exactly as you left it.",
        "8.2 Regional Rules: We follow local laws for data privacy around the world. We want to make sure we are respecting the rules of every country where our readers live.",
        "8.3 Secure Paths: When data moves from our servers to your phone, it travels through a secure tunnel. This prevents anyone from 'listening in' on your activity.",
        "8.4 Cloud Stability: We use multiple backup systems to prevent data loss. Even if one server has a problem, your stories will remain safe in another vault.",
        "8.5 Borderless Access: Read and write from anywhere in the world. Our global infrastructure is designed to keep you connected to your manuscripts anywhere."
      ]
    },
    {
      id: "9",
      title: "Policy Updates",
      items: [
        "9.1 Regular Audits: We check our privacy rules often to make sure they are still the best they can be. As technology changes, we update our protocols to stay ahead.",
        "9.2 Change Alerts: If we make a big change to how we handle your data, we will let you know. We want you to always be informed about your privacy.",
        "9.3 Version Control: You can see the date of our last update at the top of this page. This helps you know if you are reading the most current version of the rules.",
        "9.4 Agreement: Using the app means you accept the current privacy plan. We want our relationship with you to be based on clear rules and mutual trust.",
        "9.5 Contact Hub: Reach out if you have any privacy questions. Our team is here to explain things in simple words so you feel safe and secure."
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
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, idx) => {
                    const splitIndex = item.indexOf(': ');
                    const title = item.substring(0, splitIndex);
                    const content = item.substring(splitIndex + 2);
                    return (
                      <AccordionItem key={idx} value={`${section.id}-${idx}`} className="border-border/20 px-1">
                        <AccordionTrigger className="hover:no-underline py-4 text-left group">
                          <span className="font-bold text-emerald-600 shrink-0 transition-transform group-data-[state=open]:scale-105">{title}</span>
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
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Privacy Calibration Node &bull; D4RKV3NOM Core</p>
      </footer>
    </div>
  );
}
