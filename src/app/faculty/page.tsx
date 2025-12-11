
'use client';

import { useEffect, useState, useTransition, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import ScheduleView from "./components/ScheduleView";
import { Bell, Flame, Loader2, Calendar as CalendarIcon, Send, BookOpen, CalendarDays, Circle, Dot, Plus, Trash2, ArrowRight, ChevronLeft, ChevronRight, CheckSquare, GraduationCap } from "lucide-react";
import { getStudents } from '@/lib/services/students';
import { getNotificationsForUser } from '@/lib/services/notifications';
import type { Student, Notification, Subject, EnrichedSchedule, LeaveRequest, Event, SyllabusModule } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addLeaveRequest, getLeaveRequests } from '@/lib/services/leave';
import { getSubjectsForStudent, getTimetableDataForStudent } from '../student/actions';
import { addEvent, deleteEvent, getEventsForUser, checkForEventReminders } from '@/lib/services/events';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { holidays } from '@/lib/holidays';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { getFaculty, updateFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import type { Faculty as FacultyType } from '@/lib/types';
import AttendanceDialog from './components/AttendanceDialog';
import { getSubjects, updateSubject } from '@/lib/services/subjects';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';


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
  onAttendanceClick,
}: {
  schedule: EnrichedSchedule[],
  leaveRequests: LeaveRequest[],
  events: Event[],
  onDayClick: (date: Date) => void,
  onAttendanceClick: (slot: EnrichedSchedule, date: Date) => void,
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
        <Popover key={day.toString()}>
          <PopoverTrigger asChild>
            <div
                className={`border-t border-r border-gray-200 dark:border-gray-700 p-2 flex flex-col cursor-pointer transition-colors hover:bg-accent/50 ${
                !isCurrentMonth ? 'bg-muted/30' : 'bg-background'
                } min-h-[10rem] md:min-h-[8rem] lg:min-h-[10rem]`}
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
          </PopoverTrigger>
          <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
              <div className="grid gap-4">
                <div className="space-y-2">
                    <h4 className="font-medium leading-none">{format(day, 'PPP')}</h4>
                </div>
                {(daySchedule.length > 0 || dayEvents.length > 0) ? (
                    <div className="grid gap-2">
                        {daySchedule.map(slot => (
                            <div key={slot.id} className="p-2 rounded-md bg-primary/10 flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-sm">{slot.subjectName}</p>
                                    <p className="text-xs text-muted-foreground">{slot.time}</p>
                                </div>
                                {isToday(day) && (
                                    <Button size="sm" variant="ghost" onClick={() => onAttendanceClick(slot, day)}>
                                        <CheckSquare className="w-4 h-4 mr-2"/>
                                        Attendance
                                    </Button>
                                )}
                            </div>
                        ))}
                         {dayEvents.map(event => (
                            <div key={event.id} className="p-2 rounded-md bg-accent/80 flex items-center justify-between">
                                <p className="font-semibold text-sm">{event.title}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No classes or events scheduled.</p>
                )}
                 <Button size="sm" onClick={() => onDayClick(day)} className="mt-2">
                    <Plus className="h-4 w-4 mr-2"/>
                    Add Event
                </Button>
              </div>
          </PopoverContent>
        </Popover>
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


export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [isScheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFaculty, setCurrentFaculty] = useState<FacultyType | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [schedule, setSchedule] = useState<EnrichedSchedule[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventReminder, setEventReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [isPending, startTransition] = useTransition();

  const [isAttendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedSlotForAttendance, setSelectedSlotForAttendance] = useState<EnrichedSchedule | null>(null);
  const [selectedDateForAttendance, setSelectedDateForAttendance] = useState<Date>(new Date());
  
  const [isSyllabusDialogOpen, setSyllabusDialogOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabusContent, setSyllabusContent] = useState('');
  
  const parseSyllabus = (syllabusString?: string): SyllabusModule[] => {
    if (!syllabusString) return [];
    try {
      const parsed = JSON.parse(syllabusString);
      return parsed.modules || [];
    } catch (error) {
      console.error("Failed to parse syllabus:", error);
      return [];
    }
  };


  const loadData = async () => {
        if (user) {
            setIsLoading(true);
            const [
              allFaculty, 
              allSchedule, 
              allLeaveRequests,
              userEvents,
              allSubjects
            ] = await Promise.all([
                getFaculty(),
                getSchedule(),
                getLeaveRequests(),
                getEventsForUser(user.id),
                getSubjects()
            ]);
            
            const fac = allFaculty.find(f => f.id === user.id);
            if (fac) setCurrentFaculty(fac);
            
            const facultySchedule = allSchedule.filter(s => s.facultyId === user.id) as EnrichedSchedule[];
            setSchedule(facultySchedule);
            setLeaveRequests(allLeaveRequests.filter(lr => lr.requesterId === user.id));
            setEvents(userEvents);

            const taughtSubjectIds = new Set(facultySchedule.map(s => s.subjectId));
            setSubjects(allSubjects.filter(s => taughtSubjectIds.has(s.id)));

            setIsLoading(false);
        }
    }

  useEffect(() => {
    if (user) {
        loadData();
        const interval = setInterval(() => {
            checkForEventReminders(user.id).then(() => {
                getNotificationsForUser(user.id).then(setNotifications);
            });
        }, 60000); // Check every minute
        return () => clearInterval(interval);
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
  
   const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setEventDialogOpen(true);
  };

  const handleAttendanceClick = (slot: EnrichedSchedule, date: Date) => {
    setSelectedSlotForAttendance(slot);
    setSelectedDateForAttendance(date);
    setAttendanceDialogOpen(true);
  }
  
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
        reminderTime: eventReminder ? reminderTime : undefined,
      });
      toast({ title: 'Event Added', description: 'Your event has been saved.' });
      setEventDialogOpen(false);
      setEventTitle('');
      setEventReminder(true);
      await loadData();
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

  const handleEditSyllabus = (subject: Subject) => {
    setSelectedSubject(subject);
    setSyllabusContent(subject.syllabus || '');
    setSyllabusDialogOpen(true);
  };
  
  const handleSaveSyllabus = async () => {
    if (!selectedSubject) return;
    setIsSubmitting(true);
    try {
        await updateSubject({
            ...selectedSubject,
            syllabus: syllabusContent,
        });
        toast({ title: 'Syllabus Updated', description: `Syllabus for ${selectedSubject.name} has been saved.`});
        setSyllabusDialogOpen(false);
        setSelectedSubject(null);
        await loadData();
    } catch(error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
    </DashboardLayout>
  }
  

  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
       <div className="space-y-6">
            <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 col-span-full">
                <CardHeader>
                    <CardTitle>Welcome, {user?.name || "Faculty Member"}!</CardTitle>
                    <CardDescription>
                        This is your central hub for managing your schedule and administrative tasks.
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
                            <CardDescription>Your class days and personal events. Click a day to view details or add an event.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <ScheduleCalendar 
                                schedule={schedule} 
                                leaveRequests={leaveRequests} 
                                events={events}
                                onDayClick={handleDayClick}
                                onAttendanceClick={handleAttendanceClick}
                            />
                        </CardContent>
                    </Card>
                </div>
                 <div className="lg:col-span-1 space-y-6">
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
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
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-400">
                        <CardHeader>
                            <CardTitle>Request Leave</CardTitle>
                            <CardDescription>Submit a request for a leave of absence.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-500">
                        <CardHeader>
                            <CardTitle>Manage Schedule</CardTitle>
                            <CardDescription>View your weekly schedule and request changes.</CardDescription>
                        </CardHeader>
                        <CardContent>
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
                    <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-600">
                         <CardHeader>
                            <CardTitle className='flex items-center'><GraduationCap className="mr-2 h-5 w-5" />My Subjects & Syllabus</CardTitle>
                            <CardDescription>View and edit syllabus for your subjects.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Browse the subjects you teach and manage their syllabus content.
                            </p>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={() => setSyllabusDialogOpen(true)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Manage Syllabus
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
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
      
      <Dialog open={isSyllabusDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setSelectedSubject(null);
        setSyllabusDialogOpen(isOpen);
      }}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>My Subjects</DialogTitle>
                <DialogDescription>
                    {selectedSubject ? `Editing syllabus for ${selectedSubject.name}` : 'Select a subject to view or edit its syllabus.'}
                </DialogDescription>
            </DialogHeader>
            {selectedSubject ? (
                <div className="grid gap-4 py-4">
                    <Label htmlFor="syllabus">Syllabus (JSON format)</Label>
                    <Textarea 
                        id="syllabus"
                        value={syllabusContent}
                        onChange={(e) => setSyllabusContent(e.target.value)}
                        className="h-64"
                        placeholder='e.g., {"modules":[{"name":"Module 1","topics":["Topic A"],"weightage":"50%"}]}'
                        disabled={isSubmitting}
                    />
                </div>
            ) : (
                <ScrollArea className="h-96">
                    <Accordion type="single" collapsible className="w-full">
                         {subjects.map(subject => {
                            const syllabusModules = parseSyllabus(subject.syllabus);
                            return (
                                <AccordionItem value={subject.id} key={subject.id}>
                                    <AccordionTrigger>
                                        <div className="flex justify-between items-center w-full pr-4">
                                            <div className="flex flex-col text-left">
                                                <h3 className="font-semibold">{subject.name}</h3>
                                                <p className="text-sm text-muted-foreground">{subject.code}</p>
                                            </div>
                                             <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleEditSyllabus(subject); }}>
                                                Edit Syllabus
                                            </Button>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        {syllabusModules.length > 0 ? (
                                            <div className="space-y-4 pl-2">
                                                {syllabusModules.map((mod, index) => (
                                                    <div key={index} className="border-l-2 pl-4">
                                                        <div className="flex justify-between items-center">
                                                            <h4 className="font-medium text-base">{mod.name}</h4>
                                                            <Badge variant="secondary">{mod.weightage}</Badge>
                                                        </div>
                                                        <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                                                            {mod.topics.map((topic, i) => <li key={i}>{topic}</li>)}
                                                        </ul>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted-foreground text-sm pl-4">Syllabus not available. Click "Edit Syllabus" to add it.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                </ScrollArea>
            )}
            <DialogFooter>
                {selectedSubject ? (
                    <>
                        <Button variant="outline" onClick={() => setSelectedSubject(null)} disabled={isSubmitting}>Back</Button>
                        <Button onClick={handleSaveSyllabus} disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Syllabus
                        </Button>
                    </>
                ) : (
                    <Button variant="outline" onClick={() => setSyllabusDialogOpen(false)}>Close</Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>


      {isAttendanceDialogOpen && selectedSlotForAttendance && (
        <AttendanceDialog
            slot={selectedSlotForAttendance}
            date={selectedDateForAttendance}
            isOpen={isAttendanceDialogOpen}
            onOpenChange={setAttendanceDialogOpen}
        />
      )}
    </DashboardLayout>
  );
}
