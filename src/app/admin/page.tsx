
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
    Book, 
    Calendar, 
    School, 
    UserCheck, 
    Users, 
    Mail, 
    Trophy, 
    Award, 
    Warehouse, 
    PlusSquare, 
    ShieldCheck, 
    DollarSign, 
    Home, 
    FileText, 
    CheckSquare, 
    BarChart3, 
    Loader2, 
    ArrowRight, 
    Building, 
    KeyRound, 
    Workflow, 
    Dumbbell, 
    Banknote, 
    Bot, 
    AlertTriangle,
    Activity,
    ClipboardList
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getAdminDashboardStats } from '@/lib/services/admins';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getLeaveRequests } from '@/lib/services/leave';
import { getNewSlotRequests } from '@/lib/services/new-slot-requests';

// --- Components ---

const SummaryStat = ({ title, value, icon: Icon, colorClass, isLoading }: { title: string, value: string | number, icon: any, colorClass: string, isLoading: boolean }) => (
    <Card className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4 flex items-center justify-between">
            <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mt-1 text-muted-foreground" />
                ) : (
                    <h3 className="text-2xl font-bold mt-0.5">{value}</h3>
                )}
            </div>
            <div className={cn("p-2.5 rounded-xl", colorClass)}>
                <Icon className="h-5 w-5" />
            </div>
        </CardContent>
    </Card>
);

const FeatureCard = ({ href, title, icon: Icon, description }: { href: string, title: string, icon: any, description?: string }) => (
    <Link href={href} className="block group">
        <Card className="h-full border-muted/60 transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:-translate-y-1 rounded-2xl overflow-hidden">
            <CardContent className="p-4 flex items-start gap-4">
                <div className="rounded-xl p-2.5 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                    <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">{title}</h4>
                    {description && <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{description}</p>}
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground/40 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
            </CardContent>
        </Card>
    </Link>
);

const DashboardSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-3">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {children}
        </div>
    </div>
);

// --- Main Page ---

export default function AdminPage() {
    const { data: stats, isLoading: statsLoading } = useQuery({ 
        queryKey: ['adminDashboardStats'], 
        queryFn: getAdminDashboardStats 
    });

    const { data: facultyList = [], isLoading: facultyLoading } = useQuery({ 
        queryKey: ['faculty'], 
        queryFn: getFaculty 
    });

    const { data: schedule = [], isLoading: scheduleLoading } = useQuery({ 
        queryKey: ['schedule'], 
        queryFn: getSchedule 
    });

    const { data: leaveRequests = [], isLoading: leaveLoading } = useQuery({ 
        queryKey: ['leaveRequests'], 
        queryFn: getLeaveRequests 
    });

    const { data: slotRequests = [], isLoading: slotsLoading } = useQuery({ 
        queryKey: ['newSlotRequests'], 
        queryFn: getNewSlotRequests 
    });

    const isDataLoading = statsLoading || facultyLoading || scheduleLoading || leaveLoading || slotsLoading;

    // --- Derived Stats ---
    
    const overloadedCount = useMemo(() => {
        if (!facultyList.length || !schedule.length) return 0;
        const hoursMap = new Map<string, number>();
        schedule.forEach(s => {
            if (s.subjectId !== 'LIB001') {
                hoursMap.set(s.facultyId, (hoursMap.get(s.facultyId) || 0) + 1);
            }
        });
        return facultyList.filter(f => (hoursMap.get(f.id) || 0) > (f.maxWeeklyHours || 18)).length;
    }, [facultyList, schedule]);

    const pendingRequestsCount = useMemo(() => {
        const pLeaves = leaveRequests.filter(r => r.status === 'pending').length;
        const pSlots = slotRequests.filter(r => r.status === 'pending').length;
        return pLeaves + pSlots;
    }, [leaveRequests, slotRequests]);

    return (
        <DashboardLayout pageTitle="Admin Control Panel" role="admin">
            <div className="flex flex-col gap-8 flex-grow">
                
                {/* --- Summary Bar --- */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <SummaryStat 
                        title="Total Faculty" 
                        value={stats?.facultyCount ?? 0} 
                        icon={UserCheck} 
                        colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Students" 
                        value={stats?.studentCount ?? 0} 
                        icon={Users} 
                        colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Active Classes" 
                        value={stats?.classCount ?? 0} 
                        icon={School} 
                        colorClass="bg-green-500/10 text-green-600 dark:text-green-400" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Overloaded" 
                        value={overloadedCount} 
                        icon={AlertTriangle} 
                        colorClass="bg-orange-500/10 text-orange-600 dark:text-orange-400" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Pending Req." 
                        value={pendingRequestsCount} 
                        icon={Activity} 
                        colorClass="bg-red-500/10 text-red-600 dark:text-red-400" 
                        isLoading={isDataLoading}
                    />
                </div>

                {/* --- Categorized Features --- */}
                <div className="space-y-10">
                    
                    <DashboardSection title="Academics">
                        <FeatureCard 
                            href="/admin/schedule" 
                            title="Master Schedule" 
                            icon={Calendar} 
                            description="View and manually edit slots"
                        />
                        <FeatureCard 
                            href="/admin/timetable/generate" 
                            title="Timetable Gen" 
                            icon={Bot} 
                            description="AI-powered engine"
                        />
                        <FeatureCard 
                            href="/admin/teacher-allocation" 
                            title="Teacher AI" 
                            icon={Workflow} 
                            description="Smart workload distribution"
                        />
                        <FeatureCard 
                            href="/admin/exams" 
                            title="Exams" 
                            icon={FileText} 
                            description="Schedule and seating plans"
                        />
                        <FeatureCard 
                            href="/admin/attendance" 
                            title="Attendance" 
                            icon={CheckSquare} 
                            description="Review and lock logs"
                        />
                        <FeatureCard 
                            href="/admin/results" 
                            title="Results" 
                            icon={BarChart3} 
                            description="Manage student marksheets"
                        />
                    </DashboardSection>

                    <DashboardSection title="Analytics">
                        <FeatureCard 
                            href="/admin/faculty-analysis" 
                            title="Faculty Analysis" 
                            icon={Activity} 
                            description="Heatmaps and load balancing"
                        />
                        <FeatureCard 
                            href="/admin/leaderboards" 
                            title="Leaderboards" 
                            icon={Trophy} 
                            description="Rankings and points"
                        />
                    </DashboardSection>

                    <DashboardSection title="Core Data">
                        <FeatureCard 
                            href="/admin/students" 
                            title="Students" 
                            icon={Users} 
                            description="Profile management"
                        />
                        <FeatureCard 
                            href="/admin/departments" 
                            title="Departments" 
                            icon={Building} 
                            description="Faculty and subject setup"
                        />
                        <FeatureCard 
                            href="/admin/classrooms" 
                            title="Classrooms" 
                            icon={Warehouse} 
                            description="Maintenance and capacity"
                        />
                    </DashboardSection>

                    <DashboardSection title="Administration">
                        <FeatureCard 
                            href="/admin/fees" 
                            title="Fees" 
                            icon={Banknote} 
                            description="Invoices and payments"
                        />
                        <FeatureCard 
                            href="/admin/hostels" 
                            title="Hostels" 
                            icon={Home} 
                            description="Room assignments"
                        />
                        <FeatureCard 
                            href="/admin/leave-requests" 
                            title="Leave Requests" 
                            icon={Mail} 
                            description="Approve and reassign substitute"
                        />
                        <FeatureCard 
                            href="/admin/new-slot-requests" 
                            title="Slot Requests" 
                            icon={PlusSquare} 
                            description="New class requests"
                        />
                    </DashboardSection>

                    <DashboardSection title="System">
                        <FeatureCard 
                            href="/admin/admins" 
                            title="Permissions" 
                            icon={ShieldCheck} 
                            description="Manage managers and roles"
                        />
                        <FeatureCard 
                            href="/admin/subscription" 
                            title="Billing" 
                            icon={DollarSign} 
                            description="Credits and plans"
                        />
                        <FeatureCard 
                            href="/admin/hall-of-fame" 
                            title="Hall of Fame" 
                            icon={Award} 
                            description="Dedication champions"
                        />
                        <FeatureCard 
                            href="/admin/api-test" 
                            title="System Check" 
                            icon={KeyRound} 
                            description="API and engine diagnostics"
                        />
                    </DashboardSection>

                </div>
            </div>
        </DashboardLayout>
    );
}
