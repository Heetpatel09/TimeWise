
'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import ScheduleView from "./components/ScheduleView";
import { Flame, Loader2, Calendar as CalendarIcon, Send, BookOpen, GraduationCap, Bell, StickyNote } from "lucide-react";
import type { Faculty as FacultyType, Notification, Subject, SyllabusModule, LeaveRequest, Event } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addLeaveRequest, getLeaveRequests } from '@/lib/services/leave';
import { getFaculty } from '@/lib/services/faculty';
import { getSubjects, updateSubject } from '@/lib/services/subjects';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getSchedule } from '@/lib/services/schedule';
import { Badge } from '@/components/ui/badge';
import { addEvent, getEventsForUser, checkForEventReminders } from '@/lib/services/events';

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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [syllabusContent, setSyllabusContent] = useState('');
  
  const [events, setEvents] = useState<Event[]>([]);
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
            ] = await Promise.all([
                getFaculty(),
                getSubjects(),
                getEventsForUser(user.id),
            ]);
            
            const fac = allFaculty.find(f => f.id === user.id);
            if (fac) setCurrentFaculty(fac);
            
            const facultySchedule = (await getSchedule()).filter(s => s.facultyId === user.id);
            const taughtSubjectIds = new Set(facultySchedule.map(s => s.subjectId));
            setSubjects(allSubjects.filter(s => taughtSubjectIds.has(s.id)));
            setEvents(userEvents);

            setIsLoading(false);
        }
    }

  useEffect(() => {
    if (user) {
        loadData();
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

  if (isLoading) {
    return <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
      <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
    </DashboardLayout>
  }
  
  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
       <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                   <ScheduleView />
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

      <Dialog open={isLeaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Please fill out the form to submit your leave request.</DialogDescription>
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
                  min={leaveStartDate}
                />
              </div>
            </div>
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
      
    </DashboardLayout>
  );
}
