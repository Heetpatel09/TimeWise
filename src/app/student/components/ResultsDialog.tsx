
'use client';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnrichedResult, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2 } from 'lucide-react';
import { exportResultsToPDF } from '../actions';
import { useToast } from '@/hooks/use-toast';

interface ResultsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  results: EnrichedResult[];
  student: Student & { className: string };
}

export default function ResultsDialog({ isOpen, onOpenChange, results, student }: ResultsDialogProps) {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const semesters = useMemo(() => [...new Set(results.map(r => r.semester))].sort((a,b) => b-a), [results]);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(semesters[0] || null);

  const filteredResults = useMemo(() => {
    if (!selectedSemester) return [];
    return results.filter(r => r.semester === selectedSemester);
  }, [results, selectedSemester]);
  
  const handleDownload = async () => {
    if (!student || !selectedSemester) return;
    setIsDownloading(true);
    try {
        const semesterResults = results.filter(r => r.semester === selectedSemester);
        
        const { pdf, error } = await exportResultsToPDF(student, semesterResults, selectedSemester);
        if (error) throw new Error(error);

        const blob = new Blob([new Uint8Array(atob(pdf!).split('').map(char => char.charCodeAt(0)))], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `result_sem${selectedSemester}_${student.name}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err: any) {
        toast({ title: 'Download Failed', description: err.message, variant: 'destructive' });
    } finally {
        setIsDownloading(false);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>My Results</DialogTitle>
          <DialogDescription>
            View your semester-wise academic performance.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
          <div className="flex justify-between items-center">
             <Select value={selectedSemester?.toString()} onValueChange={v => setSelectedSemester(parseInt(v))}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Semester" />
                </SelectTrigger>
                <SelectContent>
                    {semesters.map(sem => <SelectItem key={sem} value={sem.toString()}>Semester {sem}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button onClick={handleDownload} disabled={isDownloading || !selectedSemester}>
              {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4"/>}
              Download PDF
            </Button>
          </div>
          
          {selectedSemester && (
            <div className='space-y-4'>
                <Card>
                    <CardHeader>
                        <CardTitle>Semester {selectedSemester} Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject Code</TableHead>
                                    <TableHead>Subject Name</TableHead>
                                    <TableHead>Exam Type</TableHead>
                                    <TableHead>Marks</TableHead>
                                    <TableHead>Grade</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults.map(res => (
                                    <TableRow key={res.id}>
                                        <TableCell>{res.subjectCode}</TableCell>
                                        <TableCell>{res.subjectName}</TableCell>
                                        <TableCell className="capitalize">{res.examType}</TableCell>
                                        <TableCell>{res.marks !== null ? `${res.marks} / ${res.totalMarks}` : '-'}</TableCell>
                                        <TableCell>{res.grade}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Performance Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 text-center">
                        <div className="p-4 rounded-lg bg-secondary">
                             <p className="text-3xl font-bold">{student.sgpa.toFixed(2)}</p>
                             <p className="text-sm text-muted-foreground">Current SGPA</p>
                        </div>
                         <div className="p-4 rounded-lg bg-secondary">
                             <p className="text-3xl font-bold">{student.cgpa.toFixed(2)}</p>
                             <p className="text-sm text-muted-foreground">Overall CGPA</p>
                        </div>
                    </CardContent>
                 </Card>
            </div>
          )}

          {!selectedSemester && (
             <div className="text-center py-16 text-muted-foreground">
                <p>No results found. Please select a semester.</p>
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
