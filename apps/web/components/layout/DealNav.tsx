'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export function DealNav() {
  const pathname = usePathname();
  const params = useParams();
  const dealId = params.dealId as string;
  const base = `/deals/${dealId}`;

  const tabs = [
    { href: base, label: 'Dashboard', exact: true },
    { href: `${base}/checklist`, label: 'Checklist' },
    { href: `${base}/documents`, label: 'Documents' },
    { href: `${base}/diligence`, label: 'Diligence' },
    { href: `${base}/emails`, label: 'Emails' },
    { href: `${base}/disclosure-schedules`, label: 'Disclosures' },
    { href: `${base}/negotiation`, label: 'Negotiation' },
    { href: `${base}/closing`, label: 'Closing' },
    { href: `${base}/client`, label: 'Client' },
    { href: `${base}/third-parties`, label: 'Third Parties' },
    { href: `${base}/agent`, label: 'Agent' },
    { href: `${base}/settings`, label: 'Settings' },
  ];

  return (
    <nav className="flex space-x-1 border-b px-6">
      {tabs.map((tab) => {
        const isActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'border-b-2 px-3 py-3 text-sm font-medium transition-colors',
              isActive
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
