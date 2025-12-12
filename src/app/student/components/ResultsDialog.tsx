
'use client';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnrichedResult, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Loader2, Award, TrendingUp } from 'lucide-react';
import { exportResultsToPDF } from '../actions';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    
    const subjectMap = new Map<string, { internal: EnrichedResult | null, external: EnrichedResult | null, subjectName: string, subjectCode: string }>();

    results.forEach(res => {
        if (res.semester !== selectedSemester) return;

        if (!subjectMap.has(res.subjectId)) {
            subjectMap.set(res.subjectId, {
                internal: null,
                external: null,
                subjectName: res.subjectName,
                subjectCode: res.subjectCode,
            });
        }
        
        const subjectResult = subjectMap.get(res.subjectId)!;

        if (res.examType === 'internal') {
            subjectResult.internal = res;
        } else if (res.examType === 'external') {
            subjectResult.external = res;
        }
    });

    return Array.from(subjectMap.values());
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
        <div className="space-y-4">
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
          
          {selectedSemester ? (
            <div className='space-y-4'>
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                           <CardTitle className="text-sm font-medium">Semester GPA (SGPA)</CardTitle>
                           <Award className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold">{student.sgpa.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                           <CardTitle className="text-sm font-medium">Cumulative GPA (CGPA)</CardTitle>
                           <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                           <div className="text-2xl font-bold">{student.cgpa.toFixed(2)}</div>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Semester {selectedSemester} Marksheet</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-72">
                        <div className="space-y-3 pr-4">
                        {filteredResults.map(res => (
                             <Card key={res.subjectCode} className="p-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{res.subjectName}</p>
                                        <p className="text-xs text-muted-foreground">{res.subjectCode}</p>
                                    </div>
                                    <p className="text-lg font-bold text-primary">{res.external?.grade || res.internal?.grade || 'N/A'}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                                    <div className="bg-muted p-2 rounded-md">
                                        <p className="font-medium">Internal</p>
                                        <p>Marks: {res.internal?.marks ?? '-'} / {res.internal?.totalMarks ?? '-'}</p>
                                    </div>
                                    <div className="bg-muted p-2 rounded-md">
                                        <p className="font-medium">External</p>
                                        <p>Grade: {res.external?.grade ?? '-'}</p>
                                    </div>
                                </div>
                             </Card>
                        ))}
                        </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
          ) : (
             <div className="text-center py-16 text-muted-foreground">
                <p>No results found. Please select a semester.</p>
            </div>
          )}

        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
