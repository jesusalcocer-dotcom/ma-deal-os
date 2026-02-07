import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/mobile/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop layout */}
      <div className="hidden md:flex h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden min-h-screen pb-16">
        <main className="p-4">{children}</main>
        <MobileNav />
      </div>
    </>
  );
}
