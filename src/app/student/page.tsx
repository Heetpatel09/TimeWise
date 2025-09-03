
'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import TimetableView from "./components/TimetableView";
import { Bell, Flame, Loader2, Calendar as CalendarIcon, Send, BookOpen } from "lucide-react";
import { getStudents } from '@/lib/services/students';
import { getNotificationsForUser } from '@/lib/services/notifications';
import type { Student, Notification, Subject, Class } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addLeaveRequest } from '@/lib/services/leave';
import { getSubjectsForStudent } from './actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';


export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCatalogOpen, setCatalogOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      if (user) {
        setIsLoading(true);
        const [allStudents, userNotifications] = await Promise.all([
            getStudents(),
            getNotificationsForUser(user.id)
        ]);
        const currentStudent = allStudents.find(s => s.id === user.id);
        if (currentStudent) {
            setStudent(currentStudent);
            const studentSubjects = await getSubjectsForStudent(currentStudent.id);
            setSubjects(studentSubjects);
        }
        
        setNotifications(userNotifications);
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleLeaveRequestSubmit = async () => {
    if (!leaveStartDate || !leaveEndDate || !leaveReason) {
      toast({
        title: 'Misng Information',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    if (!user || !student) return;

    setIsSubmitting(true);
    try {
      await addLeaveRequest({
        requesterId: user.id,
        requesterName: student.name,
        requesterRole: 'student',
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason,
      });

      toast({
        title: 'Leave Request Sent',
        description: 'Your request has been submitted for approval.',
      });

      setLeaveDialogOpen(false);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit leave request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <div className="md:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <div className="md:col-span-1 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-300">
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
                 <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle className='flex items-center'><BookOpen className="mr-2 h-5 w-5" />Course Catalog</CardTitle>
                        <CardDescription>View subjects for your semester.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">
                            Browse all the subjects offered in your current semester.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => setCatalogOpen(true)}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            View Subjects
                        </Button>
                    </CardFooter>
                </Card>
                 <Card className="flex flex-col">
                    <CardHeader>
                    <CardTitle>Request Leave</CardTitle>
                    <CardDescription>Submit a request for a leave of absence.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">
                        Need to take time off? Fill out the leave request form for approval.
                    </p>
                    </CardContent>
                    <CardFooter>
                    <Button onClick={() => setLeaveDialogOpen(true)}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Open Leave Form
                    </Button>
                    </CardFooter>
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
                         {notifications.length > 0 ? (
                            <ul className="space-y-3">
                                {notifications.slice(0, 5).map(n => (
                                    <li key={n.id} className="text-sm text-muted-foreground border-l-2 pl-3 border-primary animate-in fade-in slide-in-from-top-2 duration-300">{n.message}</li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                <p>No new notifications.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        <Dialog open={isCatalogOpen} onOpenChange={setCatalogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Course Catalog (Semester {subjects[0]?.semester})</DialogTitle>
                    <DialogDescription>
                        Here are the subjects for your current semester.
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-72">
                    <div className="space-y-4 pr-6">
                        {subjects.map(subject => (
                            <div key={subject.id} className="p-3 rounded-md border">
                                <h3 className="font-semibold">{subject.name}</h3>
                                <p className="text-sm text-muted-foreground">{subject.code}</p>
                                <div className="flex gap-2 mt-2">
                                     <Badge variant={subject.type === 'lab' ? 'secondary' : 'outline'}>{subject.type}</Badge>
                                     {subject.isSpecial && <Badge variant="secondary">Special</Badge>}
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setCatalogOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <Dialog open={isLeaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Leave of Absence</DialogTitle>
            <DialogDescription>
              Please fill out the form below to submit your leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input 
                  id="start-date" 
                  type="date" 
                  value={leaveStartDate}
                  onChange={(e) => setLeaveStartDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input 
                  id="end-date" 
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Leave</Label>
              <Textarea 
                id="reason"
                placeholder="Please provide a brief reason for your absence..."
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleLeaveRequestSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
