
'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, LayoutGrid, Mail, PencilRuler, Trophy, Award, Warehouse, ArrowLeft } from "lucide-react";
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

const managementCards = [
  { tab: "subjects", title: "Subjects", icon: Book, description: "Manage all course subjects." },
  { tab: "classes", title: "Classes", icon: School, description: "Organize classes and semesters." },
  { tab: "classrooms", title: "Classrooms", icon: Warehouse, description: "Manage rooms and labs." },
  { tab: "faculty", title: "Faculty", icon: UserCheck, description: "Handle faculty profiles." },
  { tab: "students", title: "Students", icon: Users, description: "Administer student records." },
  { tab: "schedule", title: "Schedule", icon: Calendar, description: "Create and view timetables." },
  { tab: "leaderboards", title: "Leaderboards", icon: Trophy, description: "View top performers." },
  { tab: "hall-of-fame", title: "Hall of Fame", icon: Award, description: "Celebrate champions." },
  { tab: "leave-requests", title: "Leave Requests", icon: Mail, description: "Approve or deny leaves." },
  { tab: "schedule-requests", title: "Schedule Requests", icon: PencilRuler, description: "Handle change requests." },
];

const AdminDashboardHome = () => (
  <div className="space-y-8">
    <Card>
      <CardHeader>
          <CardTitle>Welcome, Admin!</CardTitle>
          <CardDescription>From this dashboard, you can manage all aspects of the university schedule.</CardDescription>
      </CardHeader>
      <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">1,254</div>
                      <p className="text-xs text-muted-foreground">+5% from last semester</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">78</div>
                      <p className="text-xs text-muted-foreground">+2 since last year</p>
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Classes Scheduled</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold">342</div>
                      <p className="text-xs text-muted-foreground">for the upcoming week</p>
                  </CardContent>
              </Card>
          </div>
      </CardContent>
    </Card>
    
    <Card>
      <CardHeader>
        <CardTitle>Management Sections</CardTitle>
        <CardDescription>Click a card to navigate to the respective management page.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {managementCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link href={`/admin?tab=${card.tab}`} key={card.title}>
                <Card className="hover:bg-accent hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
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
);

const AdminDashboardContent = () => {
    const searchParams = useSearchParams();
    const tab = searchParams.get('tab');

    const getTitleForTab = (tab: string | null) => {
      if (!tab) return "Admin Dashboard";
      const card = managementCards.find(c => c.tab === tab);
      return card ? card.title : "Admin Dashboard";
    };
    
    const pageTitle = getTitleForTab(tab);

    const renderContent = () => {
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
            default: return <AdminDashboardHome />;
        }
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
