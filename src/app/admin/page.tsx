
'use client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, Mail, PencilRuler, Trophy, Award, Warehouse, PlusSquare, UserCog, DollarSign, Home, FileText, CheckSquare, BarChart3, Loader2, ChevronDown, ArrowRight, Building, KeyRound, Workflow, ShieldCheck, Dumbbell, Banknote, Bot, Lock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import type { Permission, Admin } from '@/lib/types';
import { getAdminDashboardStats } from '@/lib/services/admins';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const SectionCard = ({ title, icon: Icon, children, isLocked }: { title: string, icon: React.ElementType, children: React.ReactNode, isLocked?: boolean }) => (
    <Card className={cn(isLocked && "bg-muted/50")}>
        <CardHeader>
            <CardTitle className={cn("flex items-center gap-2 text-xl", isLocked && "text-muted-foreground")}>
                <Icon className="h-5 w-5" />
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {children}
        </CardContent>
    </Card>
);

const ManagementLink = ({ href, title, icon: Icon, isLocked }: { href: string, title: string, icon: React.ElementType, isLocked?: boolean }) => {
    const content = (
        <div className={cn("group flex items-center gap-3 rounded-lg p-3 transition-colors", isLocked ? "cursor-not-allowed" : "hover:bg-accent hover:text-accent-foreground")}>
            <div className={cn("rounded-lg bg-secondary p-2", !isLocked && "group-hover:bg-primary group-hover:text-primary-foreground")}>
                <Icon className={cn("h-5 w-5", isLocked ? "text-muted-foreground" : "")}/>
            </div>
            <span className={cn("font-semibold", isLocked && "text-muted-foreground")}>{title}</span>
            {isLocked ? (
                <Lock className="ml-auto h-4 w-4 text-muted-foreground" />
            ) : (
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
        </div>
    );
    
    if(isLocked) {
        return (
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger className="w-full text-left">{content}</TooltipTrigger>
                    <TooltipContent><p>You don't have permission to access this section.</p></TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }
    
    return <Link href={href} passHref>{content}</Link>;
};

const academicLinks: { href: string, title: string, icon: React.ElementType, permission: Permission }[] = [
  { href: "/admin/schedule", title: "Master Schedule", icon: Calendar, permission: 'manage_schedule' },
  { href: "/admin/timetable/generate", title: "Timetable Generator", icon: Bot, permission: 'manage_schedule' },
  { href: "/admin/exams", title: "Exams", icon: FileText, permission: 'manage_exams' },
  { href: "/admin/attendance", title: "Attendance", icon: CheckSquare, permission: 'manage_attendance' },
  { href: "/admin/results", title: "Results", icon: BarChart3, permission: 'manage_results' },
];

const coreDataLinks: { href: string, title: string, icon: React.ElementType, permission: Permission }[] = [
  { href: "/admin/students", title: "Students", icon: Users, permission: 'manage_students' },
  { href: "/admin/faculty", title: "Faculty", icon: UserCheck, permission: 'manage_faculty' },
  { href: "/admin/departments", title: "Departments & Subjects", icon: Building, permission: 'manage_classes' },
  { href: "/admin/classrooms", title: "Classrooms", icon: Warehouse, permission: 'manage_classrooms' },
];

const adminLinks: { href: string, title: string, icon: React.ElementType, permission: Permission }[] = [
  { href: "/admin/fees", title: "Fees", icon: Banknote, permission: 'manage_fees' },
  { href: "/admin/hostels", title: "Hostels", icon: Home, permission: 'manage_hostels' },
  { href: "/admin/leave-requests", title: "Leave Requests", icon: Mail, permission: 'manage_requests' },
  { href: "/admin/schedule-requests", title: "Schedule Changes", icon: PencilRuler, permission: 'manage_requests' },
  { href: "/admin/new-slot-requests", title: "New Slot Requests", icon: PlusSquare, permission: 'manage_requests' },
];

// System links are generally admin-only
const systemLinks = [
  { href: "/admin/admins", title: "Admins & Managers", icon: ShieldCheck },
  { href: "/admin/leaderboards", title: "Leaderboards", icon: Trophy },
  { href: "/admin/hall-of-fame", title: "Hall of Fame", icon: Award },
  { href: "/admin/api-test", title: "API Key Test", icon: KeyRound },
];

const StatItem = ({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ElementType, isLoading: boolean }) => {
    const Icon = icon;
    return (
        <div className="flex items-center">
            <div className="p-3 rounded-lg bg-secondary">
                 <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
                 {isLoading ? <Loader2 className='h-6 w-6 animate-spin' /> : <div className="text-2xl font-bold">{value}</div>}
                 <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </div>
    )
}

function AdminDashboard() {
    const { user } = useAuth();
    
    const hasPermission = (permission: Permission) => {
        if (!user) return false;
        
        // This is the key change to correctly check permissions for admins/managers
        const adminDetails = user as Admin;
        if (!adminDetails.permissions || !Array.isArray(adminDetails.permissions)) {
             return false;
        }

        return adminDetails.permissions.includes('*') || adminDetails.permissions.includes(permission);
    }

    const isFullAdmin = hasPermission('*');

    const { data: stats, isLoading: statsLoading } = useQuery({ 
      queryKey: ['adminDashboardStats'], 
      queryFn: getAdminDashboardStats 
    });
    const [isChartOpen, setIsChartOpen] = useState(false);
    
    const studentCount = stats?.studentCount ?? 0;
    const facultyCount = stats?.facultyCount ?? 0;
    const classCount = stats?.classCount ?? 0;
    const subjectCount = stats?.subjectCount ?? 0;
    const classroomCount = stats?.classroomCount ?? 0;
    const hostelCount = stats?.hostelCount ?? 0;
    const scheduleCount = stats?.scheduleCount ?? 0;

    const chartData = [
        { year: "Two Years Ago", students: Math.floor(studentCount * 0.8), faculty: Math.floor(facultyCount * 0.75), classes: Math.floor(classCount * 0.8), subjects: Math.floor(subjectCount * 0.85), classrooms: Math.floor(classroomCount * 0.7), hostels: Math.floor(hostelCount * 0.6) },
        { year: "Last Year", students: Math.floor(studentCount * 0.9), faculty: Math.floor(facultyCount * 0.85), classes: Math.floor(classCount * 0.9), subjects: Math.floor(subjectCount * 0.9), classrooms: Math.floor(classroomCount * 0.85), hostels: Math.floor(hostelCount * 0.8) },
        { year: "This Year", students: studentCount, faculty: facultyCount, classes: classCount, subjects: subjectCount, classrooms: classroomCount, hostels: hostelCount },
    ];

    const chartConfig: ChartConfig = {
        students: { label: "Students", color: "hsl(var(--chart-1))" },
        faculty: { label: "Faculty", color: "hsl(var(--chart-2))" },
        classes: { label: "Classes", color: "hsl(var(--chart-3))" },
        subjects: { label: "Subjects", color: "hsl(var(--chart-4))" },
        classrooms: { label: "Classrooms", color: "hsl(var(--chart-5))" },
        hostels: { label: "Hostels", color: "hsl(var(--primary))" },
    }

    return (
        <div className='space-y-6'>
            <Collapsible open={isChartOpen} onOpenChange={setIsChartOpen}>
                 <div className="grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>University Stats</CardTitle>
                            <CardDescription>An overview of the core university data.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
                            <StatItem title="Total Students" value={studentCount} icon={Users} isLoading={statsLoading} />
                            <StatItem title="Total Faculty" value={facultyCount} icon={UserCheck} isLoading={statsLoading} />
                            <StatItem title="Total Classes" value={classCount} icon={School} isLoading={statsLoading} />
                            <StatItem title="Total Subjects" value={subjectCount} icon={Book} isLoading={statsLoading} />
                            <StatItem title="Total Classrooms" value={classroomCount} icon={Warehouse} isLoading={statsLoading} />
                            <StatItem title="Total Hostels" value={hostelCount} icon={Home} isLoading={statsLoading} />
                            <StatItem title="Scheduled Slots" value={scheduleCount} icon={Calendar} isLoading={statsLoading} />
                        </CardContent>
                        <CardFooter>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost">
                                    {isChartOpen ? 'Hide' : 'View'} Growth Report
                                    <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isChartOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        </CardFooter>
                    </Card>
                    <CollapsibleContent>
                        <Card>
                            <CardHeader>
                                <CardTitle>Growth Overview</CardTitle>
                                <CardDescription>Key metrics over the last 3 years.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                                            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
                                            <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false}/>
                                            <RechartsTooltip
                                                cursor={false}
                                                content={<ChartTooltipContent indicator="dot" />}
                                            />
                                            <Bar dataKey="students" fill="var(--color-students)" radius={4} />
                                            <Bar dataKey="faculty" fill="var(--color-faculty)" radius={4} />
                                            <Bar dataKey="classes" fill="var(--color-classes)" radius={4} />
                                            <Bar dataKey="subjects" fill="var(--color-subjects)" radius={4} />
                                            <Bar dataKey="classrooms" fill="var(--color-classrooms)" radius={4} />
                                            <Bar dataKey="hostels" fill="var(--color-hostels)" radius={4} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </CollapsibleContent>
                 </div>
            </Collapsible>

             <div className="space-y-6">
                <SectionCard title="Academics" icon={Dumbbell} isLocked={!isFullAdmin && academicLinks.every(l => !hasPermission(l.permission))}>
                    {academicLinks.map(link => <ManagementLink key={link.href} {...link} isLocked={!hasPermission(link.permission)} />)}
                </SectionCard>
                <SectionCard title="Core Data" icon={School} isLocked={!isFullAdmin && coreDataLinks.every(l => !hasPermission(l.permission))}>
                    {coreDataLinks.map(link => <ManagementLink key={link.href} {...link} isLocked={!hasPermission(link.permission)} />)}
                </SectionCard>
                <SectionCard title="Administration & Requests" icon={Workflow} isLocked={!isFullAdmin && adminLinks.every(l => !hasPermission(l.permission))}>
                    {adminLinks.map(link => <ManagementLink key={link.href} {...link} isLocked={!hasPermission(link.permission)} />)}
                </SectionCard>
                {isFullAdmin && (
                    <SectionCard title="System & Engagement" icon={Trophy}>
                        {systemLinks.map(link => <ManagementLink key={link.href} {...link} />)}
                    </SectionCard>
                )}
             </div>
        </div>
    )
}

export default function AdminPage() {
    return (
        <DashboardLayout pageTitle='Admin Dashboard' role="admin">
            <AdminDashboard />
        </DashboardLayout>
    );
}
