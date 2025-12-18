
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
    <html lang="en" suppressHydrationWarning className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full flex flex-col" suppressHydrationWarning>
        <div className="fixed inset-0 z-[-1]">
          <Image
            src="https://cdn.discordapp.com/attachments/1262463287600287754/1267868512211112028/sduquej_A_cool_and_modern_background_image_for_an_app_for_a_u_12891334-a150-4823-863a-c85e283b0b82.png?ex=66ab93a1&is=66aa4221&hm=4a78c1c4f03932a933f20d2d3a39e8d35edc65076e03a111a4d0016e4514571c&"
            alt="Abstract background"
            fill
            style={{ objectFit: 'cover', opacity: 1 }}
            priority
            data-ai-hint="abstract purple gradient"
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
