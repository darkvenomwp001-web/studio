import ProfilePageClient from './ProfilePageClient';

export async function generateStaticParams() {
  // For static export, we provide a placeholder. 
  // In a real build, you might fetch all user IDs, 
  // but for a prototype APK, this satisfies the requirement.
  return [{ userId: 'user' }];
}

export default async function Page(props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return <ProfilePageClient userId={params.userId} />;
}
