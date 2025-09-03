
'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, LayoutGrid, Mail, PencilRuler, Trophy, Award, Warehouse, ArrowLeft, PlusSquare, Sparkles } from "lucide-react";
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
import TimetableGenerator from './components/TimetableGenerator';
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
  { tab: "faculty", title: "Faculty", icon: UserCheck, description: "Handle faculty profiles." },
  { tab: "students", title: "Students", icon: Users, description: "Administer student records." },
  { tab: "schedule", title: "Schedule", icon: Calendar, description: "Create and view timetables." },
  { tab: "generate-timetable", title: "Generate Timetable", icon: Sparkles, description: "Use AI to create a schedule." },
  { tab: "leaderboards", title: "Leaderboards", icon: Trophy, description: "View top performers." },
  { tab: "hall-of-fame", title: "Hall of Fame", icon: Award, description: "Celebrate champions." },
  { tab: "leave-requests", title: "Leave Requests", icon: Mail, description: "Approve or deny leaves." },
  { tab: "schedule-requests", title: "Schedule Requests", icon: PencilRuler, description: "Handle change requests." },
  { tab: "new-slot-requests", title: "New Slot Requests", icon: PlusSquare, description: "Handle new slot requests." },
];

const AdminDashboardHome = () => {
    const { user } = useAuth();
    const { data: students, isLoading: studentsLoading } = useQuery({ 
      queryKey: ['students'], 
      queryFn: getStudents 
    });
    const { data: faculty, isLoading: facultyLoading } = useQuery({ 
      queryKey: ['faculty'], 
      queryFn: getFaculty 
    });
    const { data: schedule, isLoading: scheduleLoading } = useQuery({ 
      queryKey: ['schedule'], 
      queryFn: getSchedule 
    });

    const totalStudents = students?.length || 0;
    const totalFaculty = faculty?.length || 0;
    const totalScheduled = schedule?.length || 0;

    return (
        <div className="space-y-8">
            <Card className="animate-in fade-in-0 duration-500">
            <CardHeader>
                <CardTitle>Welcome, {user?.name || 'Admin'}!</CardTitle>
                <CardDescription>From this dashboard, you can manage all aspects of the university schedule.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{studentsLoading ? '...' : totalStudents}</div>
                        </CardContent>
                    </Card>
                    <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-400">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{facultyLoading ? '...' : totalFaculty}</div>
                        </CardContent>
                    </Card>
                    <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{scheduleLoading ? '...' : totalScheduled}</div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
            </Card>
            
            <Card className="animate-in fade-in-0 duration-500 delay-200">
            <CardHeader>
                <CardTitle>Management Sections</CardTitle>
                <CardDescription>Click a card to navigate to the respective management page.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {managementCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                    <Link href={`/admin?tab=${card.tab}`} key={card.title}>
                        <Card className="hover:bg-accent hover:shadow-lg transition-all duration-300 group h-full flex flex-col animate-in fade-in-0 zoom-in-95" style={{ animationDelay: `${300 + index * 50}ms`}}>
                        <CardHeader className="flex-grow">
                            <div className="mb-4 bg-card text-primary w-12 h-12 rounded-lg flex items-center justify-center border">
                            <Icon className="w-6 h-6" />
                            </div>
                            <CardTitle className="text-lg">{card.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-xs text-muted-foreground">{card.description}</p>
                        </CardContent>
                        </Card>
                    </Link>
                    );
                })}
                </div>
            </CardContent>
            </Card>
        </div>
    )
};

const AdminDashboardContent = () => {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');
    const { user } = useAuth();

    const { data: classes } = useQuery({ queryKey: ['classes'], queryFn: getClasses });
    const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: faculty } = useQuery({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: classrooms } = useQuery({ queryKey: ['classrooms'], queryFn: getClassrooms });

    const getTitleForTab = (tab: string | null) => {
      if (!tab) return "Admin Dashboard";
      const card = managementCards.find(c => c.tab === tab);
      return card ? card.title : "Admin Dashboard";
    };
    
    const pageTitle = getTitleForTab(tab);
    
    const renderContent = () => {
        let content;
        switch (tab) {
            case 'subjects': content = <SubjectsManager />; break;
            case 'classes': content = <ClassesManager />; break;
            case 'classrooms': content = <ClassroomsManager />; break;
            case 'faculty': content = <FacultyManager />; break;
            case 'students': content = <StudentsManager />; break;
            case 'schedule': content = <ScheduleManager />; break;
            case 'leaderboards': content = <LeaderboardManager />; break;
            case 'hall-of-fame': content = <HallOfFamePage />; break;
            case 'leave-requests': content = <LeaveRequestsPage />; break;
            case 'schedule-requests': content = <ScheduleRequestsPage />; break;
            case 'new-slot-requests': content = <NewSlotRequestsPage />; break;
            case 'generate-timetable': 
                content = (classes && subjects && faculty && classrooms) ? (
                    <TimetableGenerator 
                        classes={classes} 
                        subjects={subjects} 
                        faculty={faculty} 
                        classrooms={classrooms}
                        role="admin"
                    />
                ) : <div>Loading generation data...</div>;
                break;
            default: return <AdminDashboardHome />;
        }

        const cardInfo = managementCards.find(c => c.tab === tab);

        return (
            <Card className="animate-in fade-in-0 duration-500">
                <CardHeader>
                    <CardTitle>{cardInfo?.title}</CardTitle>
                    <CardDescription>{cardInfo?.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    {content}
                </CardContent>
            </Card>
        )
    }

    return (
        <DashboardLayout pageTitle={pageTitle} role="admin">
            {tab && (
              <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
            )}
            {renderContent()}
        </DashboardLayout>
    );
}

export default function AdminDashboard() {
  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <AdminDashboardContent />
    </React.Suspense>
  )
}
