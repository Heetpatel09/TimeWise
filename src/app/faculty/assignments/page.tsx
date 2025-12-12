
'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  addAssignment,
  getAssignmentsForFaculty,
  getSubmissionsForAssignment,
  gradeSubmission,
} from '@/lib/services/assignments';
import { getSubjects } from '@/lib/services/subjects';
import { getClasses } from '@/lib/services/classes';
import type {
  EnrichedAssignment,
  EnrichedSubmission,
  Subject,
  Class,
} from '@/lib/types';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  PlusCircle,
  Upload,
  Eye,
  Edit,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { format, parseISO } from 'date-fns';

function AssignmentCard({
  assignment,
  onViewSubmissions,
}: {
  assignment: EnrichedAssignment;
  onViewSubmissions: (assignment: EnrichedAssignment) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{assignment.title}</CardTitle>
            <CardDescription>
              {assignment.className} - {assignment.subjectName}
            </CardDescription>
          </div>
          <Badge variant={assignment.type === 'lab_manual' ? 'secondary' : 'outline'}>
            {assignment.type === 'lab_manual' ? 'Lab Manual' : 'Assignment'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{assignment.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div>
          <p className="text-xs text-muted-foreground">Due Date</p>
          <p className="text-sm font-semibold">{format(parseISO(assignment.dueDate), 'PPP')}</p>
        </div>
        <Button onClick={() => onViewSubmissions(assignment)}>
          <Eye className="mr-2 h-4 w-4" /> View Submissions ({assignment.submissionCount})
        </Button>
      </CardFooter>
    </Card>
  );
}

function SubmissionsDialog({
  assignment,
  isOpen,
  onOpenChange,
}: {
  assignment: EnrichedAssignment | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: submissions, isLoading } = useQuery<EnrichedSubmission[]>({
    queryKey: ['submissions', assignment?.id],
    queryFn: () => getSubmissionsForAssignment(assignment!.id),
    enabled: !!assignment,
  });

  const [editingSubmission, setEditingSubmission] = useState<EnrichedSubmission | null>(null);
  const [grade, setGrade] = useState('');
  const [remarks, setRemarks] = useState('');

  const gradeMutation = useMutation({
    mutationFn: ({ submissionId, grade, remarks }: { submissionId: string; grade: string; remarks?: string }) => gradeSubmission(submissionId, grade, remarks),
    onSuccess: () => {
        toast({ title: "Graded", description: "The submission has been graded."});
        queryClient.invalidateQueries({ queryKey: ['submissions', assignment?.id] });
        setEditingSubmission(null);
        setGrade('');
        setRemarks('');
    },
    onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
    }
  });

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Submissions for "{assignment.title}"</DialogTitle>
          <DialogDescription>
            Review and grade student submissions.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
            {isLoading ? <Loader2 className="mx-auto my-16 h-8 w-8 animate-spin" /> :
             !submissions || submissions.length === 0 ? <p className='text-center py-16 text-muted-foreground'>No submissions yet.</p> : (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Enrollment No.</TableHead>
                        <TableHead>Submitted At</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {submissions.map(sub => (
                        <TableRow key={sub.id}>
                            <TableCell>{sub.studentName}</TableCell>
                            <TableCell>{sub.studentEnrollmentNumber}</TableCell>
                            <TableCell>{format(parseISO(sub.submittedAt), 'PPP p')}</TableCell>
                            <TableCell>
                                {editingSubmission?.id === sub.id ? (
                                    <Input value={grade} onChange={(e) => setGrade(e.target.value)} className="w-24 h-8" />
                                ) : (
                                    sub.grade || <span className="text-muted-foreground">Not Graded</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                {editingSubmission?.id === sub.id ? (
                                    <div className='flex gap-2 justify-end'>
                                        <Button size="sm" onClick={() => gradeMutation.mutate({ submissionId: sub.id, grade, remarks })} disabled={gradeMutation.isPending}>Save</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingSubmission(null)}>Cancel</Button>
                                    </div>
                                ) : (
                                    <Button size="sm" variant="outline" onClick={() => { setEditingSubmission(sub); setGrade(sub.grade || ''); setRemarks(sub.remarks || ''); }}>
                                        <GraduationCap className="mr-2 h-4 w-4"/> Grade
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<EnrichedAssignment | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<'assignment' | 'lab_manual'>('assignment');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const { data: assignments, isLoading } = useQuery<EnrichedAssignment[]>({
    queryKey: ['assignments', user?.id],
    queryFn: () => getAssignmentsForFaculty(user!.id),
    enabled: !!user,
  });

  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: getSubjects,
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: getClasses,
  });

  const addMutation = useMutation({
    mutationFn: addAssignment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments', user?.id] });
      toast({ title: 'Success', description: 'Assignment has been posted.' });
      setAddDialogOpen(false);
      // Reset form
      setTitle(''); setDescription(''); setDueDate(''); setType('assignment'); setClassId(''); setSubjectId('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!user) return;
    addMutation.mutate({
      facultyId: user.id,
      title, description, dueDate, type, classId, subjectId,
      fileUrl: 'https://example.com/placeholder.pdf' // Placeholder URL
    });
  };

  return (
    <DashboardLayout pageTitle="Assignments" role="faculty">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setAddDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : !assignments || assignments.length === 0 ? (
        <div className="text-center py-16 border rounded-lg bg-card">
            <h2 className="text-xl font-semibold">No Assignments Yet</h2>
            <p className="text-muted-foreground mt-2">Click "New Assignment" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((ass) => (
            <AssignmentCard
              key={ass.id}
              assignment={ass}
              onViewSubmissions={setSelectedAssignment}
            />
          ))}
        </div>
      )}

      {/* Add Assignment Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Assignment / Lab Manual</DialogTitle>
            <DialogDescription>
              Fill in the details and upload the file.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="class">Class</Label>
                    <Select value={classId} onValueChange={setClassId}>
                        <SelectTrigger><SelectValue placeholder="Select Class"/></SelectTrigger>
                        <SelectContent>{classes?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                        <SelectTrigger><SelectValue placeholder="Select Subject"/></SelectTrigger>
                        <SelectContent>{subjects?.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={type} onValueChange={(v: any) => setType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="assignment">Assignment</SelectItem>
                            <SelectItem value="lab_manual">Lab Manual</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="space-y-2">
                <Label>File</Label>
                <Input type="file" />
                <p className="text-xs text-muted-foreground">File upload is for demonstration purposes.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={addMutation.isPending}>
                {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin"/>} Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* View Submissions Dialog */}
      <SubmissionsDialog 
        assignment={selectedAssignment}
        isOpen={!!selectedAssignment}
        onOpenChange={(isOpen) => { if(!isOpen) setSelectedAssignment(null)}}
      />

    </DashboardLayout>
  );
}
