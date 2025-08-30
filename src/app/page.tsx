
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, UserCheck, User, ArrowRight, Droplets, LogIn } from 'lucide-react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
    <main className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://picsum.photos/1920/1080"
          alt="background"
          fill
          style={{ objectFit: 'cover' }}
          className="opacity-10"
          data-ai-hint="abstract dark red"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center px-4">
        <div className="flex items-center justify-center mb-6">
          <Droplets className="w-24 h-24 text-primary" />
          <h1 className="text-8xl md:text-9xl font-bold text-primary-foreground ml-4 tracking-wider">
            CodeBlooded
          </h1>
        </div>

        <Dialog open={isLoginOpen} onOpenChange={setLoginOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="text-lg">
              <LogIn className="mr-2 h-5 w-5" /> Login
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl bg-card/80 backdrop-blur-lg border-primary/20">
            <DialogHeader>
              <DialogTitle className="text-center text-3xl font-bold">Select Your Role</DialogTitle>
              <DialogDescription className="text-center text-lg">
                Choose your portal to continue.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full pt-8">
              {roles.map((role) => (
                <Card key={role.title} className="flex flex-col text-center items-center bg-transparent border-border/20 hover:border-primary/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardHeader className="items-center">
                    {role.icon}
                    <CardTitle className="mt-4 text-2xl font-semibold">{role.title}</CardTitle>
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
