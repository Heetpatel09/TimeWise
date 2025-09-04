
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from './ui/button';
import {
  User,
  LogOut,
  Settings,
  UserCog,
  UserCheck,
  Loader2,
  Bell,
  BrainCircuit,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import type { Notification } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { getNotificationsForUser, markNotificationAsRead } from '@/lib/services/notifications';


type Role = 'admin' | 'faculty' | 'student';

function TimeWiseLogo() {
  return (
    <Link href="/" className="flex items-center gap-2">
       <div className="relative w-8 h-8">
          <BrainCircuit className="w-full h-full text-primary" />
      </div>
      <span className="text-xl font-bold text-primary font-headline">TimeWise</span>
    </Link>
  );
}

function NotificationsBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [hasUnread, setHasUnread] = useState(false);

    useEffect(() => {
        if (user) {
            getNotificationsForUser(user.id).then(data => {
                setNotifications(data);
                setHasUnread(data.some(n => !n.isRead));
            });
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        if (user) {
            const updatedNotifications = await getNotificationsForUser(user.id);
            setNotifications(updatedNotifications);
            setHasUnread(updatedNotifications.some(n => !n.isRead));
        }
    }
    
    return (
        <Popover onOpenChange={(isOpen) => {
          if (isOpen && user) getNotificationsForUser(user.id).then(setNotifications);
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className={`h-5 w-5 ${hasUnread ? 'animation-shake' : ''}`}/>
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                            {unreadCount > 0 ? `You have ${unreadCount} unread messages.` : 'No new messages.'}
                        </p>
                    </div>
                    <div className="grid gap-2">
                        {notifications.length > 0 ? notifications.map(n => (
                             <div
                                key={n.id}
                                className="grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0 animate-in fade-in-0"
                            >
                                <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
                                <div className="grid gap-1">
                                    <p className="text-sm font-medium">{n.message}</p>
                                    <p className="text-sm text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        )) : (
                            <p className='text-sm text-muted-foreground'>You're all caught up.</p>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}

function UserProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/');
  }

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full transition-transform hover:scale-110">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
           <Link href={`/${user.role}/profile`}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function DashboardLayout({
  children,
  pageTitle,
  role,
}: {
  children: React.ReactNode;
  pageTitle: string;
  role: Role;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!isLoading && !user) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  const getRoleIcon = () => {
    if (!user) return null;
    switch (user.role) {
      case 'admin':
        return <UserCog className="h-5 w-5 mr-2 text-primary" />;
      case 'faculty':
        return <UserCheck className="h-5 w-5 mr-2 text-primary" />;
      case 'student':
        return <User className="h-5 w-5 mr-2 text-primary" />;
    }
  };
  
  if (!isClient || isLoading || !user) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-10 h-10 animate-spin" />
        </div>
    )
  }

  if (user.role !== role) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
            <h1 className='text-2xl font-bold'>Access Denied</h1>
            <p className='text-muted-foreground'>You do not have permission to view this page.</p>
            <Button onClick={() => router.push('/')} className="mt-4">Go to Login</Button>
        </div>
    )
  }

  return (
      <div className="flex flex-col min-h-screen bg-background/80 backdrop-blur-sm">
        <header className="sticky top-0 z-50 flex items-center justify-between p-4 border-b bg-card shadow-sm">
          <div className="flex items-center gap-4">
             <TimeWiseLogo />
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link href={`/${role}`} className="hidden md:block">
              <h1 className="text-xl font-semibold font-headline hover:text-primary transition-colors">{pageTitle}</h1>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="hidden sm:flex items-center text-sm">
                {getRoleIcon()}
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
            <NotificationsBell />
            <UserProfile />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-transparent animate-in fade-in-0 duration-500">
            {children}
        </main>
      </div>
  );
}
