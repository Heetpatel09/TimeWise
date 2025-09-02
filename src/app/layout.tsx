import type {Metadata} from 'next';
import { Toaster } from "@/components/ui/toaster"
import Image from 'next/image';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'CodeBlooded',
  description: 'Smart Timetable Generator',
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
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400..900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <div className="fixed inset-0 z-[-1]">
            <Image
              src="https://picsum.photos/seed/prof-bg/1920/1080"
              alt="background"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-20"
              data-ai-hint="abstract muted"
            />
        </div>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
