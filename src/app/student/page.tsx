
'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, BookCheck, BarChart3, Wallet, Home, Loader2, Flame, FolderKanban, ShieldCheck, Zap, Gem, Trophy } from "lucide-react";
import type { Student, EnrichedSchedule, Event, LeaveRequest, EnrichedResult, Fee, EnrichedExam, EnrichedAssignment, Submission, EnrichedAttendance } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TimetableView from './components/TimetableView';
import { useToast } from '@/hooks/use-toast';
import { getStudentDashboardData } from './actions';
import { format } from 'date-fns';
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
import HostelDialog from './components/HostelDialog';
import AssignmentsDialog from './components/AssignmentsDialog';
import { getAssignmentsForStudent } from '@/lib/services/assignments';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BadgeCard from './components/BadgeCard';
import LeaderboardDialog from './components/LeaderboardDialog';
import { Badge } from '@/components/ui/badge';

const InfoItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col">
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
    attendance: EnrichedAttendance[];
  } | null>(null);
  const [assignments, setAssignments] = useState<(EnrichedAssignment & { submission: Submission | null })[]>([]);

  const [isTimetableModalOpen, setTimetableModalOpen] = useState(false);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isResultsOpen, setResultsOpen] = useState(false);
  const [isFeesOpen, setFeesOpen] = useState(false);
  const [isAttendanceOpen, setAttendanceOpen] = useState(false);
  const [isExamsOpen, setExamsOpen] = useState(false);
  const [isHostelOpen, setHostelOpen] = useState(false);
  const [isAssignmentsOpen, setAssignmentsOpen] = useState(false);
  const [isLeaderboardOpen, setLeaderboardOpen] = useState(false);

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
                const [data, assignmentsData] = await Promise.all([
                    getStudentDashboardData(user.id),
                    getAssignmentsForStudent(user.id)
                ]);
                setDashboardData(data);
                setAssignments(assignmentsData);
            } catch (error) {
                console.error("Failed to load dashboard data:", error);
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
    if (action === 'reminder' || action === 'note') {
        setEventTitle('');
        setLeaveReason('');
        setEventDialogOpen(true);
    } else {
        setLeaveStartDate(dateStr);
        setLeaveEndDate(dateStr);
        setLeaveReason('');
        setLeaveDialogOpen(true);
    }
  };

  const handleEventSubmit = async () => {
    if (!user || !selectedDate) return;

    let title;
    if (dialogAction === 'reminder') {
        if (!eventTitle) {
            toast({ title: 'Missing Information', description: 'Please provide a title.', variant: 'destructive' });
            return;
        }
        title = eventTitle;
    } else { // note
         if (!leaveReason) {
            toast({ title: 'Missing Information', description: 'Please provide a note.', variant: 'destructive' });
            return;
        }
        title = `Note: ${leaveReason}`;
    }

    setIsSubmitting(true);
    try {
      const newEvent = await addEvent({
        userId: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: title,
        reminder: dialogAction === 'reminder' ? eventReminder : false,
        reminderTime: dialogAction === 'reminder' && eventReminder ? reminderTime : undefined
      });
      setDashboardData(prev => prev ? ({ ...prev, events: [...prev.events, newEvent] }) : null);
      toast({ title: dialogAction === 'note' ? 'Note Added' : 'Reminder Added' });
      setEventDialogOpen(false);
      setEventTitle('');
      setLeaveReason('');
    } catch(error: any) {
       toast({ title: 'Error', description: error.message || 'Failed to add event.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleLeaveSubmit = async () => {
    if ((!leaveStartDate || !leaveEndDate) || !leaveReason) {
      toast({ title: 'Missing Information', description: 'Please fill out all required fields.', variant: 'destructive'});
      return;
    }
    if (!user || !dashboardData?.student) return;

    setIsSubmitting(true);
    try {
      const newRequest = await addLeaveRequest({
        requesterId: user.id,
        requesterName: dashboardData.student.name,
        requesterRole: 'student',
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: leaveReason,
        type: 'academic',
      });
      setDashboardData(prev => prev ? ({ ...prev, leaveRequests: [...prev.leaveRequests, newRequest] }) : null);
      toast({ title: 'Leave Request Sent' });
      setLeaveDialogOpen(false);
      setLeaveReason('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || `Failed to submit leave request.`, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
      { title: "Time Table", icon: Calendar, onClick: () => setTimetableModalOpen(true) },
      { title: "Attendance", icon: ClipboardList, onClick: () => setAttendanceOpen(true) },
      { title: "Assignments", icon: FolderKanban, onClick: () => setAssignmentsOpen(true) },
      { title: "Leaderboards", icon: Trophy, onClick: () => setLeaderboardOpen(true) },
      { title: "Exam Schedule", icon: BookCheck, onClick: () => setExamsOpen(true) },
      { title: "Results", icon: BarChart3, onClick: () => setResultsOpen(true) },
      { title: "Fees", icon: Wallet, onClick: () => setFeesOpen(true) },
      { title: "Hostel Details", icon: Home, onClick: () => setHostelOpen(true) },
  ];

  const earnedBadges = useMemo(() => {
    if (!dashboardData) return [];
    const { student, attendance } = dashboardData;
    const badges = [];

    // CGPA Badges
    if (student.cgpa >= 9.5) badges.push({ title: 'Titan Scholar', icon: Gem, description: 'CGPA of 9.5 or higher' });
    else if (student.cgpa >= 9.0) badges.push({ title: 'Oracle', icon: Gem, description: 'CGPA of 9.0 or higher' });
    else if (student.cgpa >= 8.0) badges.push({ title: 'Prodigy', icon: Gem, description: 'CGPA of 8.0 or higher' });

    // Attendance Badges
    const totalAttendance = attendance.length;
    const presentAttendance = attendance.filter(a => a.status === 'present').length;
    const attendancePercentage = totalAttendance > 0 ? (presentAttendance / totalAttendance) * 100 : 0;
    if (attendancePercentage >= 95) badges.push({ title: 'Vanguard', icon: ShieldCheck, description: '95% or higher attendance' });
    else if (attendancePercentage >= 85) badges.push({ title: 'Sentinel', icon: ShieldCheck, description: '85% or higher attendance' });
    
    return badges;
  }, [dashboardData]);

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
    : `Add a note for ${selectedDate ? format(selectedDate, 'PPP') : 'the selected date'}. This will be visible to you and the admin.`;
  const eventDialogTitle = dialogAction === 'reminder' ? 'Add Reminder' : 'Add a Personal Note';
  const eventDialogDescription = `For ${selectedDate ? format(selectedDate, 'PPP') : ''}`;

  return (
    <DashboardLayout pageTitle="Student Dashboard" role="student">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
            <div className="lg:col-span-2 flex flex-col space-y-6">
                <Card className="mb-6 animate-in fade-in-0 duration-500">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                             <div className="flex items-center gap-4">
                                <Avatar className="w-16 h-16 border-2 border-primary">
                                    <AvatarImage src={student.avatar} alt={student.name} />
                                    <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-2xl">
                                        {student.name}
                                    </CardTitle>
                                    <CardDescription>{student.email}</CardDescription>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/70">
                                {earnedBadges.slice(0, 3).map(badge => (
                                     <BadgeCard key={badge.title} {...badge} />
                                ))}
                                <div className="flex items-center gap-4 text-right pl-4 border-l">
                                   <Flame className="w-8 h-8 text-orange-500 animation-pulse" />
                                   <div>
                                        <p className="text-2xl font-bold">{student.streak || 0}</p>
                                        <p className="text-sm text-muted-foreground">Day Streak</p>
                                   </div>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                     <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <InfoItem label="Enrollment No." value={student.enrollmentNumber} />
                        <InfoItem label="Department" value={student.department} />
                        <InfoItem label="Class" value={student.className} />
                        <InfoItem label="Roll No" value={student.rollNumber} />
                    </CardContent>
                </Card>
                
                <ScheduleCalendar 
                    schedule={dashboardData.schedule}
                    leaveRequests={dashboardData.leaveRequests}
                    events={dashboardData.events}
                    onDayClick={handleDayClick}
                />

            </div>
            <div className="lg:col-span-1 space-y-6 animate-in fade-in-0 slide-in-from-left-8 duration-500 delay-300">
                 <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-4">
                        {features.map((feature) => (
                             <Card key={feature.title} className="group relative flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer bg-secondary/50 hover:bg-secondary" onClick={feature.onClick}>
                                <feature.icon className="w-8 h-8 mb-2 text-primary" />
                                <h3 className="font-semibold text-xs">{feature.title}</h3>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Leave Request Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {dashboardData.leaveRequests.length > 0 ? (
                            <div className="space-y-4">
                                {dashboardData.leaveRequests.slice(0, 3).map(request => (
                                    <div key={request.id} className="flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-medium">
                                                {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd')}
                                            </p>
                                            <p className="text-xs text-muted-foreground truncate">{request.reason}</p>
                                        </div>
                                        <Badge variant={
                                            request.status === 'approved' ? 'default' :
                                            request.status === 'rejected' ? 'destructive' :
                                            'secondary'
                                        } className="capitalize">
                                            {request.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No leave requests submitted yet.</p>
                        )}
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
          studentId={student.id}
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
         <HostelDialog
            isOpen={isHostelOpen}
            onOpenChange={setHostelOpen}
            studentId={student.id}
         />
        <AssignmentsDialog
          isOpen={isAssignmentsOpen}
          onOpenChange={setAssignmentsOpen}
          assignments={assignments}
          studentId={student.id}
        />
        {isLeaderboardOpen && (
            <LeaderboardDialog
                isOpen={isLeaderboardOpen}
                onOpenChange={setLeaderboardOpen}
                student={student}
            />
        )}
        
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
                <DialogHeader><DialogTitle>{eventDialogTitle}</DialogTitle><DialogDescription>{eventDialogDescription}</DialogDescription></DialogHeader>
                 {dialogAction === 'reminder' ? (
                     <div className="grid gap-4 py-4">
                        <div className="space-y-2"><Label htmlFor="event-title">Title</Label><Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Project Deadline" disabled={isSubmitting}/></div>
                        <div className="flex items-center space-x-2"><Switch id="reminder" checked={eventReminder} onCheckedChange={setEventReminder} disabled={isSubmitting}/><Label htmlFor="reminder">Set Reminder Time</Label></div>
                        {eventReminder && <div className="space-y-2"><Label htmlFor="reminder-time">Time</Label><Input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isSubmitting}/></div>}
                    </div>
                 ) : (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2"><Label htmlFor="reason-note">Note</Label><Textarea id="reason-note" placeholder="Add a note for yourself..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={isSubmitting}/></div>
                    </div>
                 )}
                <DialogFooter><Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button><Button onClick={handleEventSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
  );
}

    
