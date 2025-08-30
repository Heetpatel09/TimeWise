import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCog, UserCheck, User, ArrowRight } from 'lucide-react';

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
    <main className="flex flex-col items-center justify-center min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-bold text-primary font-headline">
          TimeWise
        </h1>
        <p className="mt-4 text-lg md:text-xl text-muted-foreground">
          Smart Timetable Generator
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
        {roles.map((role) => (
          <Card key={role.title} className="flex flex-col text-center items-center hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="items-center">
              {role.icon}
              <CardTitle className="mt-4 text-2xl font-semibold">{role.title}</CardTitle>
              <CardDescription className="mt-2 h-12">{role.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end w-full">
              <Button asChild className="w-full bg-accent hover:bg-accent/90">
                <Link href={role.link}>
                  Login <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
