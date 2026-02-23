'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LogIn, Loader2, UserPlus, BrainCircuit, Eye, EyeOff, Contact, CheckCircle2, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { registerAdmin } from '@/lib/services/auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// --- Internal Components ---

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
          isFloating && "-translate-y-7 scale-90 text-primary font-semibold"
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

function StatPill({ label, value, icon: Icon }: { label: string, value: string, icon: any }) {
  return (
    <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 transition-all hover:bg-white/10 shadow-sm">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-bold text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">{label}</span>
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
      <Button type="submit" className="w-full h-12 bg-gradient-primary text-white font-semibold text-lg rounded-xl shadow-lg" disabled={isLoading}>
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
      <Button type="submit" className="w-full h-12 bg-gradient-primary text-white font-semibold text-lg rounded-xl shadow-lg" disabled={isLoading}>
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
    <main className="grid lg:grid-cols-2 min-h-screen overflow-hidden bg-background">
        {/* Left Section: Branding & Stats */}
        <div className="relative hidden lg:flex flex-col items-start justify-center p-20 overflow-hidden bg-[#09090b]">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute inset-0 bg-grid-white bg-[size:32px_32px] animate-grid-move" />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#09090b] via-transparent to-primary/10" />
            </div>

            <div className="relative z-10 max-w-xl animate-in fade-in slide-in-from-left-8 duration-1000">
                <div className="flex items-center gap-3 mb-12">
                  <div className="p-2.5 bg-primary/20 rounded-2xl shadow-inner">
                    <BrainCircuit className="w-12 h-12 text-primary" />
                  </div>
                  <h1 className="text-7xl font-black tracking-[-0.02em] font-headline text-white uppercase italic">
                    TIMEWISE
                  </h1>
                </div>
                
                <h2 className="text-5xl font-extrabold tracking-tight text-white font-headline leading-[1.1] mb-6">
                  Scheduling logic, <br/>
                  <span className="text-primary italic">reimagined.</span>
                </h2>
                
                <p className="text-xl text-white/60 leading-relaxed font-medium mb-12">
                  Automate institution-wide timetables with a deterministic engine.
                </p>

                <div className="flex flex-wrap gap-4 mt-8">
                    <StatPill label="Faculty" value="150+" icon={Users} />
                    <StatPill label="Classes" value="1,200+" icon={Calendar} />
                    <StatPill label="Conflict Free" value="100%" icon={CheckCircle2} />
                </div>
            </div>
        </div>

        {/* Right Section: Centered Login Card */}
        <div className="flex flex-col items-center justify-center p-6 relative bg-muted/10">
            {/* Mobile Background Elements */}
            <div className="lg:hidden absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-background to-secondary/10" />
            
            <div className="lg:hidden mb-12 flex items-center gap-3 animate-in fade-in duration-700">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <BrainCircuit className="w-8 h-8 text-primary" />
                </div>
                <span className="text-3xl font-black tracking-tighter text-foreground uppercase italic">TIMEWISE</span>
            </div>

            <Card className="w-full max-w-md border-none glass-card rounded-[24px] overflow-hidden animate-in fade-in zoom-in-95 duration-1000 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)]">
                <Tabs defaultValue="login" className="w-full">
                    <div className="px-8 pt-10 pb-4">
                        <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 h-12 rounded-xl">
                            <TabsTrigger value="login" className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Login</TabsTrigger>
                            <TabsTrigger value="register" className="rounded-lg font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Register</TabsTrigger>
                        </TabsList>
                    </div>

                    <CardContent className="px-10 pb-8 pt-4">
                        <TabsContent value="login" className="mt-0 space-y-6">
                            <div className="space-y-1">
                                <CardTitle className="text-3xl font-bold font-headline tracking-tight">Welcome back</CardTitle>
                                <CardDescription className="text-base font-medium">Access your institutional control panel.</CardDescription>
                            </div>
                            <LoginForm />
                        </TabsContent>
                        <TabsContent value="register" className="mt-0 space-y-6">
                             <div className="space-y-1">
                                <CardTitle className="text-3xl font-bold font-headline tracking-tight">Get started</CardTitle>
                                <CardDescription className="text-base font-medium">Onboard your institution to the platform.</CardDescription>
                            </div>
                            <RegisterForm />
                        </TabsContent>
                    </CardContent>
                </Tabs>

                <div className="relative px-10 py-2">
                    <div className="absolute inset-x-10 top-1/2 flex items-center">
                        <span className="w-full border-t border-muted-foreground/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-white/50 dark:bg-black/20 backdrop-blur-sm px-4 text-muted-foreground font-black tracking-[0.2em]">
                            Quick Access
                        </span>
                    </div>
                </div>

                <div className="px-10 pb-10 pt-6">
                    <Button 
                      variant="outline" 
                      onClick={handleGuestLogin} 
                      disabled={isGuestLoading} 
                      className="w-full h-12 rounded-xl border-muted-foreground/20 hover:bg-muted/50 transition-all font-bold text-sm shadow-sm"
                    >
                        {isGuestLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Contact className="mr-2 h-4 w-4" />}
                        Explore as Demo Guest
                    </Button>
                </div>
            </Card>

            <p className="mt-10 text-xs text-muted-foreground text-center max-w-xs leading-relaxed font-bold uppercase tracking-wider opacity-60">
                Need technical assistance? <br/>
                <Link href="#" className="text-primary hover:underline underline-offset-4 decoration-2">support@timewise.app</Link>
            </p>
        </div>
    </main>
  );
}
