import ProfilePageClient from './ProfilePageClient';

export async function generateStaticParams() {
  return [{ userId: 'user' }];
}

export default async function Page(props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return <ProfilePageClient userId={params.userId} />;
}
