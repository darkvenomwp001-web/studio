
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Palette, Moon, Sun, Monitor } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from 'next-themes';

export default function AppearanceSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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
    <div className="max-w-2xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <Palette className="h-8 w-8" /> Appearance
        </h1>
        <p className="text-muted-foreground">Customize the look and feel of the app.</p>
      </header>
      
      <Card>
        <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Select a theme for the application interface.</CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup defaultValue={theme} onValueChange={setTheme} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Sun className="mb-2 h-6 w-6" />
                        Light
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Moon className="mb-2 h-6 w-6" />
                        Dark
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <Monitor className="mb-2 h-6 w-6" />
                        System
                    </Label>
                </div>
            </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
