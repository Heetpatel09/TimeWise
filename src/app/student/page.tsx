
'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, BookCheck, BarChart3, Wallet, MessageSquare, Bell, Home, Loader2, Flame, GraduationCap, StickyNote } from "lucide-react";
import type { Student, Class, EnrichedSchedule, Event, LeaveRequest, EnrichedResult, Fee, EnrichedExam } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TimetableView from './components/TimetableView';
import { useToast } from '@/hooks/use-toast';
import { getStudentDashboardData } from './actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, isToday } from 'date-fns';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { addLeaveRequest } from '@/lib/services/leave';
import { addEvent } from '@/lib/services/events';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ResultsDialog from './components/ResultsDialog';
import FeesDialog from './components/FeesDialog';
import AttendanceDialog from './components/AttendanceDialog';
import ExamsDialog from './components/ExamsDialog';

const InfoItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col text-left">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold text-sm">{value}</span>
    </div>
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    student: Student & { className: string, department: string };
    schedule: EnrichedSchedule[];
    events: Event[];
    leaveRequests: LeaveRequest[];
    results: EnrichedResult[];
    fees: EnrichedFee[];
    exams: EnrichedExam[];
  } | null>(null);

  const [isTimetableModalOpen, setTimetableModalOpen] = useState(false);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isResultsOpen, setResultsOpen] = useState(false);
  const [isFeesOpen, setFeesOpen] = useState(false);
  const [isAttendanceOpen, setAttendanceOpen] = useState(false);
  const [isExamsOpen, setExamsOpen] = useState(false);


  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogAction, setDialogAction] = useState<'reminder' | 'leave' | 'note' | null>(null);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventReminder, setEventReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            try {
                const data = await getStudentDashboardData(user.id);
                setDashboardData(data);
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadData();
  }, [user, toast]);

  const todaysSchedule = useMemo(() => {
    if (!dashboardData) return [];
    return dashboardData.schedule.filter(s => s.day === format(new Date(), 'EEEE'));
  }, [dashboardData]);

  const handleDayClick = (date: Date, action: 'reminder' | 'leave' | 'note') => {
    setSelectedDate(date);
    setDialogAction(action);
    const dateStr = format(date, 'yyyy-MM-dd');
    if (action === 'reminder') {
        setEventDialogOpen(true);
    } else {
        setLeaveStartDate(dateStr);
        setLeaveEndDate(dateStr);
        setLeaveDialogOpen(true);
    }
  };

  const handleEventSubmit = async () => {
    if (!user || !selectedDate || !eventTitle) {
      toast({ title: 'Missing Information', description: 'Please provide a title.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const newEvent = await addEvent({
        userId: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: eventTitle,
        reminder: eventReminder,
        reminderTime: eventReminder ? reminderTime : undefined
      });
      setDashboardData(prev => prev ? ({ ...prev, events: [...prev.events, newEvent] }) : null);
      toast({ title: 'Reminder Added' });
      setEventDialogOpen(false);
      setEventTitle('');
    } catch(error) {
       toast({ title: 'Error', description: 'Failed to add reminder.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleLeaveSubmit = async () => {
    if ((dialogAction === 'leave' && (!leaveStartDate || !leaveEndDate)) || !leaveReason) {
      toast({ title: 'Missing Information', description: 'Please fill out all required fields.', variant: 'destructive'});
      return;
    }
    if (!user || !dashboardData?.student) return;

    setIsSubmitting(true);
    try {
      const reason = dialogAction === 'note' ? `Note: ${leaveReason}` : leaveReason;
      const newRequest = await addLeaveRequest({
        requesterId: user.id,
        requesterName: dashboardData.student.name,
        requesterRole: 'student',
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: reason,
      });
      setDashboardData(prev => prev ? ({ ...prev, leaveRequests: [...prev.leaveRequests, newRequest] }) : null);
      toast({ title: `${dialogAction === 'note' ? 'Note' : 'Leave Request'} Sent` });
      setLeaveDialogOpen(false);
      setLeaveReason('');
    } catch (error) {
      toast({ title: 'Error', description: `Failed to submit ${dialogAction}.`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComingSoon = () => {
    toast({
        title: 'Coming Soon!',
        description: 'This feature is under development.',
    });
  }

  const features = [
      { title: "Time Table", icon: Calendar, onClick: () => setTimetableModalOpen(true) },
      { title: "Attendance", icon: ClipboardList, onClick: () => setAttendanceOpen(true) },
      { title: "Exam Schedule", icon: BookCheck, onClick: () => setExamsOpen(true) },
      { title: "Results", icon: BarChart3, onClick: () => setResultsOpen(true) },
      { title: "Fees", icon: Wallet, onClick: () => setFeesOpen(true) },
      { title: "Hostel Details", icon: Home, onClick: handleComingSoon, comingSoon: true },
  ];

  if (isLoading || !dashboardData) {
    return (
        <DashboardLayout pageTitle="Student Dashboard" role="student">
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardLayout>
    );
  }

  const { student } = dashboardData;
  const leaveDialogTitle = dialogAction === 'leave' ? 'Request Leave of Absence' : 'Add a Note for Admin';
  const leaveDialogDescription = dialogAction === 'leave' 
    ? 'Please fill out the form below to submit your leave request.'
    : 'Add a note for the administration regarding this day.';

  return (
    <DashboardLayout pageTitle="Student Dashboard" role="student">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
            <div className="lg:col-span-2 flex flex-col">
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                                <AvatarImage src={student.avatar} alt={student.name} />
                                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl animate-in fade-in-0 duration-500">
                                    Hi, {student.name.split(' ')[0]} <span className="inline-block animate-wave">👋</span>
                                </CardTitle>
                                <CardDescription>{student.email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem label="Enrollment No." value={student.enrollmentNumber} />
                        <InfoItem label="Department" value={student.department} />
                        <InfoItem label="Class" value={student.className} />
                        <InfoItem label="Semester" value={student.semester} />
                    </CardContent>
                </Card>
                <div className="flex-grow">
                    <ScheduleCalendar 
                        schedule={dashboardData.schedule}
                        leaveRequests={dashboardData.leaveRequests}
                        events={dashboardData.events}
                        onDayClick={handleDayClick}
                    />
                </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
                 <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
                     <CardContent className="flex items-center gap-4 p-6">
                       <Flame className="w-10 h-10 text-orange-500 animation-pulse" />
                       <div>
                            <p className="text-2xl font-bold">{student.streak || 0}</p>
                            <p className="text-sm text-muted-foreground">Day Streak</p>
                       </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                        {features.map((feature) => (
                             <Card key={feature.title} className="group relative flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer" onClick={feature.onClick}>
                                <feature.icon className="w-8 h-8 mb-2 text-primary" />
                                <h3 className="font-semibold text-xs">{feature.title}</h3>
                                {feature.comingSoon && <div className="absolute top-1 right-1 bg-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">SOON</div>}
                            </Card>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Today's Schedule</CardTitle>
                         <CardDescription>{format(new Date(), 'PPP')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {todaysSchedule.length > 0 ? (
                            <div className="space-y-3">
                            {todaysSchedule.map(slot => (
                                <div key={slot.id} className="flex justify-between items-center p-2 rounded-md bg-muted">
                                    <div>
                                        <p className="font-semibold text-sm">{slot.subjectName}</p>
                                        <p className="text-xs text-muted-foreground">{slot.time} - {slot.facultyName}</p>
                                    </div>
                                </div>
                            ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled for today.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Dialogs */}
        <Dialog open={isTimetableModalOpen} onOpenChange={setTimetableModalOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>My Weekly Timetable</DialogTitle></DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1"><TimetableView /></div>
                <DialogFooter><Button variant="outline" onClick={() => setTimetableModalOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        
        <ResultsDialog 
          isOpen={isResultsOpen} 
          onOpenChange={setResultsOpen} 
          student={student}
          results={dashboardData.results} 
        />
        <FeesDialog 
          isOpen={isFeesOpen}
          onOpenChange={setFeesOpen}
          fees={dashboardData.fees}
        />
         <AttendanceDialog 
          isOpen={isAttendanceOpen}
          onOpenChange={setAttendanceOpen}
          studentId={student.id}
        />
         <ExamsDialog 
          isOpen={isExamsOpen}
          onOpenChange={setExamsOpen}
          exams={dashboardData.exams}
        />
        
        <Dialog open={isLeaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{leaveDialogTitle}</DialogTitle><DialogDescription>{leaveDialogDescription}</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    {dialogAction === 'leave' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="start-date">Start Date</Label><Input id="start-date" type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} disabled={isSubmitting}/></div>
                        <div className="space-y-2"><Label htmlFor="end-date">End Date</Label><Input id="end-date" type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} min={leaveStartDate} disabled={isSubmitting}/></div>
                    </div>
                    )}
                    <div className="space-y-2"><Label htmlFor="reason">Reason / Note</Label><Textarea id="reason" placeholder="Please provide a brief reason..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={isSubmitting}/></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setLeaveDialogOpen(false)}>Cancel</Button><Button onClick={handleLeaveSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Submit</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isEventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>Add Reminder</DialogTitle><DialogDescription>For {selectedDate ? format(selectedDate, 'PPP') : ''}</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2"><Label htmlFor="event-title">Title</Label><Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Project Deadline" disabled={isSubmitting}/></div>
                    <div className="flex items-center space-x-2"><Switch id="reminder" checked={eventReminder} onCheckedChange={setEventReminder} disabled={isSubmitting}/><Label htmlFor="reminder">Set Reminder Time</Label></div>
                    {eventReminder && <div className="space-y-2"><Label htmlFor="reminder-time">Time</Label><Input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isSubmitting}/></div>}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button><Button onClick={handleEventSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
  );
}
