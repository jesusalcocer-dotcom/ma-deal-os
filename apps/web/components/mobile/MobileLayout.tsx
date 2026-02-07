'use client';

import { MobileNav } from './MobileNav';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="md:hidden min-h-screen pb-16">
      <div className="p-4">
        {children}
      </div>
      <MobileNav />
    </div>
  );
}
