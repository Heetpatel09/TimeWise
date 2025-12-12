
'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, BookOpen, MessageSquare, Loader2, Flame, ClipboardList, Plus, BrainCircuit, Check, PlusCircle, Flag, Tag, X, Archive, Trash2, MoreVertical, ArchiveRestore, ChevronDown } from "lucide-react";
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
import { format, isFuture, parseISO } from 'date-fns';
import { ScheduleCalendar } from './components/ScheduleCalendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import DailySchedule from './components/DailySchedule';
import SlotChangeRequestDialog from './components/SlotChangeRequestDialog';
import GenerateTestDialog from './components/GenerateTestDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [facultySchedule, setFacultySchedule] = useState<EnrichedSchedule[]>([]);
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
    
    // This will overwrite calendar events every time, but keeps manual todos
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
                    <CardHeader className="flex flex-row justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl animate-in fade-in-0 duration-500">
                                Welcome back, {facultyMember.name.split(' ')[0]} <span className="inline-block animate-wave">👋</span>
                            </CardTitle>
                            <CardDescription>Here's what's on your plate today.</CardDescription>
                        </div>
                        <Button onClick={() => setTodoDialogOpen(true)}><PlusCircle className="mr-2 h-4 w-4"/> Add Task</Button>
                    </CardHeader>
                    <CardContent>
                       <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                           {activeTodos.sort((a,b) => a.completed ? 1 : -1).map(todo => (
                               <div key={todo.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                                   <Checkbox id={`todo-${todo.id}`} checked={todo.completed} onCheckedChange={() => toggleTodo(todo.id)} />
                                   <div className="flex-1">
                                       <label htmlFor={`todo-${todo.id}`} className={`text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>{todo.text}</label>
                                       <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                           {todo.dueDate && <span>Due: {format(parseISO(todo.dueDate), 'MMM dd')}</span>}
                                           {todo.dueDate && todo.tags.length > 0 && <span>&bull;</span>}
                                           {todo.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">{tag}</Badge>)}
                                       </div>
                                   </div>
                                   <Badge variant={getPriorityBadgeVariant(todo.priority)}>{todo.priority}</Badge>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => archiveTodo(todo.id)}><Archive className="mr-2 h-4 w-4" />Archive</DropdownMenuItem>
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the task.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteTodo(todo.id)}>Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                               </div>
                           ))}
                       </div>
                        {archivedTodos.length > 0 && (
                            <Collapsible className="mt-4">
                                <CollapsibleTrigger asChild>
                                    <Button variant="ghost" size="sm" className="w-full">
                                        <ChevronDown className="h-4 w-4 mr-2" />
                                        Completed & Archived ({archivedTodos.length})
                                    </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-2">
                                     {archivedTodos.map(todo => (
                                       <div key={todo.id} className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-muted-foreground">
                                           <Checkbox id={`todo-${todo.id}`} checked={todo.completed} disabled />
                                           <div className="flex-1">
                                               <label htmlFor={`todo-${todo.id}`} className="text-sm line-through">{todo.text}</label>
                                           </div>
                                           <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unarchiveTodo(todo.id)}>
                                               <ArchiveRestore className="h-4 w-4" />
                                           </Button>
                                       </div>
                                   ))}
                                </CollapsibleContent>
                            </Collapsible>
                       )}
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
                         <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => setGenerateTestDialogOpen(true)}>
                            <BrainCircuit className="w-7 h-7" />
                            <span>Generate Test</span>
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
        
        <Dialog open={isTodoDialogOpen} onOpenChange={setTodoDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a New Task</DialogTitle>
                    <DialogDescription>What do you need to get done?</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="todo-text">Task</Label>
                        <Textarea id="todo-text" value={newTodoText} onChange={(e) => setNewTodoText(e.target.value)} placeholder="e.g., Grade midterm papers"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="todo-priority">Priority</Label>
                            <Select value={newTodoPriority} onValueChange={(v: any) => setNewTodoPriority(v)}>
                                <SelectTrigger id="todo-priority">
                                    <SelectValue placeholder="Set priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="High">High</SelectItem>
                                    <SelectItem value="Medium">Medium</SelectItem>
                                    <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="todo-due-date">Due Date</Label>
                            <Input id="todo-due-date" type="date" value={newTodoDueDate} onChange={e => setNewTodoDueDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="todo-tags">Tags (comma-separated)</Label>
                        <Input id="todo-tags" value={newTodoTags} onChange={e => setNewTodoTags(e.target.value)} placeholder="e.g., Grading, CS101" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setTodoDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddTodo}>Add Task</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <SlotChangeRequestDialog 
            isOpen={isSlotChangeDialogOpen}
            onOpenChange={setSlotChangeDialogOpen}
            facultyId={user?.id || ''}
            facultySchedule={facultySchedule}
        />

        <GenerateTestDialog
          isOpen={isGenerateTestDialogOpen}
          onOpenChange={setGenerateTestDialogOpen}
          facultyId={user?.id || ''}
        />
    </DashboardLayout>
  );
}
