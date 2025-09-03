
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, UserCog, UserCheck, Users, ArrowRight, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/lib/types';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

const TimeWiseLogo = () => (
  <div className="flex items-center justify-center gap-2 md:gap-4">
    <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
        <BrainCircuit className="w-full h-full text-primary" />
    </div>
    <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-wider font-headline text-primary">
      TimeWise
    </h1>
  </div>
);

const CredentialDialog = ({ role, onBack }: { role: User['role'], onBack: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password);
       if (user.role !== role) {
        throw new Error(`Invalid credentials for ${role} role.`);
      }
      toast({
        title: 'Login Successful',
        description: `Welcome, ${user.name}! Redirecting...`,
      });
      router.push(`/${user.role}`);
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (role) {
        case 'admin': return 'admin@timewise.app';
        case 'faculty': return 'turing@example.com';
        case 'student': return 'alice@example.com';
    }
  }

  return (
    <div>
        <DialogHeader>
          <DialogTitle className="capitalize text-center text-2xl">Login</DialogTitle>
          <DialogDescription className="text-center">
            Enter your credentials to access the {role} portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={`e.g. ${getPlaceholder()}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="col-span-3"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between gap-2 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={onBack} disabled={isLoading}>Back</Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading} style={{ backgroundColor: '#420080', color: '#DOAFEF' }}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                Login
            </Button>
          </DialogFooter>
        </form>
    </div>
  )
}

const RoleSelectionDialog = ({ onSelectRole }: { onSelectRole: (role: User['role']) => void }) => {

    const roles: { role: User['role'], title: string, description: string, icon: React.ElementType}[] = [
        { role: 'admin', title: 'Admin', description: 'Manage university data and schedules.', icon: UserCog },
        { role: 'faculty', title: 'Faculty', description: 'Access your schedule and make requests.', icon: UserCheck },
        { role: 'student', title: 'Student', description: 'View your timetable and profile.', icon: Users },
    ]

    return (
        <div>
            <DialogHeader>
                <DialogTitle className="text-center text-2xl">Select Your Role</DialogTitle>
                <DialogDescription className="text-center">
                    Who are you logging in as?
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                {roles.map(({ role, title, description, icon: Icon }) => (
                    <Card key={role} className="hover:bg-accent/10 hover:border-primary hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer animate-in fade-in-0 zoom-in-95" onClick={() => onSelectRole(role)}>
                        <CardHeader className="flex flex-row items-center gap-4">
                           <div className="bg-primary/10 p-3 rounded-lg">
                             <Icon className="w-6 h-6 text-primary" />
                           </div>
                           <div>
                                <CardTitle>{title}</CardTitle>
                                <CardDescription>{description}</CardDescription>
                           </div>
                           <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground" />
                        </CardHeader>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default function Home() {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<User['role'] | null>(null);

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden">


      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <TimeWiseLogo />
        </div>
        <p className="mt-6 text-lg md:text-xl max-w-2xl text-primary/80 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            Developed with scalability, security, and ease of use in mind, TimeWise represents a step forward in modern academic management, ensuring that students and faculty can focus on learning and teaching while the system takes care of the rest.
        </p>

        <div className="mt-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
             <Dialog open={isDialogOpen} onOpenChange={(open) => {
                if (!open) setSelectedRole(null);
                setDialogOpen(open);
             }}>
                <DialogTrigger asChild>
                    <Button size="lg" style={{ backgroundColor: '#420080', color: '#DOAFEF' }} className="hover:scale-105 hover:shadow-lg transform transition-transform">
                        <LogIn className="mr-2 h-5 w-5" />
                        Login / Get Started
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                   {selectedRole ? (
                        <CredentialDialog role={selectedRole} onBack={() => setSelectedRole(null)} />
                   ) : (
                        <RoleSelectionDialog onSelectRole={setSelectedRole} />
                   )}
                </DialogContent>
            </Dialog>
        </div>
      </div>
    </main>
  );
}
