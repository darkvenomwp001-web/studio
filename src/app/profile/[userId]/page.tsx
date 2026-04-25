
import { Suspense } from 'react';
import ProfilePageClient from './ProfilePageClient';
import { Loader2 } from 'lucide-react';

export async function generateStaticParams() {
  return [
    { userId: 'user' },
    { userId: 'rpTmIq5pnKc91aSSgMJiF26zIYy2' }
  ];
}

export default async function Page(props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-primary" /></div>}>
      <ProfilePageClient userId={params.userId} />
    </Suspense>
  );
}
