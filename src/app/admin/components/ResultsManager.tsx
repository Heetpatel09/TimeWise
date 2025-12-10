
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getResults, addOrUpdateResults, deleteResult } from '@/lib/services/results';
import { getStudents } from '@/lib/services/students';
import { getSubjects } from '@/lib/services/subjects';
import type { EnrichedResult, Student, Subject, Result } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ResultsManager() {
  const [results, setResults] = useState<EnrichedResult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentResults, setCurrentResults] = useState<Partial<Result>[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<number | undefined>();
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>();

  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const [resultsData, studentData, subjectData] = await Promise.all([getResults(), getStudents(), getSubjects()]);
      setResults(resultsData);
      setStudents(studentData);
      setSubjects(subjectData);
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
    if (currentResults.length > 0 && selectedStudent && selectedSemester) {
        const completeResults = currentResults.map(r => ({
            ...r,
            studentId: selectedStudent.id,
            semester: selectedSemester,
        })).filter(r => r.subjectId && r.marks !== undefined) as Omit<Result, 'id'>[];

      setIsSubmitting(true);
      try {
        await addOrUpdateResults(completeResults);
        toast({ title: "Results Updated", description: "The student's results have been saved." });
        await loadData();
        setDialogOpen(false);
        setCurrentResults([]);
        setSelectedStudent(undefined);
        setSelectedSemester(undefined);
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
        toast({ title: "Missing Information", description: "Please fill out all marks for the student.", variant: "destructive" });
    }
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteResult(id);
      await loadData();
      toast({ title: "Result Deleted", description: "The result entry has been removed." });
    } catch (error: any) {
       toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentResults([]);
    setSelectedStudent(undefined);
    setSelectedSemester(undefined);
    setDialogOpen(true);
  };
  
  const handleStudentAndSemesterSelect = (studentId: string, semester: number) => {
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student);
    setSelectedSemester(semester);
    
    // Prefill with existing data or create empty shells
    const semesterSubjects = subjects.filter(s => s.semester === semester);
    const existingResultsForStudent = results.filter(r => r.studentId === studentId && r.semester === semester);

    const initialResults = semesterSubjects.map(sub => {
        const existing = existingResultsForStudent.find(r => r.subjectId === sub.id);
        return {
            subjectId: sub.id,
            marks: existing?.marks || 0,
        };
    });
    setCurrentResults(initialResults);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openNewDialog}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Results
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Marks</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">{result.studentName}</TableCell>
                <TableCell>{result.semester}</TableCell>
                <TableCell>{result.subjectName}</TableCell>
                <TableCell>{result.marks} / {result.totalMarks}</TableCell>
                <TableCell>{result.grade}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this result entry.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(result.id)}>Continue</AlertDialogAction></AlertDialogFooter>
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

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Student Results</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className='space-y-2'>
                    <Label>Student</Label>
                    <Select value={selectedStudent?.id} onValueChange={(v) => handleStudentAndSemesterSelect(v, selectedSemester || 1)}>
                        <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                        <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className='space-y-2'>
                     <Label>Semester</Label>
                    <Select value={selectedSemester?.toString()} onValueChange={(v) => handleStudentAndSemesterSelect(selectedStudent!.id, parseInt(v))} disabled={!selectedStudent}>
                        <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                        <SelectContent>{[...Array(8).keys()].map(i => <SelectItem key={i+1} value={(i+1).toString()}>{i+1}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {selectedStudent && selectedSemester && (
                <ScrollArea className="h-72 mt-4 border rounded-md p-4">
                    <div className="space-y-4">
                        {currentResults.map((result, index) => (
                             <div key={result.subjectId} className="grid grid-cols-3 items-center gap-4">
                                <Label htmlFor={`marks-${result.subjectId}`} className="col-span-2">{subjects.find(s => s.id === result.subjectId)?.name}</Label>
                                <Input 
                                    id={`marks-${result.subjectId}`} 
                                    type="number" 
                                    value={result.marks || ''} 
                                    onChange={(e) => {
                                        const newResults = [...currentResults];
                                        newResults[index].marks = parseInt(e.target.value) || 0;
                                        setCurrentResults(newResults);
                                    }}
                                    className="col-span-1"
                                />
                             </div>
                        ))}
                    </div>
                </ScrollArea>
            )}

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting || !selectedStudent || !selectedSemester}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    