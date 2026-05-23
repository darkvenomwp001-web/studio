'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { 
    Loader2, 
    ChevronRight, 
    UserCog, 
    KeyRound, 
    Sparkles, 
    Bell, 
    MessageCircle, 
    Settings, 
    Palette, 
    Info, 
    FileText, 
    ShieldCheck, 
    Database, 
    Shield,
    LogOut,
    BookMarked,
    ArrowLeft,
    HelpCircle,
    Heart,
    Star
} from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SettingsLinkProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  iconColor?: string;
  bgColor?: string;
}

const SettingsLink: React.FC<SettingsLinkProps> = ({ href, icon: Icon, title, description, iconColor = "text-primary", bgColor = "bg-primary/10" }) => (
  <Link href={href} className="group block hover:bg-muted/50 p-4 rounded-3xl transition-all duration-300 border border-transparent hover:border-border/50">
    <div className="flex items-center">
      <div className={cn("p-3 rounded-2xl mr-4 group-hover:scale-110 transition-all duration-500 shadow-sm", bgColor, iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:translate-x-1 group-hover:text-primary transition-all" />
    </div>
  </Link>
);

export default function SettingsHubPage() {
  const { user, loading, signOutFirebase } = useAuth();
  const router = useRouter();
  
  if (loading && !user) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-12rem)] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Entering Settings...</p>
      </div>
    );
  }

  if (!user && !loading) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10 py-10 px-4 pb-32 animate-in fade-in duration-700">
      <div className="flex justify-start">
        <Button 
            variant="ghost" 
            onClick={() => router.push(`/profile/${user.id}`)} 
            className="-ml-2 text-muted-foreground hover:text-foreground font-bold text-[10px] uppercase tracking-[0.2em] gap-2"
        >
            <ArrowLeft className="h-4 w-4" />
            My Profile
        </Button>
      </div>

      <header className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
            <Avatar className="h-28 w-28 border-[6px] border-background shadow-2xl group-hover:scale-105 transition-transform duration-500">
                <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
                <AvatarFallback className="text-2xl font-bold bg-muted text-primary">{user?.username?.substring(0,2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full border-4 border-background shadow-lg">
                <Settings className="h-5 w-5" />
            </div>
        </div>
        <div className="space-y-1">
            <h1 className="text-3xl font-headline font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground text-sm font-medium">Manage your info and app style.</p>
        </div>
      </header>

      <div className="grid gap-10">
        {/* Profile & Security */}
        <section className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground/60 px-2">Account & Safety</h2>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-2">
                <SettingsLink href="/settings/profile" icon={UserCog} title="Edit Profile" description="Update your name, photo, and bio." iconColor="text-blue-500" bgColor="bg-blue-500/10" />
                <SettingsLink href="/settings/account" icon={KeyRound} title="Email & Password" description="Manage your login credentials." iconColor="text-orange-500" bgColor="bg-orange-500/10" />
                <SettingsLink href="/settings/safety" icon={Shield} title="Safety" description="Blocked users and safety filters." iconColor="text-red-500" bgColor="bg-red-500/10" />
            </CardContent>
          </Card>
        </section>

        {/* Info & Storage */}
        <section className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground/60 px-2">Help & Memory</h2>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-2">
                <SettingsLink href="/settings/features" icon={HelpCircle} title="How it Works" description="Guide to all app features." iconColor="text-blue-400" bgColor="bg-blue-400/10" />
                <SettingsLink href="/settings/data" icon={Database} title="Memory" description="Clear storage and fix issues." iconColor="text-emerald-500" bgColor="bg-emerald-500/10" />
                <SettingsLink href="/settings/echoes" icon={Star} title="My Journey" description="View your achievements and progress." iconColor="text-purple-500" bgColor="bg-purple-500/10" />
            </CardContent>
          </Card>
        </section>
        
        {/* Experience */}
        <section className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground/60 px-2">Personalize</h2>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-2">
                <SettingsLink href="/settings/notifications" icon={Bell} title="Alerts" description="Choose how you want to be notified." iconColor="text-yellow-500" bgColor="bg-yellow-500/10" />
                <SettingsLink href="/settings/messaging" icon={MessageCircle} title="Chat" description="Control who can message you." iconColor="text-green-500" bgColor="bg-green-500/10" />
                <SettingsLink href="/settings/reader" icon={BookMarked} title="Reading" description="Customize your reader mode." iconColor="text-orange-400" bgColor="bg-orange-400/10" />
                <SettingsLink href="/settings/appearance" icon={Palette} title="Style" description="Change colors and themes." iconColor="text-pink-500" bgColor="bg-pink-500/10" />
            </CardContent>
          </Card>
        </section>

        {/* Legal & Help */}
        <section className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[0.25em] font-black text-muted-foreground/60 px-2">Support</h2>
          <Card className="rounded-[2.5rem] border-none shadow-xl bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-2">
              <SettingsLink href="/settings/terms" icon={FileText} title="Rules" description="Read our terms and rules." iconColor="text-muted-foreground" bgColor="bg-muted" />
              <SettingsLink href="/settings/privacy" icon={ShieldCheck} title="Privacy" description="How we protect your info." iconColor="text-muted-foreground" bgColor="bg-muted" />
              <SettingsLink href="/settings/help" icon={Info} title="Help" description="Get help or report a problem." iconColor="text-muted-foreground" bgColor="bg-muted" />
            </CardContent>
          </Card>
        </section>

        <section className="pt-6">
            <Button 
                variant="ghost" 
                onClick={signOutFirebase} 
                className="w-full h-16 rounded-[2rem] text-destructive hover:bg-destructive/10 hover:text-destructive font-bold uppercase text-xs tracking-[0.2em] transition-all border border-transparent hover:border-destructive/20"
            >
                <LogOut className="mr-2 h-5 w-5" />
                Sign Out
            </Button>
        </section>
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[10px] text-muted-foreground/40 uppercase tracking-[0.4em] font-black">DVHIDEOUT</p>
      </footer>
    </div>
  );
}
