
'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { addSubmission } from '@/lib/services/assignments';
import type { EnrichedAssignment, Submission } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { Loader2, Upload, CheckCircle, Clock } from 'lucide-react';

interface AssignmentsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  assignments: (EnrichedAssignment & { submission: Submission | null })[];
  studentId: string;
}

export default function AssignmentsDialog({ isOpen, onOpenChange, assignments, studentId }: AssignmentsDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, assignmentId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload this file and get a URL.
      // Here, we'll simulate it and immediately submit.
      const simulatedFileUrl = `https://example.com/uploads/${studentId}/${file.name}`;
      handleSubmit(assignmentId, simulatedFileUrl);
    }
  };

  const handleSubmit = async (assignmentId: string, fileUrl: string) => {
    setIsSubmitting(assignmentId);
    try {
      await addSubmission({
        assignmentId,
        studentId,
        fileUrl,
      });
      toast({ title: 'Success', description: 'Your assignment has been submitted.' });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard', studentId] });

    } catch (error: any) {
      toast({ title: 'Submission Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(null);
    }
  };

  const getStatusBadge = (assignment: EnrichedAssignment & { submission: Submission | null }) => {
    if (assignment.submission) {
      return <Badge variant="default"><CheckCircle className="mr-1 h-3 w-3" />Submitted</Badge>;
    }
    if (new Date(assignment.dueDate) < new Date()) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Assignments & Lab Manuals</DialogTitle>
          <DialogDescription>View and submit your assigned work.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-1 space-y-4">
          {assignments && assignments.length > 0 ? (
            assignments.map(assignment => (
              <Card key={assignment.id}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>{assignment.title}</CardTitle>
                            <CardDescription>{assignment.subjectName} - Due: {format(parseISO(assignment.dueDate), 'PPP')}</CardDescription>
                        </div>
                        {getStatusBadge(assignment)}
                    </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{assignment.description}</p>
                </CardContent>
                <CardFooter className="justify-between">
                  <Button variant="link" className="p-0" onClick={() => window.open(assignment.fileUrl, '_blank')}>View Assignment File</Button>
                  
                  {assignment.submission ? (
                      <div className='text-sm text-muted-foreground'>
                          Submitted on {format(parseISO(assignment.submission.submittedAt), 'PPP')}
                          {assignment.submission.grade && <span className="font-semibold text-primary ml-2">| Grade: {assignment.submission.grade}</span>}
                      </div>
                  ) : (
                    <Button onClick={() => document.getElementById(`submission-input-${assignment.id}`)?.click()} disabled={isSubmitting === assignment.id}>
                      {isSubmitting === assignment.id ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Upload className="h-4 w-4 mr-2" />}
                      Submit Work
                    </Button>
                  )}
                  <input 
                    type="file" 
                    id={`submission-input-${assignment.id}`} 
                    className="hidden"
                    onChange={(e) => handleFileChange(e, assignment.id)}
                  />
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>No assignments found.</p>
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
