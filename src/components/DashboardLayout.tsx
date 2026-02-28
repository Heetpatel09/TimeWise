
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
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Building,
  ShieldCheck,
  DollarSign,
  Activity,
  FileText
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import type { Notification, Admin, Permission } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { getNotificationsForUser, markNotificationAsRead } from '@/lib/services/notifications';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Role = 'admin' | 'faculty' | 'student';

function TimeWiseLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
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
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        if (user) {
            getNotificationsForUser(user.id).then(data => {
                setNotifications(data);
                setHasUnread(data.some(n => !n.isRead));
            });
        }
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id);
        if (user) {
            const updatedNotifications = await getNotificationsForUser(user.id);
            setNotifications(updatedNotifications);
            setHasUnread(updatedNotifications.some(n => !n.isRead));
        }
    }
    
    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => n.category === filter);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <Popover onOpenChange={(isOpen) => {
          if (isOpen && user) getNotificationsForUser(user.id).then(setNotifications);
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                    <Bell className={`h-5 w-5 ${hasUnread ? 'animate-bounce' : ''}`}/>
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 sm:w-96 p-0 overflow-hidden" align="end">
                <div className="p-4 border-b bg-muted/30">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">Notifications</h4>
                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                            {unreadCount} Unread
                        </Badge>
                    </div>
                </div>
                <div className="p-2 border-b bg-card">
                     <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-full h-8 text-xs border-none shadow-none focus:ring-0">
                            <SelectValue placeholder="Filter by category..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="requests">Requests</SelectItem>
                            <SelectItem value="exam_schedule">Exam Schedules</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                    {filteredNotifications.length > 0 ? (
                        <div className="divide-y">
                            {filteredNotifications.map(n => (
                                <div key={n.id} className={cn("p-4 transition-colors", !n.isRead && "bg-primary/5")}>
                                    <div className="flex gap-3">
                                        {!n.isRead && <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-snug">{n.message}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold">{new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            {!n.isRead && (
                                                <Button size="sm" variant="link" className="p-0 h-auto text-xs font-bold" onClick={() => handleMarkAsRead(n.id)}>
                                                    Mark as read
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <Bell className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                            <p className="text-sm text-muted-foreground">No notifications found.</p>
                        </div>
                    )}
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
        <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
           <Link href={`/${user.role}/profile`}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav({ role }: { role: Role }) {
    const pathname = usePathname();
    const { logout } = useAuth();
    const router = useRouter();

    const links = {
        admin: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/admin/schedule', label: 'Master Schedule', icon: Calendar },
            { href: '/admin/students', label: 'Students', icon: Users },
            { href: '/admin/departments', label: 'Departments', icon: Building },
            { href: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
            { href: '/admin/faculty-analysis', label: 'Faculty Analysis', icon: Activity },
            { href: '/admin/subscription', label: 'Billing', icon: DollarSign },
        ],
        faculty: [
            { href: '/faculty', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/faculty/assignments', label: 'Assignments', icon: ClipboardList },
            { href: '/faculty/profile', label: 'My Profile', icon: User },
        ],
        student: [
            { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
            { href: '/student/profile', label: 'My Profile', icon: User },
        ]
    };

    const activeLinks = links[role] || [];

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden h-9 w-9">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-6 text-left border-b bg-muted/20">
                    <SheetTitle>
                        <TimeWiseLogo />
                    </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col h-full">
                    <div className="flex-1 py-6 px-4 space-y-1">
                        {activeLinks.map((link) => (
                            <Link 
                                key={link.href} 
                                href={link.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                                    pathname === link.href 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <link.icon className="h-5 w-5" />
                                {link.label}
                            </Link>
                        ))}
                    </div>
                    <div className="p-4 border-t bg-muted/10">
                        <Button 
                            variant="ghost" 
                            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/5 rounded-xl h-12"
                            onClick={() => { logout(); router.push('/'); }}
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
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
  
  const internalUserRole = (user as Admin | null)?.role;

  const getRoleIcon = () => {
    if (!user) return null;
    const currentRole = internalUserRole || user.role;
    switch (currentRole) {
      case 'admin':
        return <UserCog className="h-4 w-4 mr-2" />;
      case 'manager':
        return <UserCheck className="h-4 w-4 mr-2" />;
      case 'faculty':
        return <UserCheck className="h-4 w-4 mr-2" />;
      case 'student':
        return <User className="h-4 w-4 mr-2" />;
    }
  };
  
  const getRoleName = () => {
      if (!user) return '';
      const currentRole = internalUserRole || user.role;
      return currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
  }
  
  if (!isClient || isLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <BrainCircuit className="h-12 w-12 text-primary animate-pulse" />
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Initializing Dashboard...</p>
          </div>
      </div>
    )
  }

  if (user.role !== role) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6 text-center">
          <div className="p-4 bg-destructive/10 rounded-full mb-6">
            <ShieldCheck className="h-12 w-12 text-destructive" />
          </div>
          <h1 className='text-3xl font-black font-headline tracking-tight mb-2'>Access Restricted</h1>
          <p className='text-muted-foreground max-w-sm mb-8'>You do not have the required permissions to access the {role} dashboard.</p>
          <Button onClick={() => router.push('/')} size="lg" className="rounded-xl px-8">Return to Identity Gate</Button>
      </div>
    )
  }

  return (
      <div className="relative flex flex-col h-screen bg-background overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
              <MobileNav role={role} />
              <TimeWiseLogo className="hidden sm:flex" />
              <div className="sm:hidden h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
            </div>
            
            <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
              <h1 className="text-lg font-bold font-headline tracking-tight text-foreground/90 uppercase">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <Badge variant="secondary" className="hidden lg:flex items-center h-8 rounded-full px-3 border-primary/10 bg-primary/5 text-primary font-bold text-[10px] uppercase tracking-wider">
                  {getRoleIcon()}
                  {getRoleName()}
              </Badge>
              <NotificationsBell />
              <div className="h-8 w-px bg-border mx-1 hidden sm:block" />
              <UserProfile />
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto scroll-smooth">
            <div className="container mx-auto p-4 md:p-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                {children}
            </div>
        </main>
      </div>
  );
}
