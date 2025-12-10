

'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import TimetableView from "./components/TimetableView";
import { Bell, Flame, Loader2, Calendar as CalendarIcon, Send, BookOpen, CalendarDays, Circle, Dot, Plus, Trash2, ArrowRight, ChevronLeft, ChevronRight, AlertCircle, Check, HelpCircle, BarChart3 } from "lucide-react";
import { getStudents } from '@/lib/services/students';
import { getNotificationsForUser } from '@/lib/services/notifications';
import type { Student, Notification, Subject, EnrichedSchedule, LeaveRequest, Event, EnrichedAttendance, EnrichedResult } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addLeaveRequest, getLeaveRequests } from '@/lib/services/leave';
import { getSubjectsForStudent, getTimetableDataForStudent } from './actions';
import { addEvent, deleteEvent, getEventsForUser, checkForEventReminders } from '@/lib/services/events';
import { getResultsForStudent } from '@/lib/services/results';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { holidays } from '@/lib/holidays';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStudentAttendance, disputeAttendance } from '@/lib/services/attendance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function getDatesInRange(startDate: Date, endDate: Date) {
  const dates = [];
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

function ScheduleCalendar({ 
  schedule, 
  leaveRequests,
  events,
  onDayClick,
}: { 
  schedule: EnrichedSchedule[], 
  leaveRequests: LeaveRequest[],
  events: Event[],
  onDayClick: (date: Date) => void,
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const approvedLeaveDates = useMemo(() => 
    new Set(leaveRequests
        .filter(lr => lr.status === 'approved')
        .flatMap(lr => getDatesInRange(new Date(lr.startDate), new Date(lr.endDate)))
        .map(d => format(d, 'yyyy-MM-dd')))
  , [leaveRequests]);

  const holidayDates = useMemo(() =>
    new Set(holidays.map(h => format(h.date, 'yyyy-MM-dd')))
  , []);
  
  const eventDates = useMemo(() => {
    const dateMap = new Map<string, Event[]>();
    events.forEach(e => {
      const dateStr = format(parseISO(e.date), 'yyyy-MM-dd');
      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(e);
    });
    return dateMap;
  }, [events]);

  const scheduleDates = useMemo(() => {
    const dateMap = new Map<string, EnrichedSchedule[]>();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    eachDayOfInterval({start: monthStart, end: monthEnd}).forEach(date => {
        const dayName = format(date, 'EEEE'); // Monday, Tuesday etc.
        const todaysScheduledSlots = schedule.filter(s => s.day === dayName);
        if (todaysScheduledSlots.length > 0) {
            dateMap.set(format(date, 'yyyy-MM-dd'), todaysScheduledSlots);
        }
    });
    return dateMap;
  }, [schedule, currentMonth]);


  const renderDayCell = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isCurrentToday = isToday(day);

    const dayEvents = eventDates.get(dayStr) || [];
    const daySchedule = scheduleDates.get(dayStr) || [];
    const isLeave = approvedLeaveDates.has(dayStr);
    const isHoliday = holidayDates.has(dayStr);
    
    return (
      <div
        key={day.toString()}
        className={`border-t border-r border-gray-200 dark:border-gray-700 p-2 flex flex-col cursor-pointer transition-colors hover:bg-accent/50 ${
          !isCurrentMonth ? 'bg-muted/30' : 'bg-background'
        } min-h-[10rem] md:min-h-[8rem] lg:min-h-[10rem]`}
        onClick={() => onDayClick(day)}
      >
        <div className="flex justify-between items-center">
            <time dateTime={dayStr} className={`text-sm font-medium ${isCurrentToday ? 'bg-primary text-primary-foreground rounded-full flex items-center justify-center h-6 w-6' : ''}`}>
              {format(day, 'd')}
            </time>
        </div>
        <div className="flex-grow overflow-y-auto text-xs space-y-1 mt-1">
            {isLeave && <Badge variant="destructive" className="w-full justify-center">On Leave</Badge>}
            {isHoliday && <Badge variant="secondary" className="w-full justify-center bg-blue-100 text-blue-800">Holiday</Badge>}
            {daySchedule.slice(0, 1).map(s => <div key={s.id} className="p-1 rounded bg-primary/10 text-primary truncate">{s.subjectName}</div>)}
            {dayEvents.slice(0, 1).map(e => <div key={e.id} className="p-1 rounded bg-accent/80 text-accent-foreground truncate">{e.title}</div>)}
            {(daySchedule.length + dayEvents.length) > 1 && <div className="text-muted-foreground">+ {daySchedule.length + dayEvents.length - 1} more</div>}
        </div>
      </div>
    );
  };

  return (
     <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{format(currentMonth, 'MMMM yyyy')}</CardTitle>
            <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                 <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="grid grid-cols-7 text-center font-semibold text-sm text-muted-foreground border-b border-r border-gray-200 dark:border-gray-700">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 border-t">{day}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 h-full">
                {daysInMonth.map(renderDayCell)}
            </div>
        </CardContent>
    </Card>
  )
}

function AttendanceTracker() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: attendanceRecords, isLoading } = useQuery({
        queryKey: ['studentAttendance', user?.id],
        queryFn: () => getStudentAttendance(user!.id),
        enabled: !!user,
    });
    
    const disputeMutation = useMutation({
        mutationFn: (attendanceId: string) => disputeAttendance(attendanceId, user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['studentAttendance', user?.id] });
            toast({ title: 'Concern Raised', description: 'Your attendance concern has been sent to your faculty for review.' });
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const getStatusVariant = (status: EnrichedAttendance['status']) => {
        switch (status) {
            case 'present': return 'default';
            case 'absent': return 'destructive';
            case 'disputed': return 'secondary';
        }
    };

    if (isLoading) return <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>;

    if (!attendanceRecords || attendanceRecords.length === 0) {
        return <p className="text-sm text-muted-foreground text-center p-4">No recent attendance records found.</p>
    }

    return (
        <ScrollArea className="h-72">
            <div className="space-y-3 pr-4">
                {attendanceRecords.map(record => (
                    <div key={record.id} className="flex items-center justify-between p-2 rounded-md border">
                        <div>
                            <p className="font-semibold text-sm">{record.subjectName}</p>
                            <p className="text-xs text-muted-foreground">{format(parseISO(record.date), 'PPP')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                             {record.status === 'absent' && !record.isLocked && (
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={disputeMutation.isPending}>
                                            <HelpCircle className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Raise a Concern?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                If you believe you were marked absent by mistake, you can raise a concern. This will notify your faculty member to review this record.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => disputeMutation.mutate(record.id)}>
                                                Confirm & Raise Concern
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}
                             {record.isLocked && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Check className="h-4 w-4 text-green-500"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Attendance for this day is locked.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    )
}

function ResultsView({ student, results }: { student: Student | null, results: EnrichedResult[] }) {
    const [isDialogOpen, setDialogOpen] = useState(false);
    
    const resultsBySemester = useMemo(() => {
        const grouped: Record<number, EnrichedResult[]> = {};
        results.forEach(r => {
            if (!grouped[r.semester]) {
                grouped[r.semester] = [];
            }
            grouped[r.semester].push(r);
        });
        return grouped;
    }, [results]);

    const semesters = Object.keys(resultsBySemester).map(Number).sort((a,b) => a-b);
    
    return (
        <Card className="flex flex-col animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200">
            <CardHeader>
                <CardTitle className="flex items-center"><BarChart3 className="mr-2 h-5 w-5" />My Results</CardTitle>
                <CardDescription>Your SGPA and CGPA.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-3xl font-bold">{student?.sgpa.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Current SGPA</p>
                </div>
                 <div>
                    <p className="text-3xl font-bold">{student?.cgpa.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Overall CGPA</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button onClick={() => setDialogOpen(true)} className='w-full'>
                    View Detailed Results
                </Button>
            </CardFooter>

             <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Detailed Results</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[70vh]">
                        <div className="space-y-6 pr-4">
                            {semesters.map(semester => (
                                <Card key={semester}>
                                    <CardHeader>
                                        <CardTitle>Semester {semester}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead>Marks</TableHead>
                                                    <TableHead>Grade</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {resultsBySemester[semester].map(res => (
                                                    <TableRow key={res.id}>
                                                        <TableCell>{res.subjectName}</TableCell>
                                                        <TableCell>{res.marks}/{res.totalMarks}</TableCell>
                                                        <TableCell>{res.grade}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [student, setStudent] = useState<Student | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isCatalogOpen, setCatalogOpen] = useState(false);
  const [isTimetableModalOpen, setTimetableModalOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<EnrichedSchedule[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [results, setResults] = useState<EnrichedResult[]>([]);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventReminder, setEventReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
      if (user) {
        setIsLoading(true);
        const [
            studentData, 
            userNotifications, 
            timetableData, 
            allLeaveRequests,
            userEvents,
            studentResults
        ] = await Promise.all([
            getStudents(),
            getNotificationsForUser(user.id),
            getTimetableDataForStudent(user.id),
            getLeaveRequests(),
            getEventsForUser(user.id),
            getResultsForStudent(user.id)
        ]);

        const currentStudent = studentData.find(s => s.id === user.id);
        if (currentStudent) {
            setStudent(currentStudent);
            const studentSubjects = await getSubjectsForStudent(currentStudent.id);
            setSubjects(studentSubjects);
        }
        
        setNotifications(userNotifications);
        setSchedule(timetableData.schedule);
        setLeaveRequests(allLeaveRequests.filter(lr => lr.requesterId === user.id));
        setEvents(userEvents);
        setResults(studentResults);
        setIsLoading(false);
      }
    }

  useEffect(() => {
    if (user) {
        loadData();
        checkForEventReminders(user.id).then(() => {
            getNotificationsForUser(user.id).then(setNotifications);
        });
    }
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

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const eventsOnDay = events.filter(e => format(parseISO(e.date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    if (eventsOnDay.length > 0) {
      // Logic to show popover is handled by PopoverTrigger
    } else {
      setEventDialogOpen(true);
    }
  };
  
  const handleAddEvent = async () => {
    if (!user || !selectedDate || !eventTitle) {
      toast({ title: 'Missing Information', description: 'Please provide a title for the event.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      await addEvent({
        userId: user.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        title: eventTitle,
        reminder: eventReminder,
        reminderTime: eventReminder ? reminderTime : undefined
      });
      toast({ title: 'Event Added', description: 'Your event has been saved.' });
      setEventDialogOpen(false);
      setEventTitle('');
      setEventReminder(true);
      await loadData(); // Reload all data
    } catch(error) {
       toast({ title: 'Error', description: 'Failed to add event.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDeleteEvent = async (id: string) => {
    startTransition(async () => {
      try {
        await deleteEvent(id);
        toast({ title: 'Event Deleted' });
        await loadData();
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete event.', variant: 'destructive' });
      }
    });
  }

  const selectedDateEvents = selectedDate ? events.filter(e => format(parseISO(e.date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];

  if (isLoading) {
    return (
        <DashboardLayout pageTitle="Student Dashboard" role="student">
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardLayout>
    )
  }

  return (
    <DashboardLayout pageTitle="Student Dashboard" role="student">
       <div className="space-y-6">
            <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 col-span-full">
                <CardHeader>
                    <CardTitle>Welcome, {user?.name || 'Student'}!</CardTitle>
                    <CardDescription>
                        Here's your dashboard with your schedule and other useful links.
                    </CardDescription>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <CalendarDays className="w-5 h-5 mr-2" />
                                Monthly Calendar
                            </CardTitle>
                            <CardDescription>Your class days and personal events. Click a day to add an event.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                             <Popover>
                                <PopoverTrigger asChild>
                                    <div className="w-full">
                                        <ScheduleCalendar 
                                            schedule={schedule} 
                                            leaveRequests={leaveRequests} 
                                            events={events}
                                            onDayClick={handleDayClick}
                                        />
                                    </div>
                                </PopoverTrigger>
                                {selectedDateEvents.length > 0 && (
                                    <PopoverContent className="w-80">
                                    <div className="grid gap-4">
                                        <div className="space-y-2">
                                        <h4 className="font-medium leading-none">Events for {format(selectedDate!, 'PPP')}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            You have {selectedDateEvents.length} event(s) today.
                                        </p>
                                        </div>
                                        <div className="grid gap-2">
                                        {selectedDateEvents.map(event => (
                                            <div key={event.id} className="grid grid-cols-[1fr_auto] items-center">
                                            <p className="text-sm font-medium">{event.title}</p>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteEvent(event.id)} disabled={isPending}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            </div>
                                        ))}
                                        </div>
                                        <Button size="sm" onClick={() => setEventDialogOpen(true)} className="mt-2">
                                        <Plus className="h-4 w-4 mr-2"/>
                                        Add Event
                                        </Button>
                                    </div>
                                    </PopoverContent>
                                )}
                            </Popover>
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <ResultsView student={student} results={results} />
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-200">
                        <CardHeader>
                            <CardTitle>My Attendance</CardTitle>
                            <CardDescription>View your recent attendance and raise concerns.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <AttendanceTracker />
                        </CardContent>
                    </Card>
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300 flex flex-col">
                        <CardHeader>
                            <CardTitle>My Timetable</CardTitle>
                            <CardDescription>View your detailed weekly schedule.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground">
                                Access your full timetable to see all your classes for the week.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => setTimetableModalOpen(true)}>
                                View Timetable <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-400">
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
                    <Card className="flex flex-col animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-500">
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
                    <Card className="flex flex-col animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-600">
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
                </div>
            </div>
       </div>

        <Dialog open={isTimetableModalOpen} onOpenChange={setTimetableModalOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>My Weekly Timetable</DialogTitle>
                    <DialogDescription>
                        Here are your scheduled classes for the week.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1">
                    <TimetableView />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setTimetableModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


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
                  onChange={(e) => setLeaveStartDate(e.target.value ?? '')}
                  disabled={isSubmitting}
                />
              </div>
               <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input 
                  id="end-date" 
                  type="date"
                  value={leaveEndDate}
                  onChange={(e) => setLeaveEndDate(e.target.value ?? '')}
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
      
      <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
        if (!open) {
            setEventTitle('');
            setEventReminder(true);
        }
        setEventDialogOpen(open);
      }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Event</DialogTitle>
                <DialogDescription>Add a new event for {selectedDate ? format(selectedDate, 'PPP') : ''}</DialogDescription>
            </DialogHeader>
             <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="event-title" className="text-right">
                      Title
                  </Label>
                  <Input
                      id="event-title"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      className="col-span-3"
                      placeholder="e.g. John's Birthday"
                      disabled={isSubmitting}
                  />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="reminder" className="text-right flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Reminder
                    </Label>
                    <div className="col-span-3 flex items-center">
                        <Switch
                            id="reminder"
                            checked={eventReminder}
                            onCheckedChange={setEventReminder}
                            disabled={isSubmitting}
                        />
                    </div>
                </div>
                {eventReminder && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="reminder-time" className="text-right">Time</Label>
                        <Input 
                            id="reminder-time"
                            type="time"
                            value={reminderTime}
                            onChange={(e) => setReminderTime(e.target.value)}
                            className="col-span-3"
                            disabled={isSubmitting}
                        />
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEventDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleAddEvent} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Event
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

    