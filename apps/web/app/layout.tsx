import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'M&A Deal OS',
  description: 'M&A Deal Operating System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
