
'use client';

import StorylyTray from '@/components/stories/StoryTray';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function StoryViewerPage() {
  const router = useRouter();
  
  return (
    <div className="container mx-auto py-8">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4"/>
          Back
      </Button>
      <div className="relative h-[120px]">
        <StorylyTray />
      </div>
    </div>
  );
}
