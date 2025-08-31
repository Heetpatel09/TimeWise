
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Monitor, Clock, LogIn, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';


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
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = await login(userId, password);
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
    <main className="flex flex-col items-center justify-center min-h-screen bg-transparent p-4">
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full text-center">
        <CodeBloodedLogo />
        <p className="mt-6 text-lg md:text-xl max-w-2xl text-muted-foreground">
            The intelligent, AI-powered solution for effortless academic scheduling.
        </p>

        <Card className="mt-10 w-full max-w-sm bg-card/80 backdrop-blur-lg border-primary/20">
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Login</CardTitle>
            <CardDescription>Enter your credentials to access your portal.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="e.g., admin, FAC001, STU001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-5 w-5" />}
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
