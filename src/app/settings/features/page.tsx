'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, MessageCircle, Image, Star, Quote, Palette, Mail, ShieldCheck, Library, UserCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function FeaturesInfoPage() {
  const router = useRouter();

  const featureSections = [
    {
      id: "1",
      title: "Stories & Writing",
      icon: BookOpen,
      color: "text-blue-500",
      items: [
        "1.1 Manuscript Creation: Start your story journey by creating a unique manuscript node.",
        "1.2 Part Publishing: Divide your stories into chapters or parts for sequential reading.",
        "1.3 Draft Staging: Save your progress as private drafts before sharing with the world.",
        "1.4 Category Tagging: Label your stories by genre to help readers find them easily.",
        "1.5 Interactive Voting: Allow readers to show appreciation for specific story parts."
      ]
    },
    {
      id: "2",
      title: "The Community Feed",
      icon: MessageCircle,
      color: "text-green-500",
      items: [
        "2.1 Journal Updates: Share quick thoughts or life updates in a dedicated social feed.",
        "2.2 Signal Interactions: React to posts from creators you follow using custom emojis.",
        "2.3 Comment Threads: Participate in public discussions on any feed entry.",
        "2.4 Media Sharing: Attach photos or music archives to your feed posts.",
        "2.5 Repost Protocol: Share posts you love directly to your own activity feed."
      ]
    },
    {
      id: "3",
      title: "Identity Visuals",
      icon: Image,
      color: "text-pink-500",
      items: [
        "3.1 Visual Gallery: A dedicated space on your profile for photo uploads.",
        "3.2 Close Friends Access: Share photos that are only visible to mutual followers.",
        "3.3 Image Captions: Add context or storytelling to your visual archives.",
        "3.4 Full-Screen View: Immersive inspection of any shared community image.",
        "3.5 Identity Sync: Update your profile banners and avatars in real-time."
      ]
    },
    {
      id: "4",
      title: "Private Letters",
      icon: Mail,
      color: "text-orange-500",
      items: [
        "4.1 Direct Correspondence: Send heartfelt letters to authors about specific chapters.",
        "4.2 Privacy Choices: Choose between public letters or private direct messages.",
        "4.3 Author Responses: Creators can reply to feedback to build personal connections.",
        "4.4 Pinned Correspondence: Highlight your favorite fan letters on story pages.",
        "4.5 Real-Time Notifications: Get alerted instantly when a new letter arrives."
      ]
    },
    {
      id: "5",
      title: "Community Highlights",
      icon: Quote,
      color: "text-purple-500",
      items: [
        "5.1 Text Selection: Highlight powerful lines as you read through a manuscript.",
        "5.2 Personal Collection: View all your saved highlights in your private archive.",
        "5.3 Public Sharing: Share your favorite quotes with the community for discussion.",
        "5.4 Context Hub: Tap any highlight to jump back to the exact part it came from.",
        "5.5 Reaction Nodes: Let the world react to the prose you've identified."
      ]
    },
    {
      id: "6",
      title: "Visual Themes",
      icon: Palette,
      color: "text-yellow-500",
      items: [
        "6.1 Accent Selection: Choose from over 20 community-inspired color schemes.",
        "6.2 Night Portal: Enable a dark aesthetic for comfortable evening reading.",
        "6.3 Parchment Mode: Add a soft paper texture to manuscripts to ease eyes.",
        "6.4 OLED Optimization: True black backgrounds for modern mobile displays.",
        "6.5 Atmospheric Audio: Play rain or lofi sounds while focusing on a story."
      ]
    },
    {
      id: "7",
      title: "Safety Shield",
      icon: ShieldCheck,
      color: "text-emerald-500",
      items: [
        "7.1 User Blocking: Sever connections with any user to stop interactions.",
        "7.2 Spoiler Protection: Hide sensitive plot points behind a tap-to-reveal blur.",
        "7.3 Content Filters: Hide mature or sensitive stories from your feed.",
        "7.4 Profile Locking: Make your entire creative archive visible only to friends.",
        "7.5 Privacy Guard: Control who can see your online status or read receipts."
      ]
    },
    {
      id: "8",
      title: "Personal Library",
      icon: Library,
      color: "text-cyan-500",
      items: [
        "8.1 Archive Sync: Add any story to your library to track reading progress.",
        "8.2 Offline Access: Cached library nodes are readable without a connection.",
        "8.3 Library Sorting: Organize your saved stories by title or update date.",
        "8.4 Reading Progress: Visual indicators show how much of a story is left.",
        "8.5 Quick Resume: Jump back into a manuscript exactly where you left off."
      ]
    },
    {
      id: "9",
      title: "Profile Identity",
      icon: UserCircle,
      color: "text-indigo-500",
      items: [
        "9.1 Creator Bios: Tell the community your story and writing inspirations.",
        "9.2 Achievement Hub: Track your progress and unlock community milestones.",
        "9.3 Network Tracker: See who is following your archival journey.",
        "9.4 Role Nodes: Identify as a Reader, Writer, or Moderator.",
        "9.5 Account Switcher: Seamlessly jump between multiple identities."
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <header className="space-y-1">
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl md:text-5xl font-headline font-bold text-foreground">App Features Guide</h1>
        <p className="text-muted-foreground text-sm font-medium">A complete list of functions across the multiverse.</p>
      </header>
      
      <div className="grid gap-6">
        {featureSections.map((section) => (
          <Card key={section.id} className="rounded-[2.5rem] border-none shadow-lg bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 bg-muted/20 border-b p-6">
                <div className={cn("p-3 rounded-2xl bg-background shadow-sm", section.color)}>
                    <section.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-headline font-bold">{section.title}</CardTitle>
                  <CardDescription className="text-[10px] font-black uppercase tracking-widest opacity-60">System Module {section.id}</CardDescription>
                </div>
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
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/30">Feature Repository & bull; D4RKV3NOM Protocol</p>
      </footer>
    </div>
  );
}
