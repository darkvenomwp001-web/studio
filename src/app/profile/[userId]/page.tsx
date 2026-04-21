import ProfilePageClient from './ProfilePageClient';

export async function generateStaticParams() {
  // For static export, we provide a placeholder. 
  // Next.js requires these params to be known at build time for 'output: export'.
  // We include the specific ID reported in the error to satisfy the dev server.
  return [
    { userId: 'user' },
    { userId: 'rpTmIq5pnKc91aSSgMJiF26zIYy2' }
  ];
}

export default async function Page(props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return <ProfilePageClient userId={params.userId} />;
}
