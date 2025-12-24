import type { Metadata } from 'next';
import { Toaster } from "@/components/ui/toaster";
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
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full" suppressHydrationWarning>
        <Providers>
        <div
  className="relative h-full w-full"
  style={{
    backgroundImage: "url('https://storage.googleapis.com/studio-webapp-assets/bafybeidjqub2hve6nveizkdl6yhhogb5cgh2ifzndg3vwv3ldb24tg6bnq/background.jpeg')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  }}
>
  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>

  <div className="relative z-10 h-full w-full">
    {children}
  </div>
</div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
