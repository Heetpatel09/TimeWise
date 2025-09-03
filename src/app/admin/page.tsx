
'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, LayoutGrid, Mail, PencilRuler, Trophy, Award, Warehouse } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const AdminDashboard = () => {

  const managementCards = [
    { title: "Subjects", icon: Book, href: "/admin?tab=subjects", description: "Manage all course subjects." },
    { title: "Classes", icon: School, href: "/admin?tab=classes", description: "Organize classes and semesters." },
    { title: "Classrooms", icon: Warehouse, href: "/admin?tab=classrooms", description: "Manage rooms and labs." },
    { title: "Faculty", icon: UserCheck, href: "/admin?tab=faculty", description: "Handle faculty profiles." },
    { title: "Students", icon: Users, href: "/admin?tab=students", description: "Administer student records." },
    { title: "Schedule", icon: Calendar, href: "/admin?tab=schedule", description: "Create and view timetables." },
    { title: "Leaderboards", icon: Trophy, href: "/admin?tab=leaderboards", description: "View top performers." },
    { title: "Hall of Fame", icon: Award, href: "/admin?tab=hall-of-fame", description: "Celebrate champions." },
    { title: "Leave Requests", icon: Mail, href: "/admin?tab=leave-requests", description: "Approve or deny leaves." },
    { title: "Schedule Requests", icon: PencilRuler, href: "/admin?tab=schedule-requests", description: "Handle change requests." },
  ];

  return (
    <DashboardLayout pageTitle="Admin Dashboard" role="admin">
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
                  <Link href={card.href} key={card.title}>
                    <Card className="hover:bg-accent hover:shadow-lg transition-all duration-300 group h-full flex flex-col">
                      <CardHeader className="flex-grow">
                        <div className="mb-4 bg-primary/10 text-primary w-12 h-12 rounded-lg flex items-center justify-center">
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
    </DashboardLayout>
  );
};

export default AdminDashboard;
