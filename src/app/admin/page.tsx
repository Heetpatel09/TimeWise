'use client';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users } from "lucide-react";
import SubjectsManager from "./components/SubjectsManager";
import ClassesManager from "./components/ClassesManager";
import FacultyManager from "./components/FacultyManager";
import StudentsManager from "./components/StudentsManager";
import ScheduleManager from "./components/ScheduleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import React from 'react';

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'subjects';

  const tabs = [
    { value: "subjects", label: "Subjects", icon: Book, component: <SubjectsManager /> },
    { value: "classes", label: "Classes", icon: School, component: <ClassesManager /> },
    { value: "faculty", label: "Faculty", icon: UserCheck, component: <FacultyManager /> },
    { value: "students", label: "Students", icon: Users, component: <StudentsManager /> },
    { value: "schedule", label: "Schedule", icon: Calendar, component: <ScheduleManager /> },
  ];

  return (
    <DashboardLayout pageTitle="Admin Dashboard" role="admin">
      <Tabs value={tab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <Link key={tab.value} href={`/admin?tab=${tab.value}`} passHref>
                <TabsTrigger value={tab.value} className='w-full'>
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </TabsTrigger>
              </Link>
            );
          })}
        </TabsList>
        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle>{tab.label} Management</CardTitle>
                <CardDescription>
                  Add, edit, or delete {tab.label.toLowerCase()} from the system.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tab.component}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}
