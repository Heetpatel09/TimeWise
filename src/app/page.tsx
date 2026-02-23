'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Loader2, UserPlus, BrainCircuit, Eye, EyeOff, Contact, CheckCircle2, Users, Calendar, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerAdmin } from '@/lib/services/auth';
import { cn } from '@/lib/utils';

// --- Internal Components ---

function TimeWiseLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="p-2 bg-primary/10 rounded-xl">
        <BrainCircuit className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-3xl font-bold tracking-tighter font-headline text-foreground">
        TimeWise
      </h1>
    </div>
  );
}

function FloatingInput({ 
  id, 
  label, 
  type = "text", 
  value, 
  onChange, 
  disabled, 
  required,
  showPasswordToggle,
  onPasswordToggle
}: { 
  id: string, 
  label: string, 
  type?: string, 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
  disabled?: boolean,
  required?: boolean,
  showPasswordToggle?: boolean,
  onPasswordToggle?: () => void
}) {
  const [isFocused, setIsFocused] = useState(false);
  const isFloating = isFocused || value.length > 0;

  return (
    <div className="relative pt-4">
      <Input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        required={required}
        placeholder=" "
        className={cn(
          "peer h-12 w-full border-muted-foreground/20 bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
          showPasswordToggle && "pr-10"
        )}
      />
      <label
        htmlFor={id}
        className={cn(
          "absolute left-3 top-7 z-10 origin-[0] -translate-y-1 scale-100 transition-all duration-200 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-7 peer-focus:scale-90 pointer-events-none text-muted-foreground",
          isFloating && "-translate-y-7 scale-90 text-primary"
        )}
      >
        {label}
      </label>
      {showPasswordToggle && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-5 h-10 w-10 text-muted-foreground"
          onClick={onPasswordToggle}
        >
          {type === 'password' ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}

function StatCounter({ label, value, icon: Icon, delay = 0 }: { label: string, value: number, icon: any, delay?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const start = 0;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      const easeOutQuad = progress * (2 - progress);
      setCount(Math.floor(start + (end - start) * easeOutQuad));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    const timeout = setTimeout(() => requestAnimationFrame(animate), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return (
    <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 transition-transform hover:scale-105 duration-300">
      <div className="p-2 bg-primary/20 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{count}+</p>
        <p className="text-[10px] uppercase tracking-wider text-white/60 font-semibold">{label}</p>
      </div>
    </div>
  );
}

// --- Main Forms ---

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
    <form onSubmit={handleLogin} className="space-y-6">
      <FloatingInput 
        id="login-email" 
        label="Email Address" 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        disabled={isLoading}
        required
      />
      <FloatingInput 
        id="login-password" 
        label="Password" 
        type={showPassword ? 'text' : 'password'} 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        disabled={isLoading}
        required
        showPasswordToggle
        onPasswordToggle={() => setShowPassword(!showPassword)}
      />
      <Button type="submit" className="w-full h-12 bg-gradient-primary text-white font-semibold text-lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
        Login to Dashboard
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
    <form onSubmit={handleRegister} className="space-y-6">
      <FloatingInput 
        id="register-name" 
        label="Full Name" 
        value={name} 
        onChange={(e) => setName(e.target.value)} 
        disabled={isLoading}
        required
      />
      <FloatingInput 
        id="register-email" 
        label="Email Address" 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)} 
        disabled={isLoading}
        required
      />
      <FloatingInput 
        id="register-password" 
        label="Password" 
        type={showPassword ? 'text' : 'password'} 
        value={password} 
        onChange={(e) => setPassword(e.target.value)} 
        disabled={isLoading}
        required
        showPasswordToggle
        onPasswordToggle={() => setShowPassword(!showPassword)}
      />
      <Button type="submit" className="w-full h-12 bg-gradient-primary text-white font-semibold text-lg" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserPlus className="mr-2 h-5 w-5" />}
        Create Admin Account
      </Button>
    </form>
  );
}

// --- Main Page ---

export default function Home() {
  const { loginAsGuest, isLoading: isGuestLoading } = useAuth();
  const router = useRouter();

  const handleGuestLogin = async () => {
    await loginAsGuest();
    router.push('/admin');
  };

  return (
    <main className="grid lg:grid-cols-2 min-h-screen overflow-hidden">
        {/* Left Section: Hero */}
        <div className="relative hidden lg:flex flex-col items-start justify-center p-16 overflow-hidden bg-[#09090b]">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-grid-white bg-[size:32px_32px] animate-grid-move" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#09090b] via-transparent to-[#09090b]/50" />
            </div>

            <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left-8 duration-1000">
                <TimeWiseLogo className="mb-12" />
                
                <h2 className="text-6xl font-bold tracking-tight text-white font-headline leading-[1.1]">
                  Smarter Scheduling. <span className="text-primary">Zero Conflicts.</span> Full Control.
                </h2>
                
                <p className="text-xl text-white/60 mt-8 leading-relaxed max-w-lg">
                  The intelligent, engine-driven scheduling solution for modern educational institutions. Automate complex timetables in seconds.
                </p>

                <div className="grid grid-cols-2 gap-4 mt-16">
                    <StatCounter label="Active Faculty" value={150} icon={Users} />
                    <StatCounter label="Classes Scheduled" value={1240} icon={Calendar} delay={200} />
                    <StatCounter label="Rooms Optimized" value={85} icon={Building} delay={400} />
                    <div className="flex items-center gap-4 bg-primary/10 border border-primary/20 rounded-2xl p-4">
                        <div className="p-2 bg-primary/20 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-lg font-bold text-primary">100%</p>
                            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">Conflict Free</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Section: Login */}
        <div className="flex flex-col items-center justify-center p-6 bg-muted/30 relative">
            {/* Background elements for mobile */}
            <div className="lg:hidden absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-secondary/20" />
            
            <div className="lg:hidden mb-12">
                <TimeWiseLogo />
            </div>

            <Card className="w-full max-w-md border-none glass-card rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-700">
                <Tabs defaultValue="login" className="w-full">
                    <div className="px-8 pt-8 pb-4">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-12 rounded-xl">
                            <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Login</TabsTrigger>
                            <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Register</TabsTrigger>
                        </TabsList>
                    </div>

                    <CardContent className="px-8 pb-8 pt-4">
                        <TabsContent value="login" className="mt-0 space-y-4">
                            <div className="mb-6">
                                <CardTitle className="text-3xl font-bold font-headline">Welcome back</CardTitle>
                                <CardDescription className="mt-2 text-base">Access your portal to manage your schedule.</CardDescription>
                            </div>
                            <LoginForm />
                        </TabsContent>
                        <TabsContent value="register" className="mt-0 space-y-4">
                             <div className="mb-6">
                                <CardTitle className="text-3xl font-bold font-headline">Get started</CardTitle>
                                <CardDescription className="mt-2 text-base">Create a new administrator account for your institution.</CardDescription>
                            </div>
                            <RegisterForm />
                        </TabsContent>
                    </CardContent>
                </Tabs>

                <div className="relative px-8 pb-4">
                    <div className="absolute inset-x-8 top-0 flex items-center">
                        <span className="w-full border-t border-muted-foreground/10" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-transparent px-4 text-muted-foreground font-semibold tracking-widest">
                            Quick Access
                        </span>
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <Button 
                      variant="outline" 
                      onClick={handleGuestLogin} 
                      disabled={isGuestLoading} 
                      className="w-full h-12 rounded-xl border-muted-foreground/20 hover:bg-muted/50 transition-all font-medium"
                    >
                        {isGuestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
                        Explore as Demo Guest
                    </Button>
                </div>
            </Card>

            <p className="mt-8 text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
                Need help? Contact support@timewise.app or view our <Link href="#" className="text-primary hover:underline underline-offset-4 font-medium">Getting Started</Link> guide.
            </p>
        </div>
    </main>
  );
}

import Link from 'next/link';
