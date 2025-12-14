
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getExams, addExam, updateExam, deleteExam, replaceExams } from '@/lib/services/exams';
import { getSubjects } from '@/lib/services/subjects';
import { getClasses } from '@/lib/services/classes';
import { getStudents } from '@/lib/services/students';
import { getClassrooms } from '@/lib/services/classrooms';
import type { EnrichedExam, Exam, Subject, Class, Classroom, Student } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Sparkles, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';
// import { generateExamSchedule, GenerateExamScheduleOutput } from '@/ai/flows/generate-exam-schedule-flow';
// import { generateSeatingArrangement, GenerateSeatingArrangementOutput } from '@/ai/flows/generate-seating-arrangement-flow';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type GenerateExamScheduleOutput = any;
type GenerateSeatingArrangementOutput = any;

const EXAM_TIME_SLOTS = ['10:00 AM - 01:00 PM', '02:00 PM - 05:00 PM'];

export default function ExamsManager() {
  const [exams, setExams] = useState<EnrichedExam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentExam, setCurrentExam] = useState<Partial<Exam>>({});
  const { toast } = useToast();

  const [isAiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiGeneratedSchedule, setAiGeneratedSchedule] = useState<GenerateExamScheduleOutput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSeatingPlanOpen, setSeatingPlanOpen] = useState(false);
  const [seatingPlan, setSeatingPlan] = useState<GenerateSeatingArrangementOutput | null>(null);
  const [selectedExamForSeating, setSelectedExamForSeating] = useState<EnrichedExam | null>(null);
  const [isGeneratingSeating, setIsGeneratingSeating] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [examData, subjectData, classData, classroomData, studentData] = await Promise.all([getExams(), getSubjects(), getClasses(), getClassrooms(), getStudents()]);
      setExams(examData);
      setSubjects(subjectData);
      setClasses(classData);
      setClassrooms(classroomData);
      setStudents(studentData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (currentExam && currentExam.subjectId && currentExam.classId && currentExam.date && currentExam.time) {
      setIsSubmitting(true);
      try {
        if (currentExam.id) {
          await updateExam(currentExam as Exam);
          toast({ title: "Exam Updated", description: "The exam details have been saved." });
        } else {
          await addExam(currentExam as Omit<Exam, 'id'>);
          toast({ title: "Exam Added", description: "The new exam has been scheduled." });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentExam({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({ title: "Missing Information", description: "Please fill out all fields.", variant: "destructive" });
    }
  };

  const handleEdit = (exam: EnrichedExam) => {
    setCurrentExam({
      ...exam,
      date: format(parseISO(exam.date), 'yyyy-MM-dd')
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExam(id);
      await loadData();
      toast({ title: "Exam Deleted", description: "The exam has been removed from the schedule." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };

  const openNewDialog = () => {
    setCurrentExam({});
    setDialogOpen(true);
  };
  
  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    toast({
        variant: 'destructive',
        title: 'AI Features Disabled',
        description: 'The AI features are currently disabled due to an installation issue.',
    });
    setIsGenerating(false);
    // try {
    //   const result = await generateExamSchedule({
    //     subjects,
    //     classes,
    //     classrooms,
    //     examTimeSlots: EXAM_TIME_SLOTS
    //   });
    //   setAiGeneratedSchedule(result);
    // } catch(e: any) {
    //   toast({ title: "AI Generation Failed", description: e.message || "Could not generate schedule.", variant: "destructive"});
    // }
    // setIsGenerating(false);
  };

  const handleApplyAiSchedule = async () => {
      if (!aiGeneratedSchedule) return;
      setIsSubmitting(true);
      try {
        await replaceExams(aiGeneratedSchedule.generatedSchedule);
        await loadData();
        toast({ title: "Schedule Applied!", description: "The AI-generated exam schedule is now active." });
        setAiDialogOpen(false);
        setAiGeneratedSchedule(null);
      } catch (error: any) {
        toast({ title: "Error", description: "Failed to apply AI schedule.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleGenerateSeating = async (exam: EnrichedExam) => {
    setSelectedExamForSeating(exam);
    setIsGeneratingSeating(true);
    toast({
        variant: 'destructive',
        title: 'AI Features Disabled',
        description: 'The AI features are currently disabled due to an installation issue.',
    });
    setIsGeneratingSeating(false);
    // try {
    //     const classStudents = students.filter(s => s.classId === exam.classId);
    //     const classroom = classrooms.find(c => c.id === exam.classroomId);
    //     if (!classroom) {
    //         throw new Error("Classroom details not found for this exam.");
    //     }
    //     const result = await generateSeatingArrangement({ students: classStudents, classroom });
    //     setSeatingPlan(result);
    //     setSeatingPlanOpen(true);
    // } catch (error: any) {
    //      toast({ title: "AI Seating Plan Failed", description: error.message || "Could not generate seating arrangement.", variant: "destructive"});
    // } finally {
    //     setIsGeneratingSeating(false);
    // }
  }

  const downloadSeatingPlan = () => {
    if (!seatingPlan || !selectedExamForSeating) return;
    const doc = new jsPDF();
    doc.text(`Seating Plan: ${selectedExamForSeating.subjectName} - ${selectedExamForSeating.className}`, 14, 16);
    doc.text(`Classroom: ${selectedExamForSeating.classroomName}`, 14, 22);
    doc.text(`Date: ${format(parseISO(selectedExamForSeating.date), 'PPP')} at ${selectedExamForSeating.time}`, 14, 28);
    
    const tableData = seatingPlan.seatingArrangement
        .sort((a:any,b:any) => a.seatNumber - b.seatNumber)
        .map((s:any) => [s.seatNumber, s.studentName, s.studentId]);

    (doc as any).autoTable({
        head: [['Seat No.', 'Student Name', 'Student ID']],
        body: tableData,
        startY: 35,
    });
    doc.save(`seating_plan_${selectedExamForSeating.subjectName}.pdf`);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => { setAiGeneratedSchedule(null); setAiDialogOpen(true); }}>
            <Sparkles className="h-4 w-4 mr-2" />
            Generate with AI
        </Button>
        <Button onClick={openNewDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Schedule Exam
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Classroom</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.subjectName}</TableCell>
                <TableCell>{exam.className}</TableCell>
                <TableCell>{exam.classroomName || 'N/A'}</TableCell>
                <TableCell>{format(parseISO(exam.date), 'PPP')}</TableCell>
                <TableCell>{exam.time}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(exam)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleGenerateSeating(exam)} disabled={isGeneratingSeating || !exam.classroomId}>
                        {isGeneratingSeating && selectedExamForSeating?.id === exam.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Seating Plan
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the exam schedule.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(exam.id)}>Continue</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Manual Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentExam?.id ? 'Edit Exam' : 'Schedule Exam'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={currentExam.subjectId} onValueChange={(v) => setCurrentExam({ ...currentExam, subjectId: v })} disabled={isSubmitting}>
                <SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger>
                <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={currentExam.classId} onValueChange={(v) => setCurrentExam({ ...currentExam, classId: v })} disabled={isSubmitting}>
                <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Classroom</Label>
              <Select value={currentExam.classroomId} onValueChange={(v) => setCurrentExam({ ...currentExam, classroomId: v })} disabled={isSubmitting}>
                <SelectTrigger><SelectValue placeholder="Select a classroom" /></SelectTrigger>
                <SelectContent>{classrooms.filter(cr => cr.type === 'classroom').map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={currentExam.date ?? ''} onChange={(e) => setCurrentExam({ ...currentExam, date: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
               <Select value={currentExam.time} onValueChange={(v) => setCurrentExam({ ...currentExam, time: v })} disabled={isSubmitting}>
                <SelectTrigger><SelectValue placeholder="Select a time slot" /></SelectTrigger>
                <SelectContent>{EXAM_TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* AI Generation Dialog */}
      <Dialog open={isAiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Generate Exam Schedule with AI</DialogTitle>
                <DialogDescription>
                    Let AI create an optimized, conflict-free exam schedule for you.
                </DialogDescription>
            </DialogHeader>
            
            {isGenerating ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">AI is generating the schedule, please wait...</p>
                </div>
            ) : aiGeneratedSchedule ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-lg">AI Summary</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-muted-foreground">{aiGeneratedSchedule.summary}</p></CardContent>
                    </Card>
                    <ScrollArea className="h-72 border rounded-md p-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Classroom</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {aiGeneratedSchedule.generatedSchedule.map((exam:any, i:number) => (
                                    <TableRow key={i}>
                                        <TableCell>{format(parseISO(exam.date), 'PPP')}</TableCell>
                                        <TableCell>{exam.time}</TableCell>
                                        <TableCell>{subjects.find(s=>s.id === exam.subjectId)?.name}</TableCell>
                                        <TableCell>{classes.find(c=>c.id === exam.classId)?.name}</TableCell>
                                        <TableCell>{classrooms.find(c=>c.id === exam.classroomId)?.name}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
            ) : (
                <div className="py-8 text-center">
                    <p className="text-muted-foreground mb-4">Click below to start the AI generation process.</p>
                </div>
            )}
            
            <DialogFooter>
                <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                {aiGeneratedSchedule ? (
                    <Button onClick={handleApplyAiSchedule} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Apply Schedule
                    </Button>
                ) : (
                    <Button onClick={handleGenerateSchedule} disabled={isGenerating}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Seating Plan Dialog */}
       <Dialog open={isSeatingPlanOpen} onOpenChange={setSeatingPlanOpen}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>AI-Generated Seating Plan</DialogTitle>
                <DialogDescription>
                    Seating arrangement for {selectedExamForSeating?.subjectName} - {selectedExamForSeating?.className}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96 border rounded-md">
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Seat No.</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Student ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {seatingPlan?.seatingArrangement.sort((a:any,b:any) => a.seatNumber - b.seatNumber).map((seat:any) => (
                            <TableRow key={seat.studentId}>
                                <TableCell className="font-bold">{seat.seatNumber}</TableCell>
                                <TableCell>{seat.studentName}</TableCell>
                                <TableCell>{seat.studentId}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                 </Table>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => setSeatingPlanOpen(false)}>Close</Button>
                <Button onClick={downloadSeatingPlan}>
                    <Download className="h-4 w-4 mr-2" />
                    Download as PDF
                </Button>
            </DialogFooter>
        </DialogContent>
       </Dialog>
    </div>
  );
}
