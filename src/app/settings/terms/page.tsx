
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <header>
        <Button variant="ghost" onClick={() => router.push('/settings')} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Settings
        </Button>
        <h1 className="text-3xl font-headline font-bold text-primary flex items-center gap-3">
            <FileText className="h-8 w-8" /> Terms of Service
        </h1>
        <p className="text-muted-foreground">Last Updated: July 26, 2024</p>
      </header>
      
      <Card>
        <CardContent className="prose dark:prose-invert max-w-none pt-6">
            <h2>1. Introduction</h2>
            <p>Welcome to LitVerse! These terms and conditions outline the rules and regulations for the use of LitVerse's Website, located at this domain.</p>
            <p>By accessing this website we assume you accept these terms and conditions. Do not continue to use LitVerse if you do not agree to take all of the terms and conditions stated on this page.</p>

            <h2>2. Intellectual Property Rights</h2>
            <p>Other than the content you own, under these Terms, LitVerse and/or its licensors own all the intellectual property rights and materials contained in this Website. You are granted limited license only for purposes of viewing the material contained on this Website.</p>

            <h2>3. Your Content</h2>
            <p>In these Website Standard Terms and Conditions, “Your Content” shall mean any audio, video text, images or other material you choose to display on this Website. By displaying Your Content, you grant LitVerse a non-exclusive, worldwide irrevocable, sub licensable license to use, reproduce, adapt, publish, translate and distribute it in any and all media.</p>
            <p>Your Content must be your own and must not be invading any third-party's rights. LitVerse reserves the right to remove any of Your Content from this Website at any time without notice.</p>
            
            <h2>4. No warranties</h2>
            <p>This Website is provided “as is,” with all faults, and LitVerse express no representations or warranties, of any kind related to this Website or the materials contained on this Website. Also, nothing contained on this Website shall be interpreted as advising you.</p>

            <h2>5. Limitation of liability</h2>
            <p>In no event shall LitVerse, nor any of its officers, directors and employees, shall be held liable for anything arising out of or in any way connected with your use of this Website whether such liability is under contract. LitVerse, including its officers, directors and employees shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this Website.</p>
        </CardContent>
      </Card>
    </div>
  );
}
