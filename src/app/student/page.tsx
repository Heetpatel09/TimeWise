import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import TimetableView from "./components/TimetableView";
import { Bell, Flame } from "lucide-react";
import { students } from "@/lib/placeholder-data";

// Assume logged-in student is Alice Johnson (STU001)
const LOGGED_IN_STUDENT_ID = 'STU001';
const student = students.find(s => s.id === LOGGED_IN_STUDENT_ID);

export default function StudentDashboard() {
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
