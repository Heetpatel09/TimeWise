
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
import type { Schedule, Class, Subject, Faculty } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Sparkles, AlertTriangle, CheckCircle, Loader2, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { handleResolveConflicts } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';

export default function ScheduleManager() {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isFormOpen, setFormOpen] = useState(false);
  const [isResultOpen, setResultOpen] = useState(false);
  const [currentSlot, setCurrentSlot] = useState<Partial<Schedule> | null>(null);
  const [conflictResult, setConflictResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  async function loadAllData() {
    setIsDataLoading(true);
    const [scheduleData, classData, subjectData, facultyData] = await Promise.all([
        getSchedule(),
        getClasses(),
        getSubjects(),
        getFaculty()
    ]);
    setSchedule(scheduleData);
    setClasses(classData);
    setSubjects(subjectData);
    setFaculty(facultyData);
    setIsDataLoading(false);
  }

  useEffect(() => {
    loadAllData();
  }, [])

  const getRelationName = (id: string, type: 'class' | 'subject' | 'faculty') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id)?.name;
      case 'subject': return subjects.find(s => s.id === id)?.name;
      case 'faculty': return faculty.find(f => f.id === id)?.name;
      default: return 'N/A';
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
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save slot.', variant: 'destructive' });
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
     } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete slot.', variant: 'destructive' });
     }
  };

  const openNewDialog = () => {
    setCurrentSlot({});
    setFormOpen(true);
  };

  const onResolveConflicts = async () => {
    setIsLoading(true);
    setResultOpen(true);
    setConflictResult(null);
    try {
      const result = await handleResolveConflicts(schedule);
      setConflictResult(result);
    } catch (error) {
      console.error(error);
      setConflictResult({ hasConflicts: true, resolvedSchedules: '[]', conflictDetails: JSON.stringify({ error: 'Failed to process schedules.' }) });
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderConflictDetails = () => {
    if(!conflictResult?.conflictDetails) return null;
    try {
      const details = JSON.parse(conflictResult.conflictDetails);
      return <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
        <code className="text-white">{JSON.stringify(details, null, 2)}</code>
      </pre>;
    } catch(e) {
      return <p>{conflictResult.conflictDetails}</p>;
    }
  }

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Master Schedule", 14, 16);
    
    const tableData = schedule.map(slot => [
        slot.day,
        slot.time,
        getRelationName(slot.classId, 'class'),
        getRelationName(slot.subjectId, 'subject'),
        getRelationName(slot.facultyId, 'faculty'),
    ]);

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Class', 'Subject', 'Faculty']],
        body: tableData,
        startY: 20,
    });

    doc.save('master_schedule.pdf');
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00', '12:00 - 13:00', '14:00 - 15:00'];

  const scheduleByDay = days.map(day => ({
    day,
    slots: schedule.filter(slot => slot.day === day).sort((a,b) => a.time.localeCompare(b.time)),
  }));

  if (isDataLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className='flex gap-2'>
            <Button onClick={onResolveConflicts} variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                Resolve Conflicts
            </Button>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Faculty</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>{slot.time}</TableCell>
                        <TableCell>{getRelationName(slot.classId, 'class')}</TableCell>
                        <TableCell>{getRelationName(slot.subjectId, 'subject')}</TableCell>
                        <TableCell>{getRelationName(slot.facultyId, 'faculty')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(slot)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(slot.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
                <SelectContent>{times.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
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
              <Select value={currentSlot?.subjectId} onValueChange={(v) => setCurrentSlot({ ...currentSlot, subjectId: v })}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isResultOpen} onOpenChange={setResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conflict Resolution Report</DialogTitle>
          </DialogHeader>
          {isLoading && <div className="flex items-center justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /> <span className="ml-4">Analyzing Schedule...</span></div>}
          {conflictResult && (
            <div>
              {conflictResult.hasConflicts ? (
                 <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Conflicts Detected!</AlertTitle>
                  <AlertDescription>
                    The AI has found conflicts in the schedule. See details below.
                    {renderConflictDetails()}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>No Conflicts Found</AlertTitle>
                  <AlertDescription>
                    The current schedule is free of conflicts.
                  </AlertDescription>
                </Alert>
              )}
              {conflictResult.hasConflicts && conflictResult.resolvedSchedules && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Suggested Resolution</h3>
                  <Button onClick={async () => {
                    const newSchedule = JSON.parse(conflictResult.resolvedSchedules);
                    for (const slot of newSchedule) {
                        // This is a simple update logic. A more robust solution would
                        // diff the schedules and only update changed slots.
                        await updateSchedule(slot);
                    }
                    loadAllData();
                    setResultOpen(false);
                    toast({ title: 'Schedule Applied', description: 'The suggested schedule has been applied.' });
                  }}>Apply Suggested Schedule</Button>
                  <pre className="mt-2 w-full rounded-md bg-slate-950 p-4">
                    <code className="text-white">{JSON.stringify(JSON.parse(conflictResult.resolvedSchedules), null, 2)}</code>
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
