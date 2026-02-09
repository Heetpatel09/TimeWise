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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { User } from '@/lib/types';

function TimeWiseLogo() {
  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 mb-8">
      <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
        <BrainCircuit className="w-full h-full text-primary animation-pulse" />
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-wider font-headline text-foreground">
        TimeWise
      </h1>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role']>('admin');
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
       if (user.role !== role && !(role === 'admin' && (user.role === 'admin' || (user as any).role === 'manager'))) {
        throw new Error(`Invalid credentials for the selected role.`);
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
       <div className="space-y-2">
          <Label>Role</Label>
          <RadioGroup value={role} onValueChange={(v: User['role']) => setRole(v)} className="flex gap-4 pt-2">
            <div className="flex items-center space-x-2"><RadioGroupItem value="admin" id="role-admin" /><Label htmlFor="role-admin">Admin/Manager</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="faculty" id="role-faculty" /><Label htmlFor="role-faculty">Faculty</Label></div>
            <div className="flex items-center space-x-2"><RadioGroupItem value="student" id="role-student" /><Label htmlFor="role-student">Student</Label></div>
          </RadioGroup>
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
    <main className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden"
      style={{
        backgroundImage: `url('https://picsum.photos/seed/1/1920/1080')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-background/20 backdrop-blur-sm"></div>
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <TimeWiseLogo />
        </div>

        <Card className="w-full max-w-md mt-8 text-left animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
            <Tabs defaultValue="login">
                <CardHeader>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="register">Register</TabsTrigger>
                    </TabsList>
                </CardHeader>
                <CardContent>
                    <TabsContent value="login">
                        <LoginForm />
                    </TabsContent>
                    <TabsContent value="register">
                        <CardDescription className="text-center mb-4">
                            Create a new administrator account. This will grant full access.
                        </CardDescription>
                        <RegisterForm />
                    </TabsContent>
                </CardContent>
            </Tabs>
        </Card>
        
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500">
          <Button variant="outline" onClick={handleGuestLogin} disabled={isGuestLoading}>
            {isGuestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
            Continue as Guest
          </Button>
        </div>
      </div>
    </main>
  );
}
