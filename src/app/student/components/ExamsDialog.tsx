
'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EnrichedExam } from '@/lib/types';
import { format, parseISO } from 'date-fns';

interface ExamsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  exams: EnrichedExam[];
}

export default function ExamsDialog({ isOpen, onOpenChange, exams }: ExamsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Exam Schedule</DialogTitle>
          <DialogDescription>
            Your upcoming exam timetable.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          {exams && exams.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Classroom</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell>{format(parseISO(exam.date), 'PPP')}</TableCell>
                    <TableCell>{exam.time}</TableCell>
                    <TableCell>{exam.subjectName}</TableCell>
                    <TableCell>{exam.classroomName || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>No exams have been scheduled yet.</p>
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
