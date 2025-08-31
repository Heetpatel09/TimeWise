
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import {
  User,
  LogOut,
  Settings,
  UserCog,
  UserCheck,
  Book,
  School,
  Users,
  Calendar,
  LayoutGrid,
  Monitor,
  Clock,
  Mail,
  PencilRuler,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import type { User as UserType, LeaveRequest } from '@/lib/types';
import { getLeaveRequests } from '@/lib/services/leave';
import { getScheduleChangeRequests } from '@/lib/services/schedule-changes';

const navItems = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
  ],
  faculty: [
    { href: '/faculty', label: 'My Schedule', icon: Calendar },
  ],
  student: [
    { href: '/student', label: 'My Timetable', icon: Calendar },
  ],
};

type Role = 'admin' | 'faculty' | 'student';

function CodeBloodedLogo() {
  const { state } = useSidebar();
  return (
    <Link href="/" className="flex items-center gap-2">
       <div className="relative w-8 h-8">
          <Monitor className="w-full h-full text-primary" />
          <Clock className="absolute w-1/2 h-1/2 text-destructive top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse [animation-duration:1.5s]" />
      </div>
      {state === 'expanded' && (
        <span className="text-xl font-bold text-primary-foreground font-headline">CodeBlooded</span>
      )}
    </Link>
  );
}

function UserProfile({ role }: { role: Role }) {
  const user: UserType = {
    name: `${role.charAt(0).toUpperCase() + role.slice(1)} User`,
    email: `${role}@codeblooded.app`,
    avatar: `https://avatar.vercel.sh/${role}.png`,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
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
           <Link href={`/${role}/profile`}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Nav({ role }: { role: Role }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = React.useState(false);
  const [pendingLeaveRequestsCount, setPendingLeaveRequestsCount] = useState<number | null>(null);
  const [pendingScheduleRequestsCount, setPendingScheduleRequestsCount] = useState<number | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    if (role === 'admin') {
      getLeaveRequests().then(requests => {
        setPendingLeaveRequestsCount(requests.filter(r => r.status === 'pending').length);
      });
      getScheduleChangeRequests().then(requests => {
        setPendingScheduleRequestsCount(requests.filter(r => r.status === 'pending').length);
      })
    }
  }, [role]);

  if (!isClient) {
    return null; // Don't render on the server to avoid hydration mismatch
  }

  const items = navItems[role];
  
  const adminTabs = [
      { href: '/admin?tab=subjects', label: 'Subjects', icon: Book, tab: 'subjects' },
      { href: '/admin?tab=classes', label: 'Classes', icon: School, tab: 'classes' },
      { href: '/admin?tab=faculty', label: 'Faculty', icon: UserCheck, tab: 'faculty' },
      { href: '/admin?tab=students', label: 'Students', icon: Users, tab: 'students' },
      { href: '/admin?tab=schedule', label: 'Schedule', icon: Calendar, tab: 'schedule' },
      { href: '/admin?tab=leave-requests', label: 'Leave Requests', icon: Mail, tab: 'leave-requests', badge: pendingLeaveRequestsCount },
      { href: '/admin?tab=schedule-requests', label: 'Schedule Requests', icon: PencilRuler, tab: 'schedule-requests', badge: pendingScheduleRequestsCount },
  ]
  const isActive = (item: {href: string, tab?: string}) => {
    if (item.href.includes('?tab=')) {
        const currentTab = searchParams.get('tab');
        return currentTab === item.tab;
    }
     if (pathname.startsWith('/admin') && item.href === '/admin') {
        return !searchParams.get('tab');
     }
    return pathname === item.href;
  }

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
             <Link href={item.href}>
              <SidebarMenuButton
                isActive={isActive(item)}
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
             </Link>
          </SidebarMenuItem>
        );
      })}
       {role === 'admin' && <SidebarSeparator />}
       {role === 'admin' && (
         <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {adminTabs.map((item) => {
                        const Icon = item.icon;
                        return (
                        <SidebarMenuItem key={item.tab}>
                            <Link href={item.href}>
                            <SidebarMenuButton
                                isActive={isActive(item)}
                                tooltip={item.label}
                                size="sm"
                            >
                                <Icon />
                                <span>{item.label}</span>
                                {item.badge !== null && item.badge > 0 && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                                {item.badge === null && <Loader2 className='absolute right-2 top-1.5 h-4 w-4 animate-spin' />}
                            </SidebarMenuButton>
                            </Link>
                        </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
       )}
    </SidebarMenu>
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
  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <UserCog className="h-5 w-5 mr-2 text-primary" />;
      case 'faculty':
        return <UserCheck className="h-5 w-5 mr-2 text-primary" />;
      case 'student':
        return <User className="h-5 w-5 mr-2 text-primary" />;
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <CodeBloodedLogo />
        </SidebarHeader>
        <SidebarContent>
          <Nav role={role} />
        </SidebarContent>
        <SidebarFooter>
            <SidebarMenu>
                <SidebarMenuItem>
                    <Link href={`/${role}/profile`}>
                        <SidebarMenuButton tooltip="Settings">
                        <Settings />
                        <span>Settings</span>
                        </SidebarMenuButton>
                    </Link>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen bg-transparent">
        <header className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-semibold ml-4 font-headline">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center text-sm">
                {getRoleIcon()}
                {role.charAt(0).toUpperCase() + role.slice(1)}
            </Badge>
            <UserProfile role={role} />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-transparent">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
