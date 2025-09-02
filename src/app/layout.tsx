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
              src="https://cdn.discordapp.com/attachments/1370426452218220566/1412390603903205406/asthetic_ai_schedule_of_full_screen_that_looks_like_background_of_webssite.jpg?ex=68b81ec0&is=68b6cd40&hm=0744299cab9ae4bc052901fefb19d22fbb5601a00bb9715c6347a99725915d00&"
              alt="background"
              fill
              style={{ objectFit: 'cover' }}
              className="opacity-25"
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
