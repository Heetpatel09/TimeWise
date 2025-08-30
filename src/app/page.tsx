import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, UserCheck, User, ArrowRight, Droplets } from 'lucide-react';
import Image from 'next/image';

export default function Home() {
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
          className="opacity-20"
          data-ai-hint="abstract dark"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center px-4">
        <div className="mb-12">
          <div className="flex items-center justify-center mb-4">
            <Droplets className="w-16 h-16 text-primary" />
            <h1 className="text-6xl md:text-7xl font-bold text-primary-foreground ml-4">
              CodeBlooded
            </h1>
          </div>
          <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            An intelligent platform for educational institutions to effortlessly generate and manage academic timetables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {roles.map((role) => (
            <Card key={role.title} className="flex flex-col text-center items-center bg-card/50 backdrop-blur-sm border-border/20 hover:border-primary/50 hover:shadow-lg transition-all duration-300">
              <CardHeader className="items-center">
                {role.icon}
                <CardTitle className="mt-4 text-2xl font-semibold">{role.title}</CardTitle>
                <CardDescription className="mt-2 h-12">{role.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow flex items-end w-full">
                <Button asChild className="w-full">
                  <Link href={role.link}>
                    Login <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
