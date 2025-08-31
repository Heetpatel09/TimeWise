'use client';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, LayoutGrid } from "lucide-react";
import SubjectsManager from "./components/SubjectsManager";
import ClassesManager from "./components/ClassesManager";
import FacultyManager from "./components/FacultyManager";
import StudentsManager from "./components/StudentsManager";
import ScheduleManager from "./components/ScheduleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import React from 'react';

const AdminDashboardHome = () => (
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
             <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Quick Actions</h3>
                <div className="flex gap-4">
                    <Link href="/admin?tab=schedule" passHref>
                        <Button variant="outline">
                            <Calendar className="mr-2 h-4 w-4" />
                            Manage Schedule
                        </Button>
                    </Link>
                     <Link href="/admin?tab=faculty" passHref>
                        <Button variant="outline">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Add Faculty
                        </Button>
                    </Link>
                </div>
            </div>
        </CardContent>
    </Card>
)

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');

  const tabs = [
    { value: "subjects", label: "Subjects", icon: Book, component: <SubjectsManager /> },
    { value: "classes", label: "Classes", icon: School, component: <ClassesManager /> },
    { value: "faculty", label: "Faculty", icon: UserCheck, component: <FacultyManager /> },
    { value: "students", label: "Students", icon: Users, component: <StudentsManager /> },
    { value: "schedule", label: "Schedule", icon: Calendar, component: <ScheduleManager /> },
  ];

  const activeTab = tab || 'dashboard';
  const selectedTabContents = tab ? tabs.find(t => t.value === tab)?.component : <AdminDashboardHome />;


  return (
    <DashboardLayout pageTitle="Admin Dashboard" role="admin">
       {!tab ? (
         <AdminDashboardHome />
       ): (
        <Card>
            <CardHeader>
            <CardTitle>{tabs.find(t => t.value === tab)?.label} Management</CardTitle>
            <CardDescription>
                Add, edit, or delete {tabs.find(t => t.value === tab)?.label.toLowerCase()} from the system.
            </CardDescription>
            </CardHeader>
            <CardContent>
            {selectedTabContents}
            </CardContent>
        </Card>
       )}
    </DashboardLayout>
  );
}
