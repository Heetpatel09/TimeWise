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
            src="https://sdmntprwestus.oaiusercontent.com/files/00000000-1c10-6230-9d4d-4aea9d2202ef/raw?se=2025-09-03T07%3A43%3A27Z&sp=r&sv=2024-08-04&sr=b&scid=89e684b5-8c1d-5c5a-868e-5f87a86ae48f&skoid=5939c452-ea83-4420-b5b4-21182254a5d3&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-09-03T04%3A35%3A08Z&ske=2025-09-04T04%3A35%3A08Z&sks=b&skv=2024-08-04&sig=tz%2B2cUyEmZYPfjwZTJcJMfudEOUoLM5mmjXiOKq107Y%3D"
            alt="Abstract background"
            fill
            style={{ objectFit: 'cover', opacity: 0.5 }}
            priority
            data-ai-hint="abstract gradient"
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
