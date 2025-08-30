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
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';

const navItems = {
  admin: [
    { href: '/admin', label: 'Dashboard', icon: LayoutGrid },
    { href: '/admin/subjects', label: 'Subjects', icon: Book },
    { href: '/admin/classes', label: 'Classes', icon: School },
    { href: '/admin/faculty', label: 'Faculty', icon: UserCheck },
    { href: '/admin/students', label: 'Students', icon: Users },
    { href: '/admin/schedule', label: 'Schedule', icon: Calendar },
  ],
  faculty: [
    { href: '/faculty', label: 'My Schedule', icon: Calendar },
  ],
  student: [
    { href: '/student', label: 'My Timetable', icon: Calendar },
  ],
};

type Role = 'admin' | 'faculty' | 'student';

function TimewiseLogo() {
  const { state } = useSidebar();
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg
        className="w-8 h-8 text-primary"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2L2 7V17L12 22L22 17V7L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12L22 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12V22"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 12L2 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 4.5L17 9.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {state === 'expanded' && (
        <span className="text-xl font-bold text-primary font-headline">TimeWise</span>
      )}
    </Link>
  );
}

function UserProfile({ role }: { role: Role }) {
  const roleName = role.charAt(0).toUpperCase() + role.slice(1);
  const user = {
    name: `${roleName} User`,
    email: `${role}@timewise.app`,
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

  return (
    <SidebarMenu>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        );
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
          <TimewiseLogo />
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
            <h1 className="text-2xl font-semibold ml-4">{pageTitle}</h1>
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
