import AppLogo from '@/components/layout/AppLogo';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 group">
          <AppLogo className="h-8 w-8 group-hover:animate-pulse" />
        </Link>
      </div>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )
}
