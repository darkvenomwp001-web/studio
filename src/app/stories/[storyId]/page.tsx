import { Suspense } from 'react';
import StoryOverviewClient from './StoryOverviewClient';
import { Loader2 } from 'lucide-react';

export default async function Page(props: { params: Promise<{ storyId: string }> }) {
  const params = await props.params;
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <StoryOverviewClient storyId={params.storyId} />
    </Suspense>
  );
}
