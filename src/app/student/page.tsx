
'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, ClipboardList, BookCheck, BarChart3, Wallet, Home, Loader2, Flame, FolderKanban, ShieldCheck, Gem, Trophy } from "lucide-react";
import type { Student, EnrichedSchedule, Event, LeaveRequest, EnrichedResult, EnrichedExam, EnrichedAssignment, Submission, EnrichedAttendance, EnrichedFee } from '@/lib/types';
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
import { cn } from '@/lib/utils';

const InfoItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col min-w-0">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">{label}</span>
        <span className="font-bold text-sm truncate">{value}</span>
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
      { title: "Time Table", icon: Calendar, onClick: () => setTimetableModalOpen(true), color: "bg-blue-500/10 text-blue-600" },
      { title: "Attendance", icon: ClipboardList, onClick: () => setAttendanceOpen(true), color: "bg-green-500/10 text-green-600" },
      { title: "Assignments", icon: FolderKanban, onClick: () => setAssignmentsOpen(true), color: "bg-orange-500/10 text-orange-600" },
      { title: "Leaderboards", icon: Trophy, onClick: () => setLeaderboardOpen(true), color: "bg-yellow-500/10 text-yellow-600" },
      { title: "Exam Dates", icon: BookCheck, onClick: () => setExamsOpen(true), color: "bg-red-500/10 text-red-600" },
      { title: "Marksheets", icon: BarChart3, onClick: () => setResultsOpen(true), color: "bg-purple-500/10 text-purple-600" },
      { title: "Fees & Dues", icon: Wallet, onClick: () => setFeesOpen(true), color: "bg-emerald-500/10 text-emerald-600" },
      { title: "Hostel Hub", icon: Home, onClick: () => setHostelOpen(true), color: "bg-sky-500/10 text-sky-600" },
  ];

  const earnedBadges = useMemo(() => {
    if (!dashboardData) return [];
    const { student, attendance } = dashboardData;
    const badges = [];

    if (student.cgpa >= 9.5) badges.push({ title: 'Titan Scholar', icon: Gem, description: 'CGPA of 9.5 or higher' });
    else if (student.cgpa >= 9.0) badges.push({ title: 'Oracle', icon: Gem, description: 'CGPA of 9.0 or higher' });
    else if (student.cgpa >= 8.0) badges.push({ title: 'Prodigy', icon: Gem, description: 'CGPA of 8.0 or higher' });

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
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        </DashboardLayout>
    );
  }

  const { student } = dashboardData;

  return (
    <DashboardLayout pageTitle="Student Dashboard" role="student">
        <div className="flex flex-col gap-8 pb-12">
            
            {/* Header Identity Card */}
            <Card className="border-none shadow-sm bg-card/50 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000 rotate-12">
                    <BrainCircuit className="h-48 w-48" />
                </div>
                <CardHeader className="relative z-10 border-b pb-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                         <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                            <div className="relative">
                                <Avatar className="w-20 h-20 border-4 border-background shadow-xl">
                                    <AvatarImage src={student.avatar} alt={student.name} />
                                    <AvatarFallback className="bg-primary/10 text-primary font-black text-2xl">{student.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-white rounded-full p-1.5 shadow-lg border-2 border-background">
                                    <Flame className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <CardTitle className="text-3xl font-black font-headline tracking-tight">
                                    {student.name}
                                </CardTitle>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-80">{student.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 p-2 px-4 rounded-3xl bg-background/60 backdrop-blur-sm border shadow-sm">
                            {earnedBadges.slice(0, 3).map(badge => (
                                 <BadgeCard key={badge.title} {...badge} />
                            ))}
                            <div className="h-10 w-px bg-border mx-2" />
                            <div className="text-right">
                                <p className="text-2xl font-black text-primary leading-none">{student.streak || 0}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Day Streak</p>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-muted/10 relative z-10">
                    <InfoItem label="Enrollment No." value={student.enrollmentNumber} />
                    <InfoItem label="Department" value={student.department} />
                    <InfoItem label="Current Class" value={student.className} />
                    <InfoItem label="Roll Number" value={student.rollNumber} />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-8">
                    <DashboardSection title="Academic Tools">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {features.map((feature) => (
                                 <Card 
                                    key={feature.title} 
                                    className="group relative flex flex-col items-center justify-center p-4 h-32 text-center transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 cursor-pointer rounded-2xl bg-card/40 hover:-translate-y-1" 
                                    onClick={feature.onClick}
                                >
                                    <div className={cn("p-3 rounded-2xl mb-3 group-hover:scale-110 transition-transform duration-300 shadow-inner", feature.color)}>
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-[10px] uppercase tracking-widest">{feature.title}</h3>
                                </Card>
                            ))}
                        </div>
                    </DashboardSection>
                    
                    <div className="hidden md:block">
                        <ScheduleCalendar 
                            schedule={dashboardData.schedule}
                            leaveRequests={dashboardData.leaveRequests}
                            events={dashboardData.events}
                            onDayClick={handleDayClick}
                        />
                    </div>
                </div>

                {/* Sidebar Intelligence Area */}
                <div className="space-y-8">
                    <Card className="border-none shadow-sm bg-card/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Live Feed</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black uppercase text-primary/60 tracking-widest flex items-center gap-2">
                                    <Calendar className="h-3 w-3" /> Today's Sessions
                                </h4>
                                {todaysSchedule.length > 0 ? (
                                    <div className="space-y-3">
                                    {todaysSchedule.map(slot => (
                                        <div key={slot.id} className="flex justify-between items-center p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/10 transition-colors">
                                            <div className="min-w-0">
                                                <p className="font-bold text-xs truncate">{slot.subjectName}</p>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase">{slot.time} &bull; {slot.facultyName}</p>
                                            </div>
                                            <Badge variant="outline" className="rounded-lg text-[9px] px-1.5 h-5 font-black shrink-0 ml-2">Slot Active</Badge>
                                        </div>
                                    ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 rounded-2xl bg-muted/10 border border-dashed">
                                        <p className="text-[10px] font-black text-muted-foreground/40 uppercase">No sessions active today</p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h4 className="text-[10px] font-black uppercase text-orange-500/60 tracking-widest flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> Leave Requests
                                </h4>
                                {dashboardData.leaveRequests.length > 0 ? (
                                    <div className="space-y-3">
                                        {dashboardData.leaveRequests.slice(0, 2).map(request => (
                                            <div key={request.id} className="flex justify-between items-center p-3 rounded-2xl bg-muted/10">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-bold truncate">{request.reason}</p>
                                                    <p className="text-[9px] font-black text-muted-foreground uppercase mt-0.5">
                                                        {format(new Date(request.startDate), 'MMM dd')} - {format(new Date(request.endDate), 'MMM dd')}
                                                    </p>
                                                </div>
                                                <Badge variant={
                                                    request.status === 'approved' ? 'default' :
                                                    request.status === 'rejected' ? 'destructive' :
                                                    'secondary'
                                                } className="rounded-lg text-[8px] h-5 uppercase font-black shrink-0 ml-2">
                                                    {request.status}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] font-black text-center text-muted-foreground/40 uppercase">No active requests</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm bg-primary/5 overflow-hidden relative">
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Academic Pulse</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-muted-foreground">Semester GPA (SGPA)</span>
                                    <span className="text-primary">{student.sgpa.toFixed(2)}</span>
                                </div>
                                <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${(student.sgpa / 10) * 100}%` }} />
                                </div>
                            </div>
                            <div className="space-y-1.5 pt-2">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-muted-foreground">Attendance Punctuality</span>
                                    <span className="text-emerald-600">Active</span>
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground leading-tight italic">
                                    Maintain your {student.streak} day streak to unlock the 'Vanguard' badge.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>

        {/* Dash Modal Components */}
        <Dialog open={isTimetableModalOpen} onOpenChange={setTimetableModalOpen}>
            <DialogContent className="max-w-5xl rounded-3xl p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/20">
                    <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">Weekly Timetable Matrix</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-6 bg-card"><TimetableView /></div>
                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={() => setTimetableModalOpen(false)} className="rounded-xl font-bold">Dismiss Console</Button>
                </DialogFooter>
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
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Academic Leave Portal</DialogTitle>
                    <DialogDescription className="text-xs font-medium">Submit absence justification for approval.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    {dialogAction === 'leave' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="start-date" className="text-[10px] font-bold uppercase tracking-widest ml-1">Start Date</Label>
                            <Input id="start-date" type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} disabled={isSubmitting} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="end-date" className="text-[10px] font-bold uppercase tracking-widest ml-1">End Date</Label>
                            <Input id="end-date" type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} min={leaveStartDate} disabled={isSubmitting} className="rounded-xl" />
                        </div>
                    </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-[10px] font-bold uppercase tracking-widest ml-1">Reason / Justification</Label>
                        <Textarea id="reason" placeholder="Briefly state your reason..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={isSubmitting} className="rounded-xl min-h-[100px]" />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setLeaveDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleLeaveSubmit} disabled={isSubmitting} className="rounded-xl font-bold bg-primary px-8">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Send Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isEventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight">Custom Reminder</DialogTitle>
                    <DialogDescription className="text-xs font-medium">{selectedDate ? format(selectedDate, 'PPP') : ''}</DialogDescription>
                </DialogHeader>
                 <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-title" className="text-[10px] font-bold uppercase tracking-widest ml-1">Reminder Subject</Label>
                        <Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Workshop Registration" disabled={isSubmitting} className="rounded-xl" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-dashed">
                        <Label htmlFor="reminder" className="text-xs font-bold uppercase tracking-widest">Enable Alert</Label>
                        <Switch id="reminder" checked={eventReminder} onValueChange={setEventReminder} disabled={isSubmitting}/>
                    </div>
                    {eventReminder && (
                        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2">
                            <Label htmlFor="reminder-time" className="text-[10px] font-bold uppercase tracking-widest ml-1">Alert Time</Label>
                            <Input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isSubmitting} className="rounded-xl" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEventDialogOpen(false)} className="rounded-xl font-bold">Discard</Button>
                    <Button onClick={handleEventSubmit} disabled={isSubmitting} className="rounded-xl font-bold bg-primary px-8">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Save Event'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </DashboardLayout>
  );
}

const DashboardSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="space-y-4">
        <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">{title}</h3>
        {children}
    </div>
);

const Mail = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
