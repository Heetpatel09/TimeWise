
'use client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, Mail, PencilRuler, Trophy, Award, Warehouse, PlusSquare, UserCog, DollarSign, Home, FileText, CheckSquare, BarChart3, Loader2, ArrowRight, Building, KeyRound, Workflow, ShieldCheck, Dumbbell, Banknote, Bot, Lock, PieChart } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import type { Permission, Admin } from '@/lib/types';
import { getAdminDashboardStats } from '@/lib/services/admins';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const Section = ({ title, icon: Icon, children, isLocked, gridCols = "grid-cols-1 sm:grid-cols-2" }: { title: string, icon: React.ElementType, children: React.ReactNode, isLocked?: boolean, gridCols?: string }) => (
    <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
            <Icon className="h-5 w-5" />
            {title}
        </h2>
        <div className={cn("grid gap-4", gridCols)}>
            {children}
        </div>
    </div>
);


const ManagementCard = ({ href, title, icon: Icon, isLocked }: { href: string, title: string, icon: React.ElementType, isLocked?: boolean }) => {
    const content = (
         <Card className={cn(
            "group transition-all duration-300",
            isLocked 
            ? "cursor-not-allowed bg-muted/50" 
            : "hover:bg-primary/5 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
        )}>
            <CardContent className="p-4 flex items-center gap-4">
                 <div className={cn(
                    "rounded-lg p-3 transition-colors", 
                    isLocked ? "bg-muted" : "bg-primary/10 group-hover:bg-primary"
                 )}>
                    <Icon className={cn(
                        "h-6 w-6",
                        isLocked ? "text-muted-foreground" : "text-primary group-hover:text-primary-foreground"
                    )}/>
                </div>
                <span className={cn("font-semibold", isLocked && "text-muted-foreground")}>{title}</span>
                 {isLocked ? (
                    <Lock className="ml-auto h-4 w-4 text-muted-foreground" />
                ) : (
                    <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
            </CardContent>
        </Card>
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
    
    return <Link href={href} passHref className="w-full">{content}</Link>;
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
  { href: "/admin/departments", title: "Departments, Subjects & Faculty", icon: Building, permission: 'manage_classes' }, // Combined
  { href: "/admin/classrooms", title: "Classrooms", icon: Warehouse, permission: 'manage_classrooms' },
];

const adminLinks: { href: string, title: string, icon: React.ElementType, permission: Permission }[] = [
  { href: "/admin/fees", title: "Fees", icon: Banknote, permission: 'manage_fees' },
  { href: "/admin/hostels", title: "Hostels", icon: Home, permission: 'manage_hostels' },
  { href: "/admin/leave-requests", title: "Leave Requests", icon: Mail, permission: 'manage_requests' },
  { href: "/admin/schedule-requests", title: "Schedule Changes", icon: PencilRuler, permission: 'manage_requests' },
  { href: "/admin/new-slot-requests", title: "New Slot Requests", icon: PlusSquare, permission: 'manage_requests' },
];

const systemLinks = [
  { href: "/admin/admins", title: "Admins & Managers", icon: ShieldCheck },
  { href: "/admin/leaderboards", title: "Leaderboards", icon: Trophy },
  { href: "/admin/hall-of-fame", title: "Hall of Fame", icon: Award },
  { href: "/admin/api-test", title: "API Key Test", icon: KeyRound },
];

const StatCard = ({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ElementType, isLoading: boolean }) => {
    const Icon = icon;
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                 <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Loader2 className='h-6 w-6 animate-spin' /> : <div className="text-2xl font-bold">{value}</div>}
            </CardContent>
        </Card>
    )
}

function AdminDashboard() {
    const { user } = useAuth();
    
    const hasPermission = (permission: Permission) => {
        if (!user) return false;
        
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
    
    const studentCount = stats?.studentCount ?? 0;
    const facultyCount = stats?.facultyCount ?? 0;
    const classCount = stats?.classCount ?? 0;
    const subjectCount = stats?.subjectCount ?? 0;
    const scheduleCount = stats?.scheduleCount ?? 0;

    const chartData = [
        { name: "Students", value: studentCount, fill: "hsl(var(--chart-1))" },
        { name: "Faculty", value: facultyCount, fill: "hsl(var(--chart-2))" },
        { name: "Classes", value: classCount, fill: "hsl(var(--chart-3))" },
        { name: "Subjects", value: subjectCount, fill: "hsl(var(--chart-4))" },
        { name: "Scheduled", value: scheduleCount, fill: "hsl(var(--chart-5))" },
    ];

    const chartConfig: ChartConfig = {
        value: { label: "Total" },
        students: { label: "Students", color: "hsl(var(--chart-1))" },
        faculty: { label: "Faculty", color: "hsl(var(--chart-2))" },
        classes: { label: "Classes", color: "hsl(var(--chart-3))" },
        subjects: { label: "Subjects", color: "hsl(var(--chart-4))" },
        scheduled: { label: "Scheduled", color: "hsl(var(--chart-5))" },
    }

    return (
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
            <div className="xl:col-span-2 space-y-8">
                 <Section title="Academics" icon={Dumbbell} isLocked={!isFullAdmin && academicLinks.every(l => !hasPermission(l.permission))}>
                    {academicLinks.map(link => <ManagementCard key={link.href} {...link} isLocked={!hasPermission(link.permission)} />)}
                </Section>
                <Section title="Core Data" icon={School} isLocked={!isFullAdmin && coreDataLinks.every(l => !hasPermission(l.permission))}>
                    {coreDataLinks.map(link => <ManagementCard key={link.href} {...link} isLocked={!hasPermission(link.permission)} />)}
                </Section>
                <Section title="Administration & Requests" icon={Workflow} isLocked={!isFullAdmin && adminLinks.every(l => !hasPermission(l.permission))}>
                    {adminLinks.map(link => <ManagementCard key={link.href} {...link} isLocked={!hasPermission(link.permission)} />)}
                </Section>
                {isFullAdmin && (
                    <Section title="System & Engagement" icon={Trophy}>
                        {systemLinks.map(link => <ManagementCard key={link.href} {...link} />)}
                    </Section>
                )}
            </div>

            <div className="xl:col-span-1 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>University at a Glance</CardTitle>
                        <CardDescription>An overview of core university metrics.</CardDescription>
                    </CardHeader>
                    <CardContent className='grid grid-cols-2 gap-4'>
                        <StatCard title="Students" value={studentCount} icon={Users} isLoading={statsLoading} />
                        <StatCard title="Faculty" value={facultyCount} icon={UserCheck} isLoading={statsLoading} />
                        <StatCard title="Classes" value={classCount} icon={School} isLoading={statsLoading} />
                        <StatCard title="Subjects" value={subjectCount} icon={Book} isLoading={statsLoading} />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Data Distribution</CardTitle>
                         <CardDescription>A visual breakdown of key entities.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{ left: 10 }}>
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                        tickFormatter={(value) => value.slice(0, 10)}
                                    />
                                    <XAxis type="number" hide />
                                    <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                    <Bar dataKey="value" layout="vertical" radius={5} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
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
