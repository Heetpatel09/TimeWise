
'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Send, ArrowRight, Flame, Loader2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ScheduleView from "./components/ScheduleView";
import { addLeaveRequest } from '@/lib/services/leave';
import { getFaculty } from '@/lib/services/faculty';
import type { Faculty as FacultyType, Notification } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { getNotificationsForUser } from '@/lib/services/notifications';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFaculty, setCurrentFaculty] = useState<FacultyType | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            const [allFaculty, userNotifications] = await Promise.all([
                getFaculty(),
                getNotificationsForUser(user.id)
            ]);
            
            const fac = allFaculty.find(f => f.id === user.id);
            if (fac) setCurrentFaculty(fac);

            setNotifications(userNotifications);
            setIsLoading(false);
        }
    }
    loadData();
  }, [user]);

  const handleLeaveRequestSubmit = async () => {
    if (!leaveStartDate || !leaveEndDate || !leaveReason) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    if (!user || !currentFaculty) return;

    setIsSubmitting(true);
    try {
      await addLeaveRequest({
        requesterId: user.id,
        requesterName: currentFaculty.name,
        requesterRole: 'faculty',
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
    return <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
    </DashboardLayout>
  }

  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card>
                <CardHeader>
                <CardTitle>Welcome, {currentFaculty?.name || "Faculty Member"}!</CardTitle>
                <CardDescription>
                    This is your central hub for managing your schedule and administrative tasks.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="flex flex-col">
                        <CardHeader>
                        <CardTitle>Request Leave</CardTitle>
                        <CardDescription>Submit a request for a leave of absence.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">
                            Need to take time off? Fill out the leave request form and it will be sent to the administration for approval.
                        </p>
                        </CardContent>
                        <CardFooter>
                        <Button onClick={() => setLeaveDialogOpen(true)}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Open Leave Form
                        </Button>
                        </CardFooter>
                    </Card>
                    <Card className="flex flex-col">
                        <CardHeader>
                        <CardTitle>Manage Schedule</CardTitle>
                        <CardDescription>View your weekly schedule and request changes.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                        <p className="text-sm text-muted-foreground">
                            Access your detailed weekly timetable. If you need to request a change for a specific class, you can do so from there.
                        </p>
                        </CardContent>
                        <CardFooter>
                        <Button onClick={() => setScheduleModalOpen(true)}>
                            View Schedule <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        </CardFooter>
                    </Card>
                </div>
                </CardContent>
            </Card>
         </div>
         <div className="lg:col-span-1 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Flame className="w-6 h-6 mr-2 text-orange-500"/>
                        Teaching Streak
                    </CardTitle>
                    <CardDescription>For your consistent dedication.</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <div className="text-6xl font-bold text-orange-500 drop-shadow-md">{currentFaculty?.streak || 0}</div>
                    <p className="text-muted-foreground mt-2">Consecutive teaching days</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                        <CardTitle className="flex items-center">
                        <Bell className="w-5 h-5 mr-2"/>
                        Notifications
                    </CardTitle>
                    <CardDescription>Updates and announcements.</CardDescription>
                </CardHeader>
                <CardContent>
                    {notifications.length > 0 ? (
                        <ul className="space-y-3">
                            {notifications.slice(0, 5).map(n => (
                                <li key={n.id} className="text-sm text-muted-foreground border-l-2 pl-3 border-primary animate-in fade-in slide-in-from-top-2 duration-300">{n.message}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center text-muted-foreground py-4">
                            <p>No new notifications.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
         </div>
       </div>


      <Dialog open={isScheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>My Weekly Schedule</DialogTitle>
                <DialogDescription>
                    Here are your scheduled lectures for the week. You can request changes for any slot.
                </DialogDescription>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto p-1">
              <ScheduleView />
            </div>
             <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>Close</Button>
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
            <div className="grid grid-cols-2 gap-4">
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
