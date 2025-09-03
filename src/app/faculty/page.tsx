

'use client';

import { useState, useEffect, useTransition } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Send, ArrowRight, Flame, Loader2, Bell, CalendarDays, Circle, Dot, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import ScheduleView from "./components/ScheduleView";
import { addLeaveRequest, getLeaveRequests } from '@/lib/services/leave';
import { getFaculty } from '@/lib/services/faculty';
import type { Faculty as FacultyType, Notification, EnrichedSchedule, LeaveRequest, Event } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { getNotificationsForUser } from '@/lib/services/notifications';
import { getSchedule } from '@/lib/services/schedule';
import { Calendar } from '@/components/ui/calendar';
import { holidays } from '@/lib/holidays';
import { addEvent, deleteEvent, getEventsForUser, checkForEventReminders } from '@/lib/services/events';
import { format, parseISO } from 'date-fns';
import { Switch } from '@/components/ui/switch';

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
            className="rounded-md border w-full"
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

  const loadData = async () => {
        if (user) {
            setIsLoading(true);
            const [
              allFaculty, 
              userNotifications, 
              allSchedule, 
              allLeaveRequests,
              userEvents
            ] = await Promise.all([
                getFaculty(),
                getNotificationsForUser(user.id),
                getSchedule(),
                getLeaveRequests(),
                getEventsForUser(user.id)
            ]);
            
            const fac = allFaculty.find(f => f.id === user.id);
            if (fac) setCurrentFaculty(fac);
            
            const facultySchedule = allSchedule.filter(s => s.facultyId === user.id) as EnrichedSchedule[];
            setSchedule(facultySchedule);
            setLeaveRequests(allLeaveRequests.filter(lr => lr.requesterId === user.id));
            setEvents(userEvents);
            setNotifications(userNotifications);
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

  const selectedDateEvents = selectedDate ? events.filter(e => e.date === format(selectedDate, 'yyyy-MM-dd')) : [];

  if (isLoading) {
    return <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
    </DashboardLayout>
  }
  

  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <div className="space-y-6">
            <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              <CardHeader>
              <CardTitle>Welcome, {user?.name || "Faculty Member"}!</CardTitle>
              <CardDescription>
                  This is your central hub for managing your schedule and administrative tasks.
              </CardDescription>
              </CardHeader>
          </Card>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <Card className="flex flex-col lg:col-span-1 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Flame className="w-6 h-6 mr-2 text-orange-500"/>
                            Teaching Streak
                        </CardTitle>
                        <CardDescription>For your consistent dedication.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center flex-grow">
                        <div className="text-6xl font-bold text-orange-500 drop-shadow-md">{currentFaculty?.streak || 0}</div>
                        <p className="text-muted-foreground mt-2">Consecutive teaching days</p>
                    </CardContent>
                </Card>
                <Card className="flex flex-col lg:col-span-1 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-400">
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
                <Card className="flex flex-col lg:col-span-1 animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-500">
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
        
            <Card className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200 h-full">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <CalendarDays className="w-5 h-5 mr-2" />
                        Monthly Calendar
                    </CardTitle>
                    <CardDescription>Your teaching days and personal events at a glance. Click a day to add an event.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Popover>
                        <PopoverTrigger asChild>
                          <div className='w-full'>
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
    </DashboardLayout>
  );
}



