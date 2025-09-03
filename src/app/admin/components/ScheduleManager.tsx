
'use client';
import { useState, useEffect } from 'react';
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
import { getSchedule, addSchedule, updateSchedule, deleteSchedule } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClassrooms } from '@/lib/services/classrooms';
import type { Schedule, Class, Subject, Faculty, Classroom } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Download, Star, AlertTriangle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function sortTime(a: string, b: string) {
    const toDate = (time: string) => {
        const [timePart, modifier] = time.split(' ');
        let [hours, minutes] = timePart.split(':');
        if (hours === '12') {
            hours = '0';
        }
        if (modifier === 'PM') {
            hours = (parseInt(hours, 10) + 12).toString();
        }
        return new Date(1970, 0, 1, parseInt(hours), parseInt(minutes));
    };
    return toDate(a).getTime() - toDate(b).getTime();
}

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '09:30 AM - 10:00 AM', // Break
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM', // Break
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
];

const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => !t.includes('09:30') && !t.includes('12:00'));

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
  const [isFormOpen, setFormOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Partial<Schedule> | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [conflicts, setConflicts] = useState<Record<string, Conflict[]>>({});
  const { toast } = useToast();

  async function loadAllData() {
    setIsDataLoading(true);
    const [scheduleData, classData, subjectData, facultyData, classroomData] = await Promise.all([
        getSchedule(),
        getClasses(),
        getSubjects(),
        getFaculty(),
        getClassrooms(),
    ]);
    setSchedule(scheduleData);
    setClasses(classData);
    setSubjects(subjectData);
    setFaculty(facultyData);
    setClassrooms(classroomData);
    setIsDataLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, [])
  
  useEffect(() => {
      const findConflicts = () => {
          const newConflicts: Record<string, Conflict[]> = {};
          for (const slot of schedule) {
              if (!newConflicts[slot.id]) newConflicts[slot.id] = [];
              
              const conflictingSlots = schedule.filter(s => s.id !== slot.id && s.day === slot.day && s.time === slot.time);
              
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
  }, [schedule]);

  const getRelationInfo = (id: string, type: 'class' | 'subject' | 'faculty' | 'classroom') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id);
      case 'subject': return subjects.find(s => s.id === id);
      case 'faculty': return faculty.find(f => f.id === id);
      case 'classroom': return classrooms.find(cr => cr.id === id);
      default: return undefined;
    }
  };

  const handleSave = async () => {
    if (currentSlot) {
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
        toast({ title: 'Error', description: error.message || 'Failed to delete slot.', variant: 'destructive' });
     }
  };

  const openNewDialog = () => {
    setCurrentSlot({});
    setFormOpen(true);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Master Schedule", 14, 16);
    
    const tableData = schedule.map(slot => [
        slot.day,
        slot.time,
        getRelationInfo(slot.classId, 'class')?.name,
        getRelationInfo(slot.subjectId, 'subject')?.name,
        getRelationInfo(slot.facultyId, 'faculty')?.name,
        getRelationInfo(slot.classroomId, 'classroom')?.name,
    ]);

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Class', 'Subject', 'Faculty', 'Classroom']],
        body: tableData,
        startY: 20,
    });

    doc.save('master_schedule.pdf');
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  const scheduleByDay = days.map(day => ({
    day,
    slots: schedule.filter(slot => slot.day === day).sort((a,b) => sortTime(a.time, b.time)),
  }));

  const selectedSubjectType = subjects.find(s => s.id === currentSlot?.subjectId)?.type;
  const filteredClassrooms = classrooms.filter(c => !selectedSubjectType || c.type === selectedSubjectType);

  if (isDataLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <TooltipProvider>
      <div className="flex justify-between items-center mb-4">
        <div className='flex gap-2'>
            <Button onClick={exportPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
            </Button>
        </div>
        <Button onClick={openNewDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Slot
        </Button>
      </div>

      <div className="space-y-6">
        {scheduleByDay.map(({ day, slots }) => (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>
              {slots.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Faculty</TableHead>
                          <TableHead>Classroom</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slots.map((slot) => {
                          const subject = getRelationInfo(slot.subjectId, 'subject');
                          const isSpecial = subject?.isSpecial;
                          const slotConflicts = conflicts[slot.id] || [];
                          const isConflicting = slotConflicts.length > 0;
                          
                          return (
                          <TableRow 
                            key={slot.id}
                            className={cn(
                                isSpecial && `bg-[#4A0080] text-white hover:bg-[#4A0080]/90`,
                                isConflicting && 'bg-destructive/20 hover:bg-destructive/30'
                            )}
                          >
                            <TableCell>{slot.time}</TableCell>
                            <TableCell>{getRelationInfo(slot.classId, 'class')?.name}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                  {subject?.name}
                                  {isSpecial && <Star className="h-3 w-3 text-yellow-400" />}
                                </div>
                            </TableCell>
                            <TableCell>{getRelationInfo(slot.facultyId, 'faculty')?.name}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                {getRelationInfo(slot.classroomId, 'classroom')?.name}
                                {isConflicting && (
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <AlertTriangle className="h-4 w-4 text-destructive" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <div className="p-2">
                                                <h4 className="font-bold mb-2">Conflicts Detected:</h4>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    {slotConflicts.map((c, i) => <li key={i}>{c.message}</li>)}
                                                </ul>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSpecial}>
                                    <MoreHorizontal className={`h-4 w-4 ${isSpecial ? 'text-gray-300' : ''}`} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(slot)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDelete(slot.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        )})}
                      </TableBody>
                    </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No classes scheduled for {day}.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>


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
                <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Repeat for time, class, subject, faculty */}
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
                <SelectContent>{filteredClassrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </TooltipProvider>
  );
}
