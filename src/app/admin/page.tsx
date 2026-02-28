
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
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
    Bot, 
    AlertTriangle,
    Activity
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from '@/lib/utils';
import { getAdminDashboardStats } from '@/lib/services/admins';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getLeaveRequests } from '@/lib/services/leave';
import { getNewSlotRequests } from '@/lib/services/new-slot-requests';

// --- Components ---

const SummaryStat = ({ title, value, icon: Icon, colorClass, isLoading }: { title: string, value: string | number, icon: any, colorClass: string, isLoading: boolean }) => (
    <Card className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm transition-all hover:bg-card">
        <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">{title}</p>
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mt-1 text-primary/40" />
                ) : (
                    <h3 className="text-xl md:text-2xl font-black mt-0.5 tracking-tight">{value}</h3>
                )}
            </div>
            <div className={cn("p-2.5 rounded-xl shrink-0 ml-3", colorClass)}>
                <Icon className="h-5 w-5" />
            </div>
        </CardContent>
    </Card>
);

const FeatureCard = ({ href, title, icon: Icon, description }: { href: string, title: string, icon: any, description?: string }) => (
    <Link href={href} className="block group">
        <Card className="h-full border-muted/60 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-1 rounded-2xl overflow-hidden bg-card/40">
            <CardContent className="p-4 flex items-start gap-4">
                <div className="rounded-xl p-2.5 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-inner">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-0.5 flex-1">
                    <h4 className="font-bold text-sm group-hover:text-primary transition-colors truncate">{title}</h4>
                    {description && <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1 opacity-80">{description}</p>}
                </div>
                <ArrowRight className="h-4 w-4 text-primary/40 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 shrink-0" />
            </CardContent>
        </Card>
    </Link>
);

const DashboardSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div className="flex flex-col gap-10">
                
                {/* --- Summary Analytics Grid --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <SummaryStat 
                        title="Total Faculty" 
                        value={stats?.facultyCount ?? 0} 
                        icon={UserCheck} 
                        colorClass="bg-blue-500/10 text-blue-600" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Students" 
                        value={stats?.studentCount ?? 0} 
                        icon={Users} 
                        colorClass="bg-purple-500/10 text-purple-600" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Active Classes" 
                        value={stats?.classCount ?? 0} 
                        icon={School} 
                        colorClass="bg-green-500/10 text-green-600" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Overloaded" 
                        value={overloadedCount} 
                        icon={AlertTriangle} 
                        colorClass="bg-orange-500/10 text-orange-600" 
                        isLoading={isDataLoading}
                    />
                    <SummaryStat 
                        title="Pending" 
                        value={pendingRequestsCount} 
                        icon={Activity} 
                        colorClass="bg-red-500/10 text-red-600" 
                        isLoading={isDataLoading}
                    />
                </div>

                {/* --- Features Grid --- */}
                <div className="space-y-12 pb-12">
                    
                    <DashboardSection title="Academics & AI">
                        <FeatureCard 
                            href="/admin/schedule" 
                            title="Master Schedule" 
                            icon={Calendar} 
                            description="Real-time grid management"
                        />
                        <FeatureCard 
                            href="/admin/timetable/generate" 
                            title="Engine Console" 
                            icon={Bot} 
                            description="Deterministic generator"
                        />
                        <FeatureCard 
                            href="/admin/teacher-allocation" 
                            title="Teacher AI" 
                            icon={Workflow} 
                            description="Smart workload balancing"
                        />
                        <FeatureCard 
                            href="/admin/exams" 
                            title="Exam Portal" 
                            icon={FileText} 
                            description="Schedules & seating plans"
                        />
                        <FeatureCard 
                            href="/admin/attendance" 
                            title="Attendance Logs" 
                            icon={CheckSquare} 
                            description="Review and lock logs"
                        />
                        <FeatureCard 
                            href="/admin/results" 
                            title="Results Manager" 
                            icon={BarChart3} 
                            description="Grade processing & marks"
                        />
                    </DashboardSection>

                    <DashboardSection title="Insights & Data">
                        <FeatureCard 
                            href="/admin/faculty-analysis" 
                            title="Workload Analysis" 
                            icon={Activity} 
                            description="Heatmaps & load balancing"
                        />
                        <FeatureCard 
                            href="/admin/leaderboards" 
                            title="Leaderboards" 
                            icon={Trophy} 
                            description="Campus rankings"
                        />
                        <FeatureCard 
                            href="/admin/students" 
                            title="Student Registry" 
                            icon={Users} 
                            description="Profiles & demographics"
                        />
                        <FeatureCard 
                            href="/admin/departments" 
                            title="Department Setup" 
                            icon={Building} 
                            description="Faculty & subject mapping"
                        />
                        <FeatureCard 
                            href="/admin/classrooms" 
                            title="Infrastructure" 
                            icon={Warehouse} 
                            description="Asset maintenance"
                        />
                    </DashboardSection>

                    <DashboardSection title="Administration & System">
                        <FeatureCard 
                            href="/admin/fees" 
                            title="Financials" 
                            icon={DollarSign} 
                            description="Fee tracking & invoices"
                        />
                        <FeatureCard 
                            href="/admin/hostels" 
                            title="Residential" 
                            icon={Home} 
                            description="Room assignments"
                        />
                        <FeatureCard 
                            href="/admin/leave-requests" 
                            title="HR Management" 
                            icon={Mail} 
                            description="Leaves & substitutions"
                        />
                        <FeatureCard 
                            href="/admin/new-slot-requests" 
                            title="Slot Requests" 
                            icon={PlusSquare} 
                            description="Schedule modification"
                        />
                        <FeatureCard 
                            href="/admin/admins" 
                            title="Governance" 
                            icon={ShieldCheck} 
                            description="Access control & roles"
                        />
                        <FeatureCard 
                            href="/admin/subscription" 
                            title="Platform Credits" 
                            icon={Gem} 
                            description="Billing & engine limits"
                        />
                        <FeatureCard 
                            href="/admin/hall-of-fame" 
                            title="Hall of Fame" 
                            icon={Award} 
                            description="Excellence gallery"
                        />
                        <FeatureCard 
                            href="/admin/api-test" 
                            title="System Health" 
                            icon={KeyRound} 
                            description="Diagnostics & API status"
                        />
                    </DashboardSection>

                </div>
            </div>
        </DashboardLayout>
    );
}

const Gem = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 3h12l4 6-10 12L2 9Z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg>
);
