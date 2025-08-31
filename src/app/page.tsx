
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Monitor, Clock, LogIn, Loader2, UserCog, UserCheck, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import type { User } from '@/lib/types';

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

const LoginDialog = ({ role, children }: { role: User['role'], children: React.ReactNode }) => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(userId, password);
       if (user.role !== role) {
        throw new Error(`Invalid credentials for ${role} role.`);
      }
      toast({
        title: 'Login Successful',
        description: `Welcome, ${user.name}! Redirecting...`,
      });
      setIsOpen(false);
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
        case 'admin': return 'admin';
        case 'faculty': return 'FAC001';
        case 'student': return 'STU001';
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="capitalize">{role} Login</DialogTitle>
          <DialogDescription>
            Enter your credentials to access the {role} portal.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleLogin}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="userId" className="text-right">
                User ID
              </Label>
              <Input
                id="userId"
                placeholder={`e.g. ${getPlaceholder()}`}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
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
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                Login
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
        <CodeBloodedLogo />
        <p className="mt-6 text-lg md:text-xl max-w-2xl text-muted-foreground">
            The intelligent, AI-powered solution for effortless academic scheduling.
        </p>

        <div className="mt-12">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button size="lg" className="text-lg px-8 py-6 rounded-full shadow-lg transition-transform transform hover:scale-105">
                      <LogIn className="mr-3 h-5 w-5" />
                      Login / Get Started
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <LoginDialog role="admin">
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <UserCog className="mr-2 h-4 w-4" />
                    <span>Login as Admin</span>
                  </DropdownMenuItem>
                </LoginDialog>
                <LoginDialog role="faculty">
                   <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    <span>Login as Faculty</span>
                  </DropdownMenuItem>
                </LoginDialog>
                <LoginDialog role="student">
                   <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Users className="mr-2 h-4 w-4" />
                    <span>Login as Student</span>
                  </DropdownMenuItem>
                </LoginDialog>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
    </main>
  );
}
