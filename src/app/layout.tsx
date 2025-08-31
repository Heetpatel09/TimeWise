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
              src="https://thumbs.dreamstime.com/b/abstract-digital-art-displays-glowing-tech-clock-neon-lines-geometric-shapes-against-dark-background-futuristic-design-modern-388294510.jpg"
              alt="background"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-25"
              data-ai-hint="abstract colorful"
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
