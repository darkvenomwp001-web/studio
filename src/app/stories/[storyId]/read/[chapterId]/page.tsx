import { Suspense } from 'react';
import ChapterReaderClient from './ChapterReaderClient';
import { Loader2 } from 'lucide-react';

export async function generateStaticParams() {
  // Static parameters are required for static exports (output: export)
  return [
    { storyId: 'story', chapterId: 'chapter' },
  ];
}

export default async function Page(props: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const params = await props.params;
  return (
    <Suspense fallback={
      <div className="flex flex-col justify-center items-center min-h-screen bg-background gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground animate-pulse">Syncing Manuscript...</p>
      </div>
    }>
      <ChapterReaderClient storyId={params.storyId} chapterId={params.chapterId} />
    </Suspense>
  );
}
