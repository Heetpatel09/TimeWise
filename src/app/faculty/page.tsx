'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Loader2, Calendar as CalendarIcon, Send, BookOpen, GraduationCap, Bell, StickyNote, UserCheck, PencilRuler } from "lucide-react";
import type { Faculty as FacultyType, Notification, Subject, SyllabusModule, LeaveRequest, Event, EnrichedSchedule, Class } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { addLeaveRequest, getLeaveRequests } from '@/lib/services/leave';
import { getFaculty, updateFaculty } from '@/lib/services/faculty';
import { getSubjects, updateSubject } from '@/lib/services/subjects';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSchedule } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getClassrooms } from '@/lib/services/classrooms';
import { Badge } from '@/components/ui/badge';
import { addEvent, getEventsForUser, checkForEventReminders } from '@/lib/services/events';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import TimetableView from './components/TimetableView';
import DailySchedule from './components/DailySchedule';
import SlotChangeRequestDialog from './components/SlotChangeRequestDialog';

const InfoItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col text-left">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold text-sm">{value || 'N/A'}</span>
    </div>
);


export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLeaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFaculty, setCurrentFaculty] = useState<FacultyType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSyllabusDialogOpen, setSyllabusDialogOpen] = useState(false);
  const [isSlotChangeDialogOpen, setSlotChangeDialogOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabusContent, setSyllabusContent] = useState('');
  const [facultySchedule, setFacultySchedule] = useState<EnrichedSchedule[]>([]);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventReminder, setEventReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [dialogAction, setDialogAction] = useState<'reminder' | 'leave' | 'note' | null>(null);

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
              allSubjects,
              userEvents,
              allSchedule,
              allLeaveRequests,
              allClasses,
              allClassrooms,
            ] = await Promise.all([
                getFaculty(),
                getSubjects(),
                getEventsForUser(user.id),
                getSchedule(),
                getLeaveRequests(),
                getClasses(),
                getClassrooms()
            ]);
            
            const fac = allFaculty.find(f => f.id === user.id);
            if (fac) setCurrentFaculty(fac);

            const classMap = new Map(allClasses.map(c => [c.id, c.name]));
            const subjectMap = new Map(allSubjects.map(s => [s.id, s]));
            const classroomMap = new Map(allClassrooms.map(c => [c.id, c.name]));
            
            const enrichedFacultySchedule = allSchedule
                .filter(s => s.facultyId === user.id)
                .map(s => ({
                    ...s,
                    className: classMap.get(s.classId) || 'N/A',
                    subjectName: subjectMap.get(s.subjectId)?.name || 'N/A',
                    subjectIsSpecial: subjectMap.get(s.subjectId)?.isSpecial || false,
                    classroomName: classroomMap.get(s.classroomId) || 'N/A',
                    classroomType: allClassrooms.find(cr => cr.id === s.classroomId)?.type || 'classroom',
                    facultyName: fac?.name || 'N/A',
                }));

            const taughtSubjectIds = new Set(enrichedFacultySchedule.map(s => s.subjectId));
            setSubjects(allSubjects.filter(s => taughtSubjectIds.has(s.id)));
            setEvents(userEvents);
            setFacultySchedule(enrichedFacultySchedule);
            setLeaveRequests(allLeaveRequests);

            setIsLoading(false);
        }
    }

  useEffect(() => {
    if (user) {
        loadData();
        // Don't await this, let it run in the background
        checkForEventReminders(user.id);
    }
  }, [user]);

  const handleLeaveRequestSubmit = async () => {
    if ((dialogAction === 'leave' && (!leaveStartDate || !leaveEndDate)) || !leaveReason) {
      toast({
        title: 'Missing Information',
        description: 'Please fill out all required fields.',
        variant: 'destructive',
      });
      return;
    }
    if (!user || !currentFaculty) return;

    setIsSubmitting(true);
    try {
      const reason = dialogAction === 'note' ? `Note: ${leaveReason}` : leaveReason;
      await addLeaveRequest({
        requesterId: user.id,
        requesterName: currentFaculty.name,
        requesterRole: 'faculty',
        startDate: leaveStartDate,
        endDate: leaveEndDate,
        reason: reason,
      });

      toast({
        title: `${dialogAction === 'note' ? 'Note' : 'Leave Request'} Sent`,
        description: `Your ${dialogAction} has been submitted for approval.`,
      });
      await loadData();
      setLeaveDialogOpen(false);
      setLeaveStartDate('');
      setLeaveEndDate('');
      setLeaveReason('');
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to submit ${dialogAction}.`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
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
  
  const handleAddEvent = async () => {
    if (!user || !selectedDate || !eventTitle) {
      toast({ title: 'Missing Information', description: 'Please provide a title for the reminder.', variant: 'destructive' });
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
      toast({ title: 'Reminder Added', description: 'Your reminder has been saved.' });
      setEventDialogOpen(false);
      setEventTitle('');
      setEventReminder(true);
      await loadData(); // Reload all data
    } catch(error) {
       toast({ title: 'Error', description: 'Failed to add reminder.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const features = [
      { title: "Manage Syllabus", icon: BookOpen, onClick: () => setSyllabusDialogOpen(true) },
      { title: "Slot Change Request", icon: PencilRuler, onClick: () => setSlotChangeDialogOpen(true) },
  ];

  if (isLoading) {
    return <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
    </DashboardLayout>
  }

  const leaveDialogTitle = dialogAction === 'leave' ? 'Request Leave of Absence' : 'Add a Note for Admin';
  const leaveDialogDescription = dialogAction === 'leave' 
    ? 'Please fill out the form below to submit your leave request.'
    : 'Add a note for the administration regarding this day.';
  
  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <div className="lg:col-span-2 flex flex-col">
                 <TimetableView />
            </div>
             <div className="lg:col-span-1 space-y-6">
                 <Card className="animate-in fade-in-0 slide-in-from-left-4 duration-500 delay-300">
                    <CardContent className="flex items-center gap-4 p-6">
                       <Flame className="w-10 h-10 text-orange-500 animation-pulse" />
                       <div>
                            <p className="text-2xl font-bold">{currentFaculty?.streak || 0}</p>
                            <p className="text-sm text-muted-foreground">Day Streak</p>
                       </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                         {features.map((feature) => (
                             <Card key={feature.title} className="group relative flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer" onClick={feature.onClick}>
                                <feature.icon className="w-8 h-8 mb-2 text-primary" />
                                <h3 className="font-semibold text-xs">{feature.title}</h3>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
                 <DailySchedule schedule={facultySchedule} />
            </div>
        </div>

      <Dialog open={isLeaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{leaveDialogTitle}</DialogTitle>
            <DialogDescription>{leaveDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             {dialogAction === 'leave' && (
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
                      min={leaveStartDate}
                    />
                  </div>
                </div>
             )}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason / Note</Label>
              <Textarea 
                id="reason"
                placeholder="Please provide a brief reason..."
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
              Submit
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
                                    <div className="flex items-center justify-between pr-4 border-b">
                                        <AccordionTrigger className="flex-1">
                                            <div className="flex flex-col text-left">
                                                <h3 className="font-semibold">{subject.name}</h3>
                                                <p className="text-sm text-muted-foreground">{subject.code}</p>
                                            </div>
                                        </AccordionTrigger>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEditSyllabus(subject);
                                            }}
                                            className="ml-4"
                                            >
                                            Edit Syllabus
                                        </Button>
                                    </div>
                                    <AccordionContent>
                                        {syllabusModules.length > 0 ? (
                                            <div className="space-y-4 pt-2 pl-2">
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
                                            <p className="text-muted-foreground text-sm pt-2 pl-4">Syllabus not available. Click "Edit Syllabus" to add it.</p>
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
      
      {user && facultySchedule && (
        <SlotChangeRequestDialog 
            isOpen={isSlotChangeDialogOpen}
            onOpenChange={setSlotChangeDialogOpen}
            facultyId={user.id}
            facultySchedule={facultySchedule}
        />
      )}

       <Dialog open={isEventDialogOpen} onOpenChange={(open) => {
        if (!open) {
            setEventTitle('');
            setEventReminder(true);
        }
        setEventDialogOpen(open);
      }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add Reminder</DialogTitle>
                <DialogDescription>Add a new reminder for {selectedDate ? format(selectedDate, 'PPP') : ''}</DialogDescription>
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
                      placeholder="e.g. Project Deadline"
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
                  Save Reminder
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </DashboardLayout>
  );
}
