

'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSchedule, addSchedule, updateSchedule, deleteSchedule, replaceSchedule, approveAndReassign } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClassrooms } from '@/lib/services/classrooms';
import { getStudents } from '@/lib/services/students';
import type { Schedule, Class, Subject, Faculty, Classroom, Notification, Student, ResolveConflictsOutput, GenerateTimetableOutput } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Download, Star, AlertTriangle, Sparkles, Wand2, FilterX, X as XIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { resolveScheduleConflictsFlow as resolveScheduleConflicts } from '@/ai/flows/resolve-schedule-conflicts-flow';
import { generateTimetableFlow as generateTimetable } from '@/ai/flows/generate-timetable-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportScheduleToPDF } from '../actions';
import { Badge } from '@/components/ui/badge';

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Break
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Break
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];
const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => !t.includes('09:20') && !t.includes('11:20'));
const BREAK_SLOTS = ['09:20 AM - 09:30 AM', '11:20 AM - 12:20 PM'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function sortTime(a: string, b: string) {
    const toMinutes = (time: string) => {
        const [start] = time.split(' - ');
        let [h, m] = start.split(':').map(Number);
        const modifier = time.slice(-2);
        if (h === 12) h = 0;
        if (modifier === 'PM') h += 12;
        return h * 60 + m;
    };
    return toMinutes(a) - toMinutes(b);
}

interface Conflict {
  type: 'faculty' | 'classroom' | 'class';
  message: string;
}


export default function ScheduleManager() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Partial<Schedule> | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isResolvingWithAI, setIsResolvingWithAI] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, Conflict[]>>({});
  const [aiResolution, setAiResolution] = useState<ResolveConflictsOutput | null>(null);
  const [isGenerateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<GenerateTimetableOutput | null>(null);

  // Filter states
  const [viewMode, setViewMode] = useState<'classroom' | 'class' | 'faculty'>('classroom');
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);

  
  const { toast } = useToast();

  async function loadAllData() {
    setIsDataLoading(true);
    const [scheduleData, classData, subjectData, facultyData, classroomData, studentData] = await Promise.all([
        getSchedule(),
        getClasses(),
        getSubjects(),
        getFaculty(),
        getClassrooms(),
        getStudents(),
    ]);
    setSchedule(scheduleData);
    setClasses(classData);
    setSubjects(subjectData);
    setFaculty(facultyData);
    setClassrooms(classroomData);
    setStudents(studentData);
    setIsDataLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, [])
  
  useEffect(() => {
      const findConflicts = () => {
          const newConflicts: Record<string, Conflict[]> = {};
          const timeDayMap = new Map<string, Schedule[]>();
          
          schedule.forEach(slot => {
            if (slot.time === 'Unassigned') return;
            const key = `${slot.day}-${slot.time}`;
            if (!timeDayMap.has(key)) {
                timeDayMap.set(key, []);
            }
            timeDayMap.get(key)!.push(slot);
          });

          for (const slot of schedule) {
              if (slot.time === 'Unassigned') continue;
              if (!newConflicts[slot.id]) newConflicts[slot.id] = [];
              
              const key = `${slot.day}-${slot.time}`;
              const conflictingSlots = timeDayMap.get(key)?.filter(s => s.id !== slot.id) || [];
              
              for (const otherSlot of conflictingSlots) {
                  // Faculty conflict
                  if (slot.facultyId === otherSlot.facultyId) {
                      newConflicts[slot.id].push({ type: 'faculty', message: `Faculty Conflict: ${getRelationInfo(slot.facultyId, 'faculty')?.name} is double-booked.`});
                  }
                  // Classroom conflict
                  if (slot.classroomId === otherSlot.classroomId) {
                       newConflicts[slot.id].push({ type: 'classroom', message: `Classroom Conflict: ${getRelationInfo(slot.classroomId, 'classroom')?.name} is double-booked.`});
                  }
                   // Class conflict
                  if (slot.classId === otherSlot.classId) {
                       newConflicts[slot.id].push({ type: 'class', message: `Class Conflict: ${getRelationInfo(slot.classId, 'class')?.name} has multiple activities.`});
                  }
              }
          }
          setConflicts(newConflicts);
      }
      if (schedule.length > 0) {
          findConflicts();
      }
  }, [schedule, classes, faculty, classrooms]);
  
  const filteredSchedule = useMemo(() => {
    let filtered = schedule;
    if (viewMode === 'classroom') {
        filtered = filtered.filter(s => s.day === selectedDay);
    }
    if (viewMode === 'class' && selectedClass) {
        filtered = filtered.filter(s => s.classId === selectedClass);
    }
    if (viewMode === 'faculty' && selectedFaculty) {
        filtered = filtered.filter(s => s.facultyId === selectedFaculty);
    }
    return filtered;
  }, [schedule, viewMode, selectedDay, selectedClass, selectedFaculty]);

  const sortedClassrooms = useMemo(() => {
      return [...classrooms].sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms]);


  const getRelationInfo = (id: string, type: 'class' | 'subject' | 'faculty' | 'classroom' | 'student') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id);
      case 'subject': return subjects.find(s => s.id === id);
      case 'faculty': return faculty.find(f => f.id === id);
      case 'classroom': return classrooms.find(cr => cr.id === id);
      case 'student': return students.find(st => st.id === id);
      default: return undefined;
    }
  };

  const handleSave = async () => {
    if (currentSlot) {
        if (!currentSlot.day || !currentSlot.time || !currentSlot.classId || !currentSlot.subjectId || !currentSlot.facultyId || !currentSlot.classroomId) {
            toast({ title: 'Missing Information', description: 'Please fill out all fields for the schedule slot.', variant: 'destructive' });
            return;
        }

        try {
            if (currentSlot.id) {
                await updateSchedule(currentSlot as Schedule);
                toast({ title: 'Slot Updated', description: 'The schedule slot has been updated.' });
            } else {
                await addSchedule(currentSlot as Omit<Schedule, 'id'>);
                toast({ title: 'Slot Added', description: 'The new schedule slot has been created.' });
            }
            loadAllData();
            setFormOpen(false);
            setCurrentSlot(null);
        } catch (error: any) {
            toast({ title: 'Error Creating Slot', description: error.message, variant: 'destructive' });
        }
    }
  };
  
  const handleEdit = (slot: Schedule) => {
    setCurrentSlot(slot);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
     try {
        await deleteSchedule(id);
        toast({ title: 'Slot Deleted', description: 'The schedule slot has been removed.' });
        loadAllData();
     } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to delete slot.', variant: "destructive" });
     }
  };

  const openNewDialog = () => {
    setCurrentSlot({ day: selectedDay as any });
    setFormOpen(true);
  };
  
  const handleResolveWithAI = async () => {
      setIsResolvingWithAI(true);
      try {
        const resolution = await resolveScheduleConflicts({
          schedule: schedule.map(s => ({
            ...s,
            className: getRelationInfo(s.classId, 'class')?.name || 'N/A',
            facultyName: getRelationInfo(s.facultyId, 'faculty')?.name || 'N/A',
            subjectName: getRelationInfo(s.subjectId, 'subject')?.name || 'N/A',
            classroomName: getRelationInfo(s.classroomId, 'classroom')?.name || 'N/A',
          })),
          conflicts,
          faculty,
          classrooms,
          students,
        });
        setAiResolution(resolution);
      } catch (error: any) {
        toast({ title: 'AI Resolution Failed', description: error.message, variant: 'destructive' });
      }
      setIsResolvingWithAI(false);
  }

  const handleApproveAIChanges = async () => {
    if (!aiResolution) return;
    setIsResolvingWithAI(true);
    try {
        await replaceSchedule(aiResolution.resolvedSchedule);
        
        await approveAndReassign(aiResolution.notifications);

        toast({ title: "Conflicts Resolved!", description: "The new schedule has been applied and notifications have been sent." });
        setAiResolution(null);
        await loadAllData();

    } catch (error: any) {
         toast({ title: 'Failed to Apply Changes', description: error.message || "Could not save the new schedule.", variant: "destructive" });
    } finally {
        setIsResolvingWithAI(false);
    }
  }

  const handleGenerateTimetable = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTimetable({
        days: DAYS,
        timeSlots: LECTURE_TIME_SLOTS,
        classes,
        subjects,
        faculty,
        classrooms,
        existingSchedule: [],
      });
      setGeneratedSchedule(result);
    } catch(e: any) {
      toast({ title: "AI Generation Failed", description: e.message || "Could not generate schedule.", variant: "destructive"});
    }
    setIsGenerating(false);
  };

   const handleApplyGeneratedSchedule = async () => {
      if (!generatedSchedule) return;
      setIsGenerating(true); // Re-use the loading state
      try {
        await replaceSchedule(generatedSchedule.generatedSchedule as Schedule[]);
        await loadAllData();
        toast({ title: "Schedule Applied!", description: "The AI-generated timetable is now active." });
        setGenerateDialogOpen(false);
        setGeneratedSchedule(null);
      } catch (error: any) {
        toast({ title: "Error", description: "Failed to apply AI schedule.", variant: "destructive" });
      } finally {
        setIsGenerating(false);
      }
  };


  const exportPDF = async () => {
    setIsExporting(true);
    try {
        const {pdf, error} = await exportScheduleToPDF(schedule, classes, subjects, faculty, classrooms);
        if (error) {
            throw new Error(error);
        }

        const blob = new Blob([new Uint8Array(atob(pdf!).split('').map(char => char.charCodeAt(0)))], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'master_schedule.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err: any) {
        toast({ title: 'Export Failed', description: err.message, variant: 'destructive' });
    } finally {
        setIsExporting(false);
    }
  }
  
  const selectedSubjectType = subjects.find(s => s.id === currentSlot?.subjectId)?.type;
  
  const filteredClassroomsForDialog = classrooms.filter(c => {
      if (!selectedSubjectType) return false;
      if (selectedSubjectType === 'theory') {
          return c.type === 'classroom';
      }
      return c.type === selectedSubjectType;
  });

  const hasConflicts = Object.values(conflicts).some(c => c.length > 0);
  const codeChefDay = schedule.find(s => s.subjectId === 'CODECHEF')?.day;

  const renderTimetable = () => {
    const title = viewMode === 'class' ? `Timetable for ${getRelationInfo(selectedClass!, 'class')?.name}` : viewMode === 'faculty' ? `Timetable for ${getRelationInfo(selectedFaculty!, 'faculty')?.name}` : `Master Schedule for ${selectedDay}`;

    const slotsByDayAndTime = DAYS.reduce((acc, day) => {
        acc[day] = {};
        LECTURE_TIME_SLOTS.forEach(time => {
            acc[day][time] = filteredSchedule.filter(s => s.day === day && s.time === time);
        });
        return acc;
    }, {} as Record<string, Record<string, Schedule[]>>);

    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border font-semibold p-2">Time</TableHead>
                                {DAYS.map(day => <TableHead key={day} className="border font-semibold p-2 text-center">{day}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {LECTURE_TIME_SLOTS.map(time => (
                                <TableRow key={time}>
                                    <TableCell className="border font-medium text-xs p-2">{time}</TableCell>
                                    {DAYS.map(day => {
                                        const slots = slotsByDayAndTime[day][time];
                                        return (
                                            <TableCell key={day} className="border p-1 align-top text-xs min-w-[150px] h-24">
                                                {slots.map(slot => (
                                                     <div key={slot.id} className={cn("p-1 rounded-sm text-[11px] leading-tight", subjects.find(s=>s.id === slot.subjectId)?.isSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                        <div className='font-bold'>{getRelationInfo(slot.subjectId, 'subject')?.name}</div>
                                                        <div className="text-muted-foreground truncate">{viewMode !== 'class' && getRelationInfo(slot.classId, 'class')?.name}</div>
                                                        <div className="text-muted-foreground truncate">{viewMode !== 'faculty' && getRelationInfo(slot.facultyId, 'faculty')?.name}</div>
                                                        <div className="text-muted-foreground truncate">{viewMode !== 'classroom' && getRelationInfo(slot.classroomId, 'classroom')?.name}</div>
                                                    </div>
                                                ))}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
  };
  

  if (isDataLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <TooltipProvider>
      <Card className='mb-4'>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Label>View:</Label>
              <Select value={viewMode} onValueChange={(v: any) => { setViewMode(v); setSelectedClass(null); setSelectedFaculty(null); }}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="classroom">By Classroom</SelectItem>
                    <SelectItem value="class">By Class</SelectItem>
                    <SelectItem value="faculty">By Faculty</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {viewMode === 'classroom' && (
                <div className="flex items-center gap-2">
                  <Label>Day:</Label>
                  <Select value={selectedDay} onValueChange={(v) => setSelectedDay(v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
            )}
            {viewMode === 'class' && (
                <div className="flex items-center gap-2">
                    <Label>Class:</Label>
                    <Select value={selectedClass || ''} onValueChange={v => setSelectedClass(v)}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select a class"/></SelectTrigger>
                        <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            )}
             {viewMode === 'faculty' && (
                <div className="flex items-center gap-2">
                    <Label>Faculty:</Label>
                    <Select value={selectedFaculty || ''} onValueChange={v => setSelectedFaculty(v)}>
                        <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select a faculty member"/></SelectTrigger>
                        <SelectContent>{faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            )}
        </CardContent>
      </Card>
      <div className="flex justify-between items-center mb-4">
        <div className='flex gap-2'>
            <Button onClick={() => { setGeneratedSchedule(null); setGenerateDialogOpen(true); }} variant="outline">
                <Wand2 className="h-4 w-4 mr-2" />
                Generate with AI
            </Button>
            <Button onClick={exportPDF} variant="outline" disabled={isExporting}>
                {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                Download PDF
            </Button>
             <Button onClick={handleResolveWithAI} disabled={!hasConflicts || isResolvingWithAI}>
                {isResolvingWithAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Resolve Conflicts
            </Button>
        </div>
        <Button onClick={openNewDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Slot
        </Button>
      </div>
      {hasConflicts && (
        <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Conflicts Detected!</AlertTitle>
            <AlertDescription>
                There are conflicting slots in the schedule. Hover over the <AlertTriangle className="h-4 w-4 inline-block mx-1" /> icon on a slot for details or click Resolve.
            </AlertDescription>
        </Alert>
      )}

    {viewMode === 'classroom' ? (
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="border-collapse">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border font-semibold p-2 sticky left-0 bg-background/95 z-10">Classroom</TableHead>
                                {LECTURE_TIME_SLOTS.map(time => (
                                    <TableHead key={time} className="border font-semibold p-2 text-center">{time}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedClassrooms.map(classroom => (
                                <TableRow key={classroom.id}>
                                    <TableCell className="border font-medium text-xs whitespace-nowrap p-2 align-top h-24 sticky left-0 bg-background/95 z-10">{classroom.name}</TableCell>
                                    {LECTURE_TIME_SLOTS.map(time => {
                                        const slot = filteredSchedule.find(s => s.classroomId === classroom.id && s.time === time);
                                        const slotConflicts = slot ? conflicts[slot.id] || [] : [];
                                        const isConflicting = slotConflicts.length > 0;
                                        const subject = slot ? getRelationInfo(slot.subjectId, 'subject') : null;
                                        
                                        return (
                                            <TableCell key={`${classroom.id}-${time}`} className={cn("border p-1 align-top text-xs min-w-[150px]", isConflicting && 'bg-destructive/10')}>
                                                {slot ? (
                                                    <div className={cn("p-1 rounded-sm text-[11px] leading-tight", subject?.isSpecial ? 'bg-primary/20' : 'bg-muted', isConflicting && 'bg-destructive/20')}>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className='font-bold'>{getRelationInfo(slot.classId, 'class')?.name}</div>
                                                                <div className='truncate'>{subject?.name}</div>
                                                                <div className="text-muted-foreground truncate">{getRelationInfo(slot.facultyId, 'faculty')?.name}</div>
                                                            </div>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-5 w-5 flex-shrink-0"><MoreHorizontal className="h-3 w-3" /></Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent>
                                                                    <DropdownMenuItem onClick={() => handleEdit(slot)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/10">
                                                                                <Trash2 className="h-4 w-4 mr-2" />Delete
                                                                            </DropdownMenuItem>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this slot.</AlertDialogDescription></AlertDialogHeader>
                                                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(slot.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                        {isConflicting && (
                                                            <Tooltip>
                                                                <TooltipTrigger className="w-full mt-1 flex justify-end"><AlertTriangle className="h-4 w-4 text-destructive" /></TooltipTrigger>
                                                                <TooltipContent>
                                                                    <ul className="list-disc pl-4 space-y-1">
                                                                    {slotConflicts.map((c, i) => <li key={i}>{c.message}</li>)}
                                                                    </ul>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    ) : (
       (selectedClass || selectedFaculty) && renderTimetable()
    )}

      <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSlot?.id ? 'Edit Slot' : 'Add Slot'}</DialogTitle>
            <DialogDescription>Fill in the details for the schedule slot.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Day</Label>
              <Select value={currentSlot?.day} onValueChange={(v) => setCurrentSlot({ ...currentSlot, day: v as any })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Day" /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Time</Label>
              <Select value={currentSlot?.time} onValueChange={(v) => setCurrentSlot({ ...currentSlot, time: v })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Time" /></SelectTrigger>
                <SelectContent>{LECTURE_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Class</Label>
              <Select value={currentSlot?.classId} onValueChange={(v) => setCurrentSlot({ ...currentSlot, classId: v })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Subject</Label>
              <Select value={currentSlot?.subjectId} onValueChange={(v) => setCurrentSlot({ ...currentSlot, subjectId: v, classroomId: undefined })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Faculty</Label>
              <Select value={currentSlot?.facultyId} onValueChange={(v) => setCurrentSlot({ ...currentSlot, facultyId: v })}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select Faculty" /></SelectTrigger>
                <SelectContent>{faculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Classroom</Label>
              <Select value={currentSlot?.classroomId} onValueChange={(v) => setCurrentSlot({ ...currentSlot, classroomId: v })} disabled={!currentSlot?.subjectId}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder={currentSlot?.subjectId ? `Select a ${selectedSubjectType}` : "Select a subject first"} /></SelectTrigger>
                <SelectContent>{filteredClassroomsForDialog.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!aiResolution} onOpenChange={() => setAiResolution(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review AI-Resolved Schedule</DialogTitle>
            <DialogDescription>
              The AI has resolved the schedule conflicts. Review the changes and approve to apply them.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] p-1">
            <div className="my-4 space-y-4 pr-6">
                <Card>
                    <CardHeader>
                        <CardTitle className='text-base'>Summary of Changes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm">{aiResolution?.summary}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className='text-base'>Notifications to be Sent</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {aiResolution?.notifications && aiResolution.notifications.length > 0 ? aiResolution.notifications.map((notif: Notification, index: number) => {
                            const user = notif.userId ? getRelationInfo(notif.userId, 'faculty') : null;
                            const targetClass = notif.classId ? getRelationInfo(notif.classId, 'class') : null;
                            const studentRecipients = students.filter(s => s.classId === notif.classId);

                            let recipientText = "Unknown";
                            if (user) {
                                recipientText = user.name;
                            } else if (targetClass) {
                                recipientText = `All students in ${targetClass.name} (${studentRecipients.length} students)`;
                            }

                            return (
                            <div key={index} className="text-sm p-2 border rounded-md bg-muted/50">
                                <p><strong>To:</strong> {recipientText}</p>
                                <p><strong>Message:</strong> {notif.message}</p>
                            </div>
                        )}) : <p className="text-sm text-muted-foreground">No notifications will be sent for this resolution.</p>}
                    </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Proposed New Schedule</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                     {aiResolution && DAYS.map(day => {
                        const daySlots = aiResolution.resolvedSchedule.filter(slot => slot.day === day).sort((a,b) => sortTime(a.time, b.time));
                        if (daySlots.length === 0) return null;
                        return (
                          <div key={day}>
                            <h4 className="font-semibold text-md mb-2">{day}</h4>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Time</TableHead><TableHead>Class</TableHead><TableHead>Subject</TableHead><TableHead>Faculty</TableHead><TableHead>Classroom</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {daySlots.map(slot => (
                                  <TableRow key={slot.id} className={schedule.find(s => s.id === slot.id)?.facultyId !== slot.facultyId || schedule.find(s => s.id === slot.id)?.classroomId !== slot.classroomId ? 'bg-primary/10' : ''}>
                                    <TableCell>{slot.time}</TableCell>
                                    <TableCell>{slot.className}</TableCell>
                                    <TableCell>{slot.subjectName}</TableCell>
                                    <TableCell>{slot.facultyName}</TableCell>
                                    <TableCell>{slot.classroomName}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )
                      })}
                  </CardContent>
                </Card>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setAiResolution(null)} disabled={isResolvingWithAI}>Cancel</Button>
            <Button onClick={handleApproveAIChanges} disabled={isResolvingWithAI}>
                {isResolvingWithAI && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Approve &amp; Notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Generate Weekly Timetable with AI</DialogTitle>
                <DialogDescription>
                    Let the TimeWise engine create an optimized, conflict-free schedule for all classes.
                </DialogDescription>
            </DialogHeader>
            
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-72 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">AI is generating the schedule, this may take a moment...</p>
                </div>
            ) : generatedSchedule ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">AI Summary</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{generatedSchedule.summary}</p></CardContent>
                    </Card>
                    <ScrollArea className="h-80 border rounded-md p-4">
                      <div className="space-y-4">
                        {DAYS.map(day => {
                          const daySlots = (generatedSchedule.generatedSchedule as Schedule[]).filter(slot => slot.day === day).sort((a,b) => sortTime(a.time, b.time));
                          if (daySlots.length === 0) return null;
                          return (
                            <div key={day}>
                              <h3 className="font-semibold text-lg mb-2">{day}</h3>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Faculty</TableHead>
                                    <TableHead>Classroom</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {daySlots.map((slot: any, i: number) => (
                                    <TableRow key={i}>
                                      <TableCell>{slot.time}</TableCell>
                                      <TableCell>{getRelationInfo(slot.classId, 'class')?.name}</TableCell>
                                      <TableCell>{getRelationInfo(slot.subjectId, 'subject')?.name}</TableCell>
                                      <TableCell>{getRelationInfo(slot.facultyId, 'faculty')?.name}</TableCell>
                                      <TableCell>{getRelationInfo(slot.classroomId, 'classroom')?.name}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )
                        })}
                      </div>
                    </ScrollArea>
                </div>
            ) : (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">Click below to start the AI generation process. This will replace the entire existing schedule.</p>
                </div>
            )}
            
            <DialogFooter>
                <Button variant="outline" onClick={() => setGenerateDialogOpen(false)} disabled={isGenerating}>Cancel</Button>
                {generatedSchedule ? (
                    <Button onClick={handleApplyGeneratedSchedule} disabled={isGenerating}>
                      {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply Schedule
                    </Button>
                ) : (
                    <Button onClick={handleGenerateTimetable} disabled={isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate New Timetable
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </TooltipProvider>
  );
}
    

    
