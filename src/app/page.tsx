'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, UserPlus, BrainCircuit, Eye, EyeOff, Contact } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerAdmin } from '@/lib/services/auth';
import type { User } from '@/lib/types';

// The logo component is kept internal to this page as it's specific to the splash/login screen
function TimeWiseLogo() {
  return (
    <div className="flex items-center justify-center gap-4">
      <BrainCircuit className="w-12 h-12 text-primary" />
      <h1 className="text-5xl font-bold tracking-tighter font-headline text-foreground">
        TimeWise
      </h1>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(email, password);
      toast({
        title: 'Login Successful',
        description: `Welcome, ${user.name}! Redirecting...`,
      });
      // Redirect based on the actual role returned from the login service
      router.push(`/${(user as any).role || user.role}`);
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

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" placeholder="e.g., admin@timewise.app" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="pr-10" />
          <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
        Login
      </Button>
    </form>
  );
}

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await registerAdmin(name, email, password);
      // Automatically log in after successful registration
      const user = await login(email, password);
      toast({
        title: 'Registration Successful',
        description: `Welcome, ${user.name}! Redirecting...`,
      });
      router.push('/admin');
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Could not create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="register-name">Full Name</Label>
            <Input id="register-name" value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="register-email">Email Address</Label>
            <Input id="register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <div className="relative">
                <Input id="register-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className="pr-10"/>
                <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
        Create Admin Account
      </Button>
    </form>
  );
}

export default function Home() {
  const { loginAsGuest, isLoading: isGuestLoading } = useAuth();
  const router = useRouter();

  const handleGuestLogin = async () => {
    await loginAsGuest();
    router.push('/admin');
  };

  return (
    <main className="grid lg:grid-cols-2 min-h-screen">
        <div className="hidden lg:flex flex-col items-center justify-center bg-muted/40 p-12 border-r">
            <div className="max-w-md text-center">
                <TimeWiseLogo />
                <p className="text-lg text-muted-foreground mt-6">
                    The intelligent, AI-powered scheduling solution for modern educational institutions.
                </p>
            </div>
        </div>

        <div className="flex flex-col items-center justify-center p-4">
             <div className="lg:hidden mb-8">
                <TimeWiseLogo />
            </div>
            <Card className="w-full max-w-sm">
                <Tabs defaultValue="login">
                    <CardHeader>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="login">Login</TabsTrigger>
                            <TabsTrigger value="register">Register Admin</TabsTrigger>
                        </TabsList>
                    </CardHeader>
                    <CardContent>
                        <TabsContent value="login">
                            <CardTitle className="mb-1 text-2xl">Welcome Back</CardTitle>
                            <CardDescription className="mb-4">Enter your credentials to access your dashboard.</CardDescription>
                            <LoginForm />
                        </TabsContent>
                        <TabsContent value="register">
                             <CardTitle className="mb-1 text-2xl">Create Admin Account</CardTitle>
                             <CardDescription className="mb-4">Get started by creating a new administrator account.</CardDescription>
                            <RegisterForm />
                        </TabsContent>
                    </CardContent>
                </Tabs>
                <div className="relative p-6 pt-0">
                    <div className="absolute inset-x-6 top-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">
                            Or
                        </span>
                    </div>
                </div>
                 <div className="px-6 pb-6">
                    <Button variant="outline" onClick={handleGuestLogin} disabled={isGuestLoading} className="w-full">
                        {isGuestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
                        Continue as Guest
                    </Button>
                </div>
            </Card>
        </div>
    </main>
  );
}
