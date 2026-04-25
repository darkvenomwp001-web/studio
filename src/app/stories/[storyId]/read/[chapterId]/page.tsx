import ChapterReaderClient from './ChapterReaderClient';

export async function generateStaticParams() {
  // Static parameters are required for static exports (output: export)
  // We include common placeholders and the specific IDs reported in errors
  return [
    { storyId: 'story', chapterId: 'chapter' },
    { storyId: 'story-1750413383499-0sgsj', chapterId: 'chapter-1750579404926-ay14s' }
  ];
}

export default async function Page(props: { params: Promise<{ storyId: string; chapterId: string }> }) {
  const params = await props.params;
  return <ChapterReaderClient storyId={params.storyId} chapterId={params.chapterId} />;
}
