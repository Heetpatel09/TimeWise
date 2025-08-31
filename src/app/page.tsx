
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, UserCheck, User, ArrowRight, LogIn, Monitor, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const CodeBloodedLogo = () => (
  <div className="flex items-center justify-center">
    <div className="relative w-24 h-24 md:w-32 md:h-32">
        <Monitor className="w-full h-full text-primary" />
        <Clock className="absolute w-1/2 h-1/2 text-black top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse [animation-duration:1.5s]" />
    </div>
    <h1 className="text-6xl md:text-8xl font-bold text-foreground ml-4 tracking-wider font-headline">
      CodeBlooded
    </h1>
  </div>
);

export default function Home() {
  const [isLoginOpen, setLoginOpen] = useState(false);

  const roles = [
    {
      title: 'Admin',
      description: 'Manage subjects, classes, faculty, students, and schedules.',
      icon: <UserCog className="w-12 h-12 text-primary" />,
      link: '/admin',
    },
    {
      title: 'Faculty',
      description: 'View your schedule and manage your lecture slots.',
      icon: <UserCheck className="w-12 h-12 text-primary" />,
      link: '/faculty',
    },
    {
      title: 'Student',
      description: 'Access your class timetable and see updates.',
      icon: <User className="w-12 h-12 text-primary" />,
      link: '/student',
    },
  ];

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
        <CodeBloodedLogo />
        <p className="mt-6 text-lg md:text-xl max-w-2xl text-muted-foreground">
            The intelligent, AI-powered solution for effortless academic scheduling.
        </p>

        <Button size="lg" className="mt-10 text-lg px-10 py-6 rounded-full font-bold animate-pulse" onClick={() => setLoginOpen(true)}>
          <LogIn className="mr-2 h-5 w-5" /> Login
        </Button>

        <Dialog open={isLoginOpen} onOpenChange={setLoginOpen}>
          <DialogContent className="sm:max-w-4xl bg-card/80 backdrop-blur-lg border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-center text-3xl font-bold font-headline">Select Your Role</DialogTitle>
              <DialogDescription className="text-center text-lg">
                Choose your portal to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-8">
              {roles.map((role) => (
                <Card key={role.title} className="flex flex-col text-center items-center bg-transparent border-border/20 hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardHeader className="items-center">
                    {role.icon}
                    <CardTitle className="mt-4 text-2xl font-semibold font-headline">{role.title}</CardTitle>
                    <CardDescription className="mt-2 h-12">{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow flex items-end w-full">
                    <Button asChild className="w-full">
                      <Link href={role.link}>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
