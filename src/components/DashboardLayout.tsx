'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

const navItems = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    // The sub-pages for admin are managed by tabs on the dashboard, so we can remove them from nav to avoid confusion.
    // { href: '/admin/subjects', label: 'Subjects', icon: Book },
    // { href: '/admin/classes', label: 'Classes', icon: School },
    // { href: '/admin/faculty', label: 'Faculty', icon: UserCheck },
    // { href: '/admin/students', label: 'Students', icon: Users },
    // { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
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
          <Clock className="absolute w-1/2 h-1/2 text-red-500 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      {state === 'expanded' && (
        <span className="text-xl font-bold text-primary-foreground font-headline">CodeBlooded</span>
      )}
    </Link>
  );
}

function UserProfile({ role }: { role: Role }) {
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  const user = {
    name: `${roleName} User`,
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
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
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
  const items = navItems[role];

  const adminTabs = [
      { href: '/admin', tab: 'subjects', label: 'Subjects', icon: Book },
      { href: '/admin', tab: 'classes', label: 'Classes', icon: School },
      { href: '/admin', tab: 'faculty', label: 'Faculty', icon: UserCheck },
      { href: '/admin', tab: 'students', label: 'Students', icon: Users },
      { href: '/admin', tab: 'schedule', label: 'Schedule', icon: Calendar },
  ]

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === item.href && role !== 'admin'}
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
      })}
       {role === 'admin' && adminTabs.map((item) => {
         const Icon = item.icon;
         return (
          <SidebarMenuItem key={item.tab}>
             <Link href={`${item.href}?tab=${item.tab}`} legacyBehavior passHref>
               <SidebarMenuButton
                 isActive={pathname === item.href && new URLSearchParams(window.location.search).get('tab') === item.tab}
                 tooltip={item.label}
               >
                 <Icon />
                 <span>{item.label}</span>
               </SidebarMenuButton>
             </Link>
           </SidebarMenuItem>
         )
       })}
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
                <SidebarMenuButton tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col min-h-screen">
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-muted/40">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
