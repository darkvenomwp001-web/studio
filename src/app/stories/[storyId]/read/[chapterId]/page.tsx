
import ChapterReaderClient from './ChapterReaderClient';

export async function generateStaticParams() {
  // Static parameters are required for static exports (output: export)
  return [
    { storyId: 'story', chapterId: 'chapter' }
  ];
}

export default async function Page(props: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const params = await props.params;
  return <ChapterReaderClient storyId={params.storyId} chapterId={params.chapterId} />;
}
