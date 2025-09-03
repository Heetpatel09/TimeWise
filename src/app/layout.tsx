import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
import Image from 'next/image';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'TimeWise',
  description: 'Smart Timetable Scheduler',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <div className="fixed inset-0 z-[-1]">
          <Image
            src="/background.jpg"
            alt="Abstract background"
            fill
            style={{ objectFit: 'cover' }}
            priority
            data-ai-hint="abstract background"
          />
        </div>
        <Providers>
            {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
