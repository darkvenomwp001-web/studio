
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronRight, UserCog, KeyRound, Archive, Trash2, FileText, ShieldCheck, Info, Bell, MessageCircle, Settings, Palette, Sparkles, Wind } from 'lucide-react';
import Link from 'next/link';

interface SettingsLinkProps {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

const SettingsLink: React.FC<SettingsLinkProps> = ({ href, icon: Icon, title, description }) => (
  <Link href={href} className="block hover:bg-muted/50 p-4 rounded-lg transition-colors -mx-4">
    <div className="flex items-center">
      <div className="p-2 bg-muted rounded-full mr-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </div>
  </Link>
);


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
    <div className="max-w-3xl mx-auto space-y-10 py-8">
      <header className="text-center">
        <h1 className="text-4xl font-headline font-bold text-primary mb-2 flex items-center justify-center gap-3">
          <Settings className="h-10 w-10" /> Settings
        </h1>
        <p className="text-muted-foreground">Manage your account, content, and preferences.</p>
      </header>

      <div className="space-y-8">
        {/* Account Section */}
        <section>
          <h2 className="text-lg font-headline font-semibold mb-2 px-4">Your Account</h2>
          <Card>
            <CardContent className="p-2">
                <SettingsLink href="/settings/profile" icon={UserCog} title="Edit Profile" description="Update your avatar, username, bio, and more." />
                <SettingsLink href="/settings/account" icon={KeyRound} title="Account Details" description="Manage your email and password." />
            </CardContent>
          </Card>
        </section>

        {/* Content Management Section */}
        <section>
          <h2 className="text-lg font-headline font-semibold mb-2 px-4">Content & Management</h2>
          <Card>
            <CardContent className="p-2">
                <SettingsLink href="/settings/statuses" icon={Wind} title="Manage Live Statuses" description="View your active statuses and take them offline." />
                <SettingsLink href="/settings/archive" icon={Archive} title="Archive" description="View your archived prompts and expired statuses." />
                <SettingsLink href="/settings/trash" icon={Trash2} title="Trash" description="Manage items you have moved to the trash." />
                <SettingsLink href="/settings/echoes" icon={Sparkles} title="Echoes" description="Rediscover your journey and impact." />
            </CardContent>
          </Card>
        </section>
        
        {/* Interactions & Appearance Section */}
        <section>
            <h2 className="text-lg font-headline font-semibold mb-2 px-4">Preferences</h2>
            <Card>
                 <CardContent className="p-2">
                    <SettingsLink href="/settings/notifications" icon={Bell} title="Notifications" description="Choose how you're notified." />
                    <SettingsLink href="/settings/messaging" icon={MessageCircle} title="Messaging" description="Control who can message you." />
                     <SettingsLink href="/settings/appearance" icon={Palette} title="Appearance" description="Customize the look and feel." />
                </CardContent>
            </Card>
        </section>

        {/* About Section */}
        <section>
          <h2 className="text-lg font-headline font-semibold mb-2 px-4">About</h2>
          <Card>
            <CardContent className="p-2">
              <SettingsLink href="/settings/terms" icon={FileText} title="Terms of Service" description="Read the rules and guidelines." />
              <SettingsLink href="/settings/privacy" icon={ShieldCheck} title="Privacy Policy" description="Learn how we handle your data." />
              <SettingsLink href="/settings/help" icon={Info} title="Help & Support" description="Get help or contact us." />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
