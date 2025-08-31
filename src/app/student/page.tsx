'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TimetableView from "./components/TimetableView";
import { Bell, Flame, Loader2 } from "lucide-react";
import { getStudents } from '@/lib/services/students';
import type { Student } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';


export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStudent() {
      if (user) {
        setIsLoading(true);
        const allStudents = await getStudents();
        const currentStudent = allStudents.find(s => s.id === user.id);
        setStudent(currentStudent || null);
        setIsLoading(false);
      }
    }
    loadStudent();
  }, [user]);

  if (isLoading) {
    return (
        <DashboardLayout pageTitle="Student Dashboard" role="student">
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle="Student Dashboard" role="student">
        <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>My Timetable</CardTitle>
                        <CardDescription>Your weekly class schedule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TimetableView />
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-1 space-y-8">
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center">
                            <Flame className="w-6 h-6 mr-2 text-orange-500"/>
                            Attendance Streak
                        </CardTitle>
                        <CardDescription>Keep it up! Don't miss a class.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-6xl font-bold text-orange-500 drop-shadow-md">{student?.streak || 0}</div>
                        <p className="text-muted-foreground mt-2">Days in a row</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center">
                            <Bell className="w-5 h-5 mr-2"/>
                            Notifications
                        </CardTitle>
                        <CardDescription>Updates and announcements will appear here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center text-muted-foreground py-8">
                            <p>No new notifications.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DashboardLayout>
  );
}
