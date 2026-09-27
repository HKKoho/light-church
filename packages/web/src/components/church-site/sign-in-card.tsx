'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Asks a visitor to sign in, then brings them back to `returnTo`. */
export function SignInCard({
  prompt,
  label,
  returnTo,
}: {
  prompt: string;
  label: string;
  returnTo: string;
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-lg border p-6">
      <p>{prompt}</p>
      <Button asChild>
        <Link href={`/login?redirect=${encodeURIComponent(returnTo)}`}>
          <LogIn className="size-4" />
          {label}
        </Link>
      </Button>
    </div>
  );
}
