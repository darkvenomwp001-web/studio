import StoryOverviewClient from './StoryOverviewClient';

export async function generateStaticParams() {
  // Required for static export build
  return [{ storyId: 'story' }];
}

export default async function Page(props: { params: Promise<{ storyId: string }> }) {
  const params = await props.params;
  return <StoryOverviewClient storyId={params.storyId} />;
}
