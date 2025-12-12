

'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, MessageSquare, Loader2, Flame, CheckCircle, ClipboardList } from "lucide-react";
import type { Faculty, EnrichedSchedule, Event, LeaveRequest } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TimetableView from './components/TimetableView';
import { useToast } from '@/hooks/use-toast';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getEventsForUser, addEvent } from '@/lib/services/events';
import { getLeaveRequests, addLeaveRequest } from '@/lib/services/leave';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import DailySchedule from './components/DailySchedule';
import SlotChangeRequestDialog from './components/SlotChangeRequestDialog';

const InfoItem = ({ label, value }: { label: string, value: string | number | undefined }) => (
    <div className="flex flex-col text-left">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold text-sm">{value || 'N/A'}</span>
    </div>
);


export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [facultyMember, setFacultyMember] = useState<Faculty | null>(null);
  const [facultySchedule, setFacultySchedule] = useState<EnrichedSchedule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [isTimetableModalOpen, setTimetableModalOpen] = useState(false);
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [isSlotChangeDialogOpen, setSlotChangeDialogOpen] = useState(false);


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
                const [facultyData, scheduleData, eventsData, leaveData] = await Promise.all([
                    getFaculty(),
                    getSchedule(),
                    getEventsForUser(user.id),
                    getLeaveRequests()
                ]);
                const member = facultyData.find(f => f.id === user.id);
                setFacultyMember(member || null);
                
                const schedule = scheduleData.filter(s => s.facultyId === user.id);
                setFacultySchedule(schedule as EnrichedSchedule[]);
                
                setEvents(eventsData);
                setLeaveRequests(leaveData.filter(lr => lr.requesterId === user.id));

            } catch (error) {
                toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadData();
  }, [user, toast]);

  const handleDayClick = (date: Date, action: 'reminder' | 'leave' | 'note') => {
    setSelectedDate(date);
    setDialogAction(action);
    const dateStr = format(date, 'yyyy-MM-dd');

    if (action === 'reminder' || action === 'note') {
        setEventTitle('');
        setLeaveReason('');
        setEventDialogOpen(true);
    } else { // leave
        setLeaveStartDate(dateStr);
        setLeaveEndDate(dateStr);
        setLeaveReason('');
        setLeaveModalOpen(true);
    }
  };

  const handleSubmit = async () => {
      if (!user || !facultyMember) return;
      setIsSubmitting(true);
      
      try {
          if (dialogAction === 'reminder' || dialogAction === 'note') {
              const title = dialogAction === 'note' ? `Note: ${leaveReason}` : eventTitle;
              if (!title) {
                  toast({ title: 'Missing Information', description: 'Please provide a title or note.', variant: 'destructive' });
                  setIsSubmitting(false);
                  return;
              }
               const newEvent = await addEvent({
                    userId: user.id,
                    date: format(selectedDate!, 'yyyy-MM-dd'),
                    title: title,
                    reminder: dialogAction === 'reminder' ? eventReminder : false,
                    reminderTime: dialogAction === 'reminder' && eventReminder ? reminderTime : undefined
                });
                setEvents(prev => [...prev, newEvent]);
                toast({ title: dialogAction === 'note' ? 'Note Added' : 'Reminder Added' });
          } else if (dialogAction === 'leave') {
               if (!leaveStartDate || !leaveEndDate || !leaveReason) {
                    toast({ title: 'Missing Information', description: 'Please fill out all fields.', variant: 'destructive' });
                    setIsSubmitting(false);
                    return;
                }
                const newRequest = await addLeaveRequest({
                    requesterId: user.id,
                    requesterName: facultyMember.name,
                    requesterRole: 'faculty',
                    startDate: leaveStartDate,
                    endDate: leaveEndDate,
                    reason: leaveReason,
                    type: 'academic',
                });
                setLeaveRequests(prev => [...prev, newRequest]);
                toast({ title: 'Leave Request Sent' });
          }
           setEventDialogOpen(false);
           setLeaveModalOpen(false);
      } catch(error: any) {
           toast({ title: 'Error', description: error.message || `Failed to submit.`, variant: 'destructive' });
      } finally {
          setIsSubmitting(false);
      }
  }


  if (isLoading || !facultyMember) {
    return (
        <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardLayout>
    );
  }

   const leaveDialogTitle = dialogAction === 'leave' ? 'Request Leave of Absence' : 'Add a Note/Reminder';
   const leaveDialogDescription = dialogAction === 'leave' 
    ? 'Please fill out the form below to submit your leave request.'
    : `For ${selectedDate ? format(selectedDate, 'PPP') : ''}`;


  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
            <div className="lg:col-span-2 flex flex-col space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16">
                                <AvatarImage src={facultyMember.avatar} alt={facultyMember.name} />
                                <AvatarFallback>{facultyMember.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-2xl animate-in fade-in-0 duration-500">
                                    Hi, {facultyMember.name.split(' ')[0]} <span className="inline-block animate-wave">👋</span>
                                </CardTitle>
                                <CardDescription>{facultyMember.email}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <InfoItem label="Designation" value={facultyMember.designation} />
                        <InfoItem label="Department" value={facultyMember.department} />
                        <InfoItem label="Code" value={facultyMember.code} />
                        <InfoItem label="Employment" value={facultyMember.employmentType} />
                    </CardContent>
                </Card>
                <div className="flex-grow">
                     <ScheduleCalendar 
                        schedule={facultySchedule}
                        leaveRequests={leaveRequests}
                        events={events}
                        onDayClick={handleDayClick}
                    />
                </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
                     <CardContent className="flex items-center gap-4 p-6">
                       <Flame className="w-10 h-10 text-orange-500 animation-pulse" />
                       <div>
                            <p className="text-2xl font-bold">{facultyMember.streak || 0}</p>
                            <p className="text-sm text-muted-foreground">Day Streak</p>
                       </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setTimetableModalOpen(true)}>
                            <Calendar className="w-7 h-7" />
                            <span>My Schedule</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => toast({ title: 'Coming Soon!' })}>
                            <BookOpen className="w-7 h-7" />
                            <span>Syllabus</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => toast({title: "Coming Soon!"})}>
                            <CheckCircle className="w-7 h-7" />
                            <span>To-do List</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => toast({title: "Coming Soon!"})}>
                            <ClipboardList className="w-7 h-7" />
                            <span>Assignments</span>
                        </Button>
                        <Button variant="outline" className="h-24 flex-col gap-2 col-span-2" onClick={() => setSlotChangeDialogOpen(true)}>
                            <MessageSquare className="w-7 h-7" />
                            <span>Slot Change Request</span>
                        </Button>
                    </CardContent>
                </Card>
                <DailySchedule schedule={facultySchedule} />
            </div>
      </div>
      
        <Dialog open={isTimetableModalOpen} onOpenChange={setTimetableModalOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader><DialogTitle>My Weekly Timetable</DialogTitle></DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1"><TimetableView /></div>
                <DialogFooter><Button variant="outline" onClick={() => setTimetableModalOpen(false)}>Close</Button></DialogFooter>
            </DialogContent>
        </Dialog>
        
         <Dialog open={isLeaveModalOpen} onOpenChange={setLeaveModalOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{leaveDialogTitle}</DialogTitle><DialogDescription>{leaveDialogDescription}</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label htmlFor="start-date">Start Date</Label><Input id="start-date" type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} disabled={isSubmitting}/></div>
                        <div className="space-y-2"><Label htmlFor="end-date">End Date</Label><Input id="end-date" type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} min={leaveStartDate} disabled={isSubmitting}/></div>
                    </div>
                    <div className="space-y-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" placeholder="Please provide a brief reason..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={isSubmitting}/></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setLeaveModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Submit</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isEventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogContent>
                <DialogHeader><DialogTitle>{leaveDialogTitle}</DialogTitle><DialogDescription>{leaveDialogDescription}</DialogDescription></DialogHeader>
                 {dialogAction === 'reminder' ? (
                     <div className="grid gap-4 py-4">
                        <div className="space-y-2"><Label htmlFor="event-title">Title</Label><Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Project Deadline" disabled={isSubmitting}/></div>
                        <div className="flex items-center space-x-2"><Switch id="reminder" checked={eventReminder} onCheckedChange={setEventReminder} disabled={isSubmitting}/><Label htmlFor="reminder">Set Reminder Time</Label></div>
                        {eventReminder && <div className="space-y-2"><Label htmlFor="reminder-time">Time</Label><Input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isSubmitting}/></div>}
                    </div>
                 ) : (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2"><Label htmlFor="reason-note">Note</Label><Textarea id="reason-note" placeholder="Add a note for yourself or the admin..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={isSubmitting}/></div>
                    </div>
                 )}
                <DialogFooter><Button variant="outline" onClick={() => setEventDialogOpen(false)}>Cancel</Button><Button onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Save</Button></DialogFooter>
            </DialogContent>
        </Dialog>

        <SlotChangeRequestDialog 
            isOpen={isSlotChangeDialogOpen}
            onOpenChange={setSlotChangeDialogOpen}
            facultyId={user?.id || ''}
            facultySchedule={facultySchedule}
        />
    </DashboardLayout>
  );
}
