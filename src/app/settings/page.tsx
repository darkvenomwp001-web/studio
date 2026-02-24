
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ChevronRight, UserCog, KeyRound, Sparkles, Bell, MessageCircle, Settings, Palette, Info, FileText, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SettingsLinkProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  iconColor?: string;
}

const SettingsLink: React.FC<SettingsLinkProps> = ({ href, icon: Icon, title, description, iconColor = "text-muted-foreground" }) => (
  <Link href={href} className="group block hover:bg-muted/50 p-4 rounded-xl transition-all duration-200 border border-transparent hover:border-border/50">
    <div className="flex items-center">
      <div className={cn("p-2.5 bg-muted rounded-lg mr-4 group-hover:scale-110 transition-transform duration-200", iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
    </div>
  </Link>
);

import { cn } from '@/lib/utils';

export default function SettingsHubPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  if (loading && !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !loading) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-10 px-4">
      <header className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background shadow-2xl">
                <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
                <AvatarFallback className="text-2xl">{user?.username?.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 p-1.5 bg-primary text-primary-foreground rounded-full border-2 border-background">
                <Settings className="h-4 w-4" />
            </div>
        </div>
        <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences.</p>
        </div>
      </header>

      <div className="grid gap-8">
        {/* Account Section */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Identity & Security</h2>
          <div className="grid gap-2">
            <SettingsLink href="/settings/profile" icon={UserCog} title="Public Profile" description="Update your avatar, username, and bio." iconColor="text-blue-500" />
            <SettingsLink href="/settings/account" icon={KeyRound} title="Account Access" description="Manage your email and password." iconColor="text-orange-500" />
          </div>
        </section>

        {/* Content Management Section */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">History</h2>
          <div className="grid gap-2">
            <SettingsLink href="/settings/echoes" icon={Sparkles} title="Your Echoes" description="Rediscover your journey and community impact." iconColor="text-purple-500" />
          </div>
        </section>
        
        {/* Interactions & Appearance Section */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Experience</h2>
          <div className="grid gap-2">
            <SettingsLink href="/settings/notifications" icon={Bell} title="Notifications" description="Choose how you're notified." iconColor="text-yellow-500" />
            <SettingsLink href="/settings/messaging" icon={MessageCircle} title="Messaging" description="Control who can message you." iconColor="text-green-500" />
            <SettingsLink href="/settings/appearance" icon={Palette} title="Appearance" description="7 unique ways to theme your LitVerse." iconColor="text-pink-500" />
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Platform</h2>
          <div className="grid gap-2">
            <SettingsLink href="/settings/terms" icon={FileText} title="Terms of Service" description="Read our rules and guidelines." />
            <SettingsLink href="/settings/privacy" icon={ShieldCheck} title="Privacy Policy" description="Learn how we handle your data." />
            <SettingsLink href="/settings/help" icon={Info} title="Help & Support" description="Get help or contact us." />
          </div>
        </section>
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">LitVerse v1.2.0 • Built for Readers & Writers</p>
      </footer>
    </div>
  );
}
