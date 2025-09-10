
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <ShieldCheck className="h-8 w-8" /> Privacy Policy
        </h1>
        <p className="text-muted-foreground">Last Updated: July 26, 2024</p>
      </header>
      
      <Card>
        <CardContent className="prose dark:prose-invert max-w-none pt-6">
            <p>Your privacy is important to us. It is LitVerse's policy to respect your privacy regarding any information we may collect from you across our website.</p>
            
            <h3>1. Information we collect</h3>
            <p><strong>Log data:</strong> When you visit our website, our servers may automatically log the standard data provided by your web browser. It may include your computer’s Internet Protocol (IP) address, your browser type and version, the pages you visit, the time and date of your visit, the time spent on each page, and other details.</p>
            <p><strong>Personal information:</strong> We may ask for personal information, such as your: Name, Email, Social media profiles, Date of birth, Phone/mobile number.</p>

            <h3>2. Legal bases for processing</h3>
            <p>We will process your personal information lawfully, fairly and in a transparent manner. We collect and process information about you only where we have legal bases for doing so.</p>

            <h3>3. Security of your personal information</h3>
            <p>When we collect and process personal information, and while we retain this information, we will protect it within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>

            <h3>4. How long we keep your personal information</h3>
            <p>We keep your personal information only for as long as we need to. This time period may depend on what we are using your information for, in accordance with this privacy policy. If your personal information is no longer required, we will delete it or make it anonymous by removing all details that identify you.</p>

            <h3>5. Children’s Privacy</h3>
            <p>We do not aim any of our products or services directly at children under the age of 13, and we do not knowingly collect personal information about children under 13.</p>
        </CardContent>
      </Card>
    </div>
  );
}
