

'use client';

import { useEffect, useState, useTransition } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import TimetableView from "./components/TimetableView";
import { Bell, Flame, Loader2, Calendar as CalendarIcon, Send, BookOpen, CalendarDays, Circle, Dot, Plus, Trash2 } from "lucide-react";
import { getStudents } from '@/lib/services/students';
import { getNotificationsForUser } from '@/lib/services/notifications';
import type { Student, Notification, Subject, EnrichedSchedule, LeaveRequest, Event } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { holidays } from '@/lib/holidays';
import { format, parseISO } from 'date-fns';

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
    const scheduledDates = schedule.map(slot => {
        const dayOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].indexOf(slot.day);
        const today = new Date();
        const currentDay = today.getDay(); 
        const result = new Date();
        result.setDate(today.getDate() - (currentDay - 1) + dayOfWeek);
        return result;
    });

    const approvedLeaveDates = leaveRequests
        .filter(lr => lr.status === 'approved')
        .flatMap(lr => getDatesInRange(new Date(lr.startDate), new Date(lr.endDate)));

    const holidayDates = holidays.map(h => h.date);

    const eventDates = events.map(e => parseISO(e.date));

    return (
        <Calendar
            mode="single"
            onDayClick={onDayClick}
            selected={scheduledDates}
            modifiers={{
                leave: approvedLeaveDates,
                holiday: holidayDates,
                event: eventDates,
            }}
            modifiersClassNames={{
                leave: 'bg-destructive/20 text-destructive-foreground',
                holiday: 'text-blue-600',
                event: 'relative',
                selected: 'bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary focus:text-primary-foreground'
            }}
            components={{
              DayContent: (props) => {
                const isEvent = eventDates.some(d => format(d, 'yyyy-MM-dd') === format(props.date, 'yyyy-MM-dd'));
                return <div className="relative w-full h-full flex items-center justify-center">
                  {props.date.getDate()}
                  {isEvent && <Dot className="absolute bottom-[-10px] w-6 h-6 text-accent" />}
                </div>
              }
            }}
            className="rounded-md border"
            footer={
              <div className="text-sm text-muted-foreground p-2 flex flex-col gap-2">
                  <div className="flex items-center gap-2"><Circle className="w-3 h-3 text-primary fill-primary" /> Scheduled Class</div>
                  <div className="flex items-center gap-2"><Circle className="w-3 h-3 text-blue-600 fill-blue-600" /> Holiday</div>
                  <div className="flex items-center gap-2"><Circle className="w-3 h-3 bg-destructive/20 text-destructive-foreground" /> Approved Leave</div>
                  <div className="flex items-center gap-2"><Dot className="w-6 h-6 text-accent" /> Personal Event</div>
              </div>
            }
        />
    )
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [schedule, setSchedule] = useState<EnrichedSchedule[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  
  const [isPending, startTransition] = useTransition();

  const loadData = async () => {
      if (user) {
        setIsLoading(true);
        const [
            studentData, 
            userNotifications, 
            timetableData, 
            allLeaveRequests,
            userEvents
        ] = await Promise.all([
            getStudents(),
            getNotificationsForUser(user.id),
            getTimetableDataForStudent(user.id),
            getLeaveRequests(),
            getEventsForUser(user.id)
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

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const eventsOnDay = events.filter(e => e.date === format(date, 'yyyy-MM-dd'));
    if (eventsOnDay.length === 0) {
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
        title: eventTitle
      });
      toast({ title: 'Event Added', description: 'Your event has been saved.' });
      setEventDialogOpen(false);
      setEventTitle('');
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

  const selectedDateEvents = selectedDate ? events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')) : [];

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
            <div className="md:col-span-2 space-y-8">
                 <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    <CardHeader>
                        <CardTitle>Welcome, {user?.name || 'Student'}!</CardTitle>
                        <CardDescription>Here's your dashboard with your schedule and other useful links.</CardDescription>
                    </CardHeader>
                </Card>
                <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
                    <CardHeader>
                        <CardTitle>My Timetable</CardTitle>
                        <CardDescription>Your weekly class schedule.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TimetableView />
                    </CardContent>
                </Card>
                <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-300">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <CalendarDays className="w-5 h-5 mr-2" />
                            Monthly Calendar
                        </CardTitle>
                        <CardDescription>Your class days and personal events. Click a day to add an event.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                       <Popover>
                        <PopoverTrigger asChild>
                          <div>
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
            <div className="md:col-span-1 space-y-8">
                <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
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
                 <Card className="flex flex-col animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-400">
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
                <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-600">
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
      
      <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
        if (!open) setEventTitle('');
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
