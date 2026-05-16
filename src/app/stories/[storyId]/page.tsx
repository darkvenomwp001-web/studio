import StoryOverviewClient from './StoryOverviewClient';

export default async function Page(props: { params: Promise<{ storyId: string }> }) {
  const params = await props.params;
  return <StoryOverviewClient storyId={params.storyId} />;
}
