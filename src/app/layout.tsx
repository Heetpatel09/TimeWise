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
              src="https://storage.googleapis.com/project-devel-hot/50537424/1725510656133-blurry-classroom-with-white-lines.jpg"
              alt="background"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-10"
              data-ai-hint="blurry classroom"
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
