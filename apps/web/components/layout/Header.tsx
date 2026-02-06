'use client';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm">
          Sign Out
        </Button>
      </div>
    </header>
  );
}
