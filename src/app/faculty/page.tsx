
'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, MessageSquare, Loader2, Flame, ClipboardList, BrainCircuit, PlusCircle, Archive, Trash2, MoreVertical, ArchiveRestore, ChevronDown, Activity } from "lucide-react";
import type { Faculty, EnrichedSchedule, Event, LeaveRequest, Schedule } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TimetableView from './components/TimetableView';
import { useToast } from '@/hooks/use-toast';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getEventsForUser, addEvent } from '@/lib/services/events';
import { getLeaveRequests, addLeaveRequest } from '@/lib/services/leave';
import { format, isFuture, parseISO } from 'date-fns';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import DailySchedule from './components/DailySchedule';
import SlotChangeRequestDialog from './components/SlotChangeRequestDialog';
import GenerateTestPaperDialog from './components/GenerateTestDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import Link from 'next/link';
import FacultyHeatmap from './components/FacultyHeatmap';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'High' | 'Medium' | 'Low';
  dueDate?: string;
  tags: string[];
  isEvent?: boolean;
  archived?: boolean;
}

export default function FacultyDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [facultyMember, setFacultyMember] = useState<Faculty | null>(null);
  const [facultySchedule, setFacultySchedule] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  
  const [isTimetableModalOpen, setTimetableModalOpen] = useState(false);
  const [isLeaveModalOpen, setLeaveModalOpen] = useState(false);
  const [isEventDialogOpen, setEventDialogOpen] = useState(false);
  const [isSlotChangeDialogOpen, setSlotChangeDialogOpen] = useState(false);
  const [isGenerateTestDialogOpen, setGenerateTestDialogOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogAction, setDialogAction] = useState<'reminder' | 'leave' | 'note' | null>(null);
  
  const [eventTitle, setEventTitle] = useState('');
  const [eventReminder, setEventReminder] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  
  const [leaveStartDate, setLeaveStartDate] = useState('');
  const [leaveEndDate, setLeaveEndDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // To-do list state
  const [todoList, setTodoList] = useState<TodoItem[]>([]);
  const [isTodoDialogOpen, setTodoDialogOpen] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoTags, setNewTodoTags] = useState('');

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
                setFacultySchedule(schedule);
                
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

  useEffect(() => {
    const calendarTodos: TodoItem[] = events
        .filter(event => isFuture(parseISO(event.date)))
        .map(event => ({
            id: `event-${event.id}`,
            text: event.title,
            completed: false,
            priority: 'Medium',
            dueDate: event.date,
            tags: ['Calendar'],
            isEvent: true,
        }));
    
    setTodoList(prev => [...prev.filter(t => !t.isEvent), ...calendarTodos]);
  }, [events]);


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

  const handleAddTodo = () => {
    if (!newTodoText) {
        toast({ title: 'Task cannot be empty', variant: 'destructive' });
        return;
    }
    const newTodo: TodoItem = {
        id: `todo-${Date.now()}`,
        text: newTodoText,
        completed: false,
        priority: newTodoPriority,
        dueDate: newTodoDueDate || undefined,
        tags: newTodoTags.split(',').map(t => t.trim()).filter(Boolean),
    };
    setTodoList(prev => [newTodo, ...prev]);
    setTodoDialogOpen(false);
    setNewTodoText('');
    setNewTodoPriority('Medium');
    setNewTodoDueDate('');
    setNewTodoTags('');
  };

  const toggleTodo = (id: string) => {
    setTodoList(prev => prev.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo));
  };

  const deleteTodo = (id: string) => {
    setTodoList(prev => prev.filter(todo => todo.id !== id));
    toast({ title: "Task Deleted" });
  };

  const archiveTodo = (id: string) => {
    setTodoList(prev => prev.map(todo => todo.id === id ? { ...todo, archived: true, completed: true } : todo));
    toast({ title: "Task Archived" });
  };
  
  const unarchiveTodo = (id: string) => {
    setTodoList(prev => prev.map(todo => todo.id === id ? { ...todo, archived: false } : todo));
  };

  const getPriorityBadgeVariant = (priority: 'High' | 'Medium' | 'Low') => {
    switch (priority) {
        case 'High': return 'destructive';
        case 'Medium': return 'secondary';
        case 'Low': return 'outline';
    }
  }
  
  const activeTodos = todoList.filter(t => !t.archived);
  const archivedTodos = todoList.filter(t => t.archived);

  if (isLoading || !facultyMember) {
    return (
        <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Faculty Dashboard" role="faculty">
        <div className="flex flex-col gap-8 pb-12">
            
            {/* Top Bar Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-none shadow-sm bg-card/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-600">
                            <Flame className="h-6 w-6 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Teaching Streak</p>
                            <h3 className="text-2xl font-black">{facultyMember.streak || 0} Days</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-600">
                            <Calendar className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Slots</p>
                            <h3 className="text-2xl font-black">{facultySchedule.length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-green-500/10 text-green-600">
                            <ClipboardList className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tasks Pending</p>
                            <h3 className="text-2xl font-black">{activeTodos.filter(t => !t.completed).length}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-card/50">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-600">
                            <Archive className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Leave Status</p>
                            <h3 className="text-2xl font-black">
                                {leaveRequests.some(r => r.status === 'pending') ? 'Pending' : 'No Request'}
                            </h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="overflow-hidden border-none shadow-sm bg-card/50">
                        <CardHeader className="flex flex-row justify-between items-start border-b pb-6">
                            <div>
                                <CardTitle className="text-2xl font-black font-headline tracking-tight">
                                    Welcome, {facultyMember.name.split(' ')[0]} <span className="inline-block animate-wave">👋</span>
                                </CardTitle>
                                <CardDescription className="text-sm font-medium">Daily task manager and activity log.</CardDescription>
                            </div>
                            <Button onClick={() => setTodoDialogOpen(true)} className="rounded-xl font-bold text-xs uppercase tracking-widest"><PlusCircle className="mr-2 h-4 w-4"/> New Task</Button>
                        </CardHeader>
                        <CardContent className="p-6">
                           <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                               {activeTodos.length > 0 ? activeTodos.sort((a,b) => a.completed ? 1 : -1).map(todo => (
                                   <div key={todo.id} className={cn("flex items-center gap-4 p-3 rounded-2xl transition-all duration-300", todo.completed ? "bg-muted/30 opacity-60" : "bg-muted/10 hover:bg-muted/20 border border-transparent hover:border-primary/10")}>
                                       <Checkbox id={`todo-${todo.id}`} checked={todo.completed} onCheckedChange={() => toggleTodo(todo.id)} className="h-5 w-5 rounded-lg border-2" />
                                       <div className="flex-1 min-w-0">
                                           <label htmlFor={`todo-${todo.id}`} className={cn("text-sm font-bold block truncate", todo.completed && 'line-through text-muted-foreground')}>{todo.text}</label>
                                           <div className="flex items-center gap-2 text-[10px] uppercase font-black text-muted-foreground mt-1">
                                               {todo.dueDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {format(parseISO(todo.dueDate), 'MMM dd')}</span>}
                                               {todo.tags.map(tag => <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0 rounded-md border-primary/20 text-primary/70">{tag}</Badge>)}
                                           </div>
                                       </div>
                                       <Badge variant={getPriorityBadgeVariant(todo.priority)} className="text-[10px] uppercase font-black px-2">{todo.priority}</Badge>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><MoreVertical className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl">
                                                <DropdownMenuItem onClick={() => archiveTodo(todo.id)} className="font-bold text-xs"><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
                                                 <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive font-bold text-xs"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="rounded-2xl">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="font-black font-headline">Permanently Delete?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-sm">This action cannot be undone.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="rounded-xl font-bold">Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => deleteTodo(todo.id)} className="rounded-xl font-bold bg-destructive text-destructive-foreground">Delete Task</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                   </div>
                               )) : <p className="text-center py-12 text-sm text-muted-foreground font-medium uppercase tracking-widest italic opacity-40">Your task list is empty.</p>}
                           </div>
                            {archivedTodos.length > 0 && (
                                <Collapsible className="mt-6 border-t pt-4">
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" size="sm" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                            <ChevronDown className="h-3 w-3 mr-2" />
                                            Archived Tasks ({archivedTodos.length})
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="space-y-2 mt-4 max-h-32 overflow-y-auto pr-2 no-scrollbar">
                                         {archivedTodos.map(todo => (
                                           <div key={todo.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-dashed text-muted-foreground">
                                               <Checkbox id={`todo-${todo.id}`} checked={todo.completed} disabled className="opacity-50" />
                                               <label htmlFor={`todo-${todo.id}`} className="text-xs font-bold line-through truncate flex-1">{todo.text}</label>
                                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => unarchiveTodo(todo.id)}>
                                                   <ArchiveRestore className="h-4 w-4" />
                                               </Button>
                                           </div>
                                       ))}
                                    </CollapsibleContent>
                                </Collapsible>
                           )}
                        </CardContent>
                    </Card>

                    <div className="hidden md:block">
                         <ScheduleCalendar 
                            schedule={facultySchedule as EnrichedSchedule[]}
                            leaveRequests={leaveRequests}
                            events={events}
                            onDayClick={handleDayClick}
                        />
                    </div>
                    <div className="md:hidden">
                        <FacultyHeatmap schedule={facultySchedule} faculty={facultyMember} />
                    </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-8">
                    <Card className="border-none shadow-sm bg-card/50">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Quick Console</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all group" onClick={() => setTimetableModalOpen(true)}>
                                <Calendar className="w-6 h-6 text-primary/60 group-hover:text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Timetable</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all group" asChild>
                                <Link href="/faculty/assignments">
                                    <ClipboardList className="w-6 h-6 text-primary/60 group-hover:text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Homework</span>
                                </Link>
                            </Button>
                             <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all group" onClick={() => setGenerateTestDialogOpen(true)}>
                                <BrainCircuit className="w-6 h-6 text-primary/60 group-hover:text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Gen Test</span>
                            </Button>
                            <Button variant="outline" className="h-20 flex-col gap-2 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all group" onClick={() => setSlotChangeDialogOpen(true)}>
                                <MessageSquare className="w-6 h-6 text-primary/60 group-hover:text-primary" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Reschedule</span>
                            </Button>
                        </CardContent>
                    </Card>

                    <DailySchedule schedule={facultySchedule as EnrichedSchedule[]} />

                    <Card className="border-none shadow-sm bg-primary/5 overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Activity className="h-24 w-24" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-black uppercase tracking-[0.2em]">Platform Progress</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span className="text-muted-foreground">Profile Status</span>
                                    <span className="text-primary">{facultyMember.profileCompleted}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${facultyMember.profileCompleted}%` }} />
                                </div>
                            </div>
                            <p className="text-[11px] font-medium text-muted-foreground leading-tight italic">
                                Complete your profile to earn the 'Sentinel' achievement badge.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
      </div>
      
        {/* Modal Dialogs */}
        <Dialog open={isTimetableModalOpen} onOpenChange={setTimetableModalOpen}>
            <DialogContent className="max-w-5xl rounded-3xl p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/20">
                    <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">Full Weekly Schedule</DialogTitle>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-6 bg-card"><TimetableView /></div>
                <DialogFooter className="p-4 border-t bg-muted/10">
                    <Button variant="outline" onClick={() => setTimetableModalOpen(false)} className="rounded-xl font-bold">Close Portal</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
         <Dialog open={isLeaveModalOpen} onOpenChange={setLeaveModalOpen}>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">Request Absence</DialogTitle>
                    <DialogDescription className="text-xs font-medium">Notify administration of upcoming leave.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
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
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-[10px] font-bold uppercase tracking-widest ml-1">Justification</Label>
                        <Textarea id="reason" placeholder="Briefly state the reason for leave..." value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={isSubmitting} className="rounded-xl min-h-[100px]" />
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => setLeaveModalOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl font-bold bg-primary px-8">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Submit Request'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isEventDialogOpen} onOpenChange={setEventDialogOpen}>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">Add Reminder</DialogTitle>
                    <DialogDescription className="text-xs font-medium">{format(selectedDate || new Date(), 'PPP')}</DialogDescription>
                </DialogHeader>
                 <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-title" className="text-[10px] font-bold uppercase tracking-widest ml-1">Activity Title</Label>
                        <Input id="event-title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="e.g. Lab Inspection" disabled={isSubmitting} className="rounded-xl" />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-dashed">
                        <Label htmlFor="reminder" className="text-xs font-bold uppercase tracking-widest">Enable Notification</Label>
                        <Switch id="reminder" checked={eventReminder} onValueChange={setEventReminder} disabled={isSubmitting}/>
                    </div>
                    {eventReminder && (
                        <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                            <Label htmlFor="reminder-time" className="text-[10px] font-bold uppercase tracking-widest ml-1">Alert Time</Label>
                            <Input id="reminder-time" type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} disabled={isSubmitting} className="rounded-xl" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setEventDialogOpen(false)} className="rounded-xl font-bold">Discard</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl font-bold bg-primary px-8">
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Save Alert'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isTodoDialogOpen} onOpenChange={setTodoDialogOpen}>
            <DialogContent className="rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black font-headline uppercase tracking-tight">New Dashboard Task</DialogTitle>
                    <DialogDescription className="text-xs font-medium">Add a private task to your checklist.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="todo-text" className="text-[10px] font-bold uppercase tracking-widest ml-1">Task Description</Label>
                        <Textarea id="todo-text" value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} placeholder="e.g., Update digital logic notes" className="rounded-xl" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="todo-priority" className="text-[10px] font-bold uppercase tracking-widest ml-1">Priority Level</Label>
                            <Select value={newTodoPriority} onValueChange={(v: any) => setNewTodoPriority(v)}>
                                <SelectTrigger id="todo-priority" className="rounded-xl">
                                    <SelectValue placeholder="Set level" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="High">🔴 High</SelectItem>
                                    <SelectItem value="Medium">🟡 Medium</SelectItem>
                                    <SelectItem value="Low">🟢 Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="todo-due-date" className="text-[10px] font-bold uppercase tracking-widest ml-1">Due Date</Label>
                            <Input id="todo-due-date" type="date" value={newTodoDueDate} onChange={e => setNewTodoDueDate(e.target.value)} className="rounded-xl" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="todo-tags" className="text-[10px] font-bold uppercase tracking-widest ml-1">Categories (comma-separated)</Label>
                        <Input id="todo-tags" value={newTodoTags} onChange={e => setNewTodoTags(e.target.value)} placeholder="e.g., Grading, Personal" className="rounded-xl" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setTodoDialogOpen(false)} className="rounded-xl font-bold">Cancel</Button>
                    <Button onClick={handleAddTodo} className="rounded-xl font-bold px-8">Create Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <SlotChangeRequestDialog 
            isOpen={isSlotChangeDialogOpen}
            onOpenChange={setSlotChangeDialogOpen}
            facultyId={user?.id || ''}
            facultySchedule={facultySchedule as EnrichedSchedule[]}
        />

        <GenerateTestPaperDialog
          isOpen={isGenerateTestDialogOpen}
          onOpenChange={setGenerateTestDialogOpen}
          facultyId={user?.id || ''}
        />
    </DashboardLayout>
  );
}
