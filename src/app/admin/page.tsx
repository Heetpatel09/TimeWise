
'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, LayoutGrid, Mail, PencilRuler, Trophy, Award, Warehouse, ArrowLeft, PlusSquare, Sparkles, UserCog, DollarSign, Home, FileText, CheckSquare, BarChart3, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SubjectsManager from './components/SubjectsManager';
import ClassesManager from './components/ClassesManager';
import ClassroomsManager from './components/ClassroomsManager';
import FacultyManager from './components/FacultyManager';
import StudentsManager from './components/StudentsManager';
import ScheduleManager from './components/ScheduleManager';
import LeaderboardManager from './components/LeaderboardManager';
import HallOfFamePage from './hall-of-fame/page';
import LeaveRequestsPage from './leave-requests/page';
import ScheduleRequestsPage from './schedule-requests/page';
import NewSlotRequestsPage from './components/NewSlotRequestsPage';
import AdminsManager from './components/AdminsManager';
import FeesManager from './components/FeesManager';
import HostelsManager from './components/HostelsManager';
import ExamsManager from './components/ExamsManager';
import AttendanceManager from './components/AttendanceManager';
import ResultsManager from './components/ResultsManager';
import { getStudents } from '@/lib/services/students';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';


const managementCards = [
  { tab: "subjects", title: "Subjects", icon: Book, description: "Manage all course subjects." },
  { tab: "classes", title: "Classes", icon: School, description: "Organize classes and semesters." },
  { tab: "classrooms", title: "Classrooms", icon: Warehouse, description: "Manage rooms and labs." },
  { tab: "admins", title: "Admins", icon: UserCog, description: "Manage administrator users." },
  { tab: "faculty", title: "Faculty", icon: UserCheck, description: "Handle faculty profiles." },
  { tab: "students", title: "Students", icon: Users, description: "Administer student records." },
  { tab: "schedule", title: "Schedule", icon: Calendar, description: "Create and view timetables." },
  { tab: "exams", title: "Exams", icon: FileText, description: "Manage exam timetables." },
  { tab: "attendance", title: "Attendance", icon: CheckSquare, description: "Review and lock attendance." },
  { tab: "fees", title: "Fees", icon: DollarSign, description: "Handle student fee payments." },
  { tab: "hostels", title: "Hostels", icon: Home, description: "Manage hostel room assignments." },
  { tab: "results", title: "Results", icon: BarChart3, description: "Upload and manage results." },
  { tab: "leaderboards", title: "Leaderboards", icon: Trophy, description: "View top performers." },
  { tab: "hall-of-fame", title: "Hall of Fame", icon: Award, description: "Celebrate top achievers." },
  { tab: "leave-requests", title: "Leave Requests", icon: Mail, description: "Approve or reject leave." },
  { tab: "schedule-requests", title: "Schedule Changes", icon: PencilRuler, description: "Review schedule change requests." },
  { tab: "new-slot-requests", title: "New Slot Requests", icon: PlusSquare, description: "Review new slot requests from faculty." },
];

const renderContent = (tab: string) => {
    switch (tab) {
        case 'subjects': return <SubjectsManager />;
        case 'classes': return <ClassesManager />;
        case 'classrooms': return <ClassroomsManager />;
        case 'faculty': return <FacultyManager />;
        case 'students': return <StudentsManager />;
        case 'schedule': return <ScheduleManager />;
        case 'leaderboards': return <LeaderboardManager />;
        case 'hall-of-fame': return <HallOfFamePage />;
        case 'leave-requests': return <LeaveRequestsPage />;
        case 'schedule-requests': return <ScheduleRequestsPage />;
        case 'new-slot-requests': return <NewSlotRequestsPage />;
        case 'admins': return <AdminsManager />;
        case 'fees': return <FeesManager />;
        case 'hostels': return <HostelsManager />;
        case 'exams': return <ExamsManager />;
        case 'attendance': return <AttendanceManager />;
        case 'results': return <ResultsManager />;
        default: return <AdminDashboard />;
    }
}

function StatCard({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ElementType, isLoading: boolean }) {
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
    const { data: students, isLoading: studentsLoading } = useQuery({ queryKey: ['students'], queryFn: getStudents });
    const { data: faculty, isLoading: facultyLoading } = useQuery({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: schedule, isLoading: scheduleLoading } = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
    const { data: classes, isLoading: classesLoading } = useQuery({ queryKey: ['classes'], queryFn: getClasses });
    const { data: subjects, isLoading: subjectsLoading } = useQuery({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: classrooms, isLoading: classroomsLoading } = useQuery({ queryKey: ['classrooms'], queryFn: getClassrooms });
    
    return (
        <div className='space-y-6'>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <StatCard title="Total Students" value={students?.length ?? 0} icon={Users} isLoading={studentsLoading} />
                <StatCard title="Total Faculty" value={faculty?.length ?? 0} icon={UserCheck} isLoading={facultyLoading} />
                <StatCard title="Total Classes" value={classes?.length ?? 0} icon={School} isLoading={classesLoading} />
                <StatCard title="Total Subjects" value={subjects?.length ?? 0} icon={Book} isLoading={subjectsLoading} />
                <StatCard title="Total Classrooms" value={classrooms?.length ?? 0} icon={Warehouse} isLoading={classroomsLoading} />
                <StatCard title="Scheduled Slots" value={schedule?.length ?? 0} icon={Calendar} isLoading={scheduleLoading} />
             </div>

             <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Management Sections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {managementCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link key={card.tab} href={`?tab=${card.tab}`} passHref>
                                <Card className="group hover:bg-primary/5 hover:border-primary transition-all duration-300 h-full flex flex-col">
                                    <CardHeader>
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                                <Icon className="h-6 w-6 text-primary" />
                                            </div>
                                            <CardTitle className="text-lg">{card.title}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground">{card.description}</p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
             </div>
        </div>
    )
}

export default function AdminPage() {
    const { user } = useAuth();
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');

    if (!user) return null;

    const pageTitle = managementCards.find(c => c.tab === tab)?.title || 'Dashboard';
    
    return (
        <DashboardLayout pageTitle={tab ? `Admin / ${pageTitle}` : 'Admin Dashboard'} role="admin">
            {tab && (
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/admin">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Link>
                </Button>
            )}
            {renderContent(tab || 'dashboard')}
        </DashboardLayout>
    );
}
