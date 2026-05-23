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
    HelpCircle
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

export default function SettingsHubPage() {
  const { user, loading, signOutFirebase } = useAuth();
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
    <div className="max-w-3xl mx-auto space-y-10 py-10 px-4 pb-20">
      <div className="flex justify-start">
        <Button 
            variant="ghost" 
            onClick={() => router.push(`/profile/${user.id}`)} 
            className="-ml-2 text-muted-foreground hover:text-foreground font-bold text-xs uppercase tracking-widest gap-2"
        >
            <ArrowLeft className="h-4 w-4" />
            Back to Profile
        </Button>
      </div>

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
            <p className="text-muted-foreground text-sm">Manage your profile and preferences.</p>
        </div>
      </header>

      <div className="grid gap-8">
        {/* Profile & Security */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Account & Safety</h2>
          <div className="grid gap-1">
            <SettingsLink href="/settings/profile" icon={UserCog} title="Public Profile" description="Change your name, photo, and bio." iconColor="text-blue-500" />
            <SettingsLink href="/settings/account" icon={KeyRound} title="Login Details" description="Manage your email and password." iconColor="text-orange-500" />
            <SettingsLink href="/settings/safety" icon={Shield} title="Safety" description="Blocked users and content filters." iconColor="text-red-500" />
          </div>
        </section>

        {/* Data & Info */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Info & Storage</h2>
          <div className="grid gap-1">
            <SettingsLink href="/settings/features" icon={HelpCircle} title="How it Works" description="Learn about all the features of DVHIDEOUT." iconColor="text-blue-400" />
            <SettingsLink href="/settings/data" icon={Database} title="Data & Cache" description="Fix issues and clear local storage." iconColor="text-emerald-500" />
            <SettingsLink href="/settings/echoes" icon={Sparkles} title="My Milestones" description="View your achievements and activity." iconColor="text-purple-500" />
          </div>
        </section>
        
        {/* Experience */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Experience</h2>
          <div className="grid gap-1">
            <SettingsLink href="/settings/notifications" icon={Bell} title="Notifications" description="Choose how we alert you." iconColor="text-yellow-500" />
            <SettingsLink href="/settings/messaging" icon={MessageCircle} title="Messages" description="Control who can send you DMs." iconColor="text-green-500" />
            <SettingsLink href="/settings/reader" icon={BookMarked} title="Reader Preferences" description="Customize how you read stories." iconColor="text-orange-400" />
            <SettingsLink href="/settings/appearance" icon={Palette} title="Appearance" description="Change colors and themes." iconColor="text-pink-500" />
          </div>
        </section>

        {/* Legal & Help */}
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest font-bold text-muted-foreground px-2">Support</h2>
          <div className="grid gap-1">
            <SettingsLink href="/settings/terms" icon={FileText} title="Rules" description="Read our terms and guidelines." />
            <SettingsLink href="/settings/privacy" icon={ShieldCheck} title="Privacy" description="How we protect your data." />
            <SettingsLink href="/settings/help" icon={Info} title="Help Center" description="Get support or report a problem." />
          </div>
        </section>

        <section className="pt-6 border-t border-border/40">
            <Button 
                variant="ghost" 
                onClick={signOutFirebase} 
                className="w-full h-14 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive font-bold uppercase text-xs tracking-widest transition-all"
            >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
            </Button>
        </section>
      </div>
      
      <footer className="pt-10 text-center">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-40">DVHIDEOUT & bull; 2026</p>
      </footer>
    </div>
  );
}
