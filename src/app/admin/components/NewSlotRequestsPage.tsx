
'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { NewSlotRequest, Faculty, Class, Subject, Classroom } from '@/lib/types';
import { Check, X, Loader2 } from 'lucide-react';
import { getNewSlotRequests, updateNewSlotRequestStatus } from '@/lib/services/new-slot-requests';
import { getFaculty } from '@/lib/services/faculty';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { useToast } from '@/hooks/use-toast';

export default function NewSlotRequestsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const { data: requests, isLoading: requestsLoading } = useQuery<NewSlotRequest[]>({ queryKey: ['newSlotRequests'], queryFn: getNewSlotRequests });
  const { data: faculty, isLoading: facultyLoading } = useQuery<Faculty[]>({ queryKey: ['faculty'], queryFn: getFaculty });
  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({ queryKey: ['classes'], queryFn: getClasses });
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: getSubjects });
  const { data: classrooms, isLoading: classroomsLoading } = useQuery<Classroom[]>({ queryKey: ['classrooms'], queryFn: getClassrooms });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => updateNewSlotRequestStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newSlotRequests'] });
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
      toast({ title: "Success", description: "Request status updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
    onSettled: () => {
      setIsUpdating(null);
    }
  });

  const handleRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdating(id);
    updateStatusMutation.mutate({ id, status });
  };
  
  const getFacultyName = (facultyId: string) => faculty?.find(f => f.id === facultyId)?.name || 'Unknown';
  const getClassName = (classId: string) => classes?.find(c => c.id === classId)?.name || 'Unknown';
  const getSubjectName = (subjectId: string) => subjects?.find(s => s.id === subjectId)?.name || 'Unknown';
  const getClassroomName = (classroomId: string) => classrooms?.find(cr => cr.id === classroomId)?.name || 'Unknown';

  const pendingRequests = requests?.filter(r => r.status === 'pending');
  const resolvedRequests = requests?.filter(r => r.status !== 'pending');

  const getStatusVariant = (status: NewSlotRequest['status']) => {
    switch(status) {
        case 'pending': return 'secondary';
        case 'approved': return 'default';
        case 'rejected': return 'destructive';
        default: return 'outline';
    }
  }

  const renderRequestTable = (reqs: NewSlotRequest[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faculty</TableHead>
            <TableHead>Day & Time</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Classroom</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reqs.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{getFacultyName(request.facultyId)}</TableCell>
              <TableCell>{request.day}, {request.time}</TableCell>
              <TableCell>{getClassName(request.classId)}</TableCell>
              <TableCell>{getSubjectName(request.subjectId)}</TableCell>
              <TableCell>{getClassroomName(request.classroomId)}</TableCell>
              <TableCell>
                  <Badge variant={getStatusVariant(request.status)}>
                      {request.status}
                  </Badge>
              </TableCell>
              <TableCell className="text-right">
                {request.status === 'pending' && (
                  isUpdating === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                  ) : (
                      <div className="flex gap-2 justify-end">
                          <Button size="icon" variant="outline" className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleRequestStatus(request.id, 'approved')}>
                              <Check className="h-4 w-4" />
                          </Button>
                           <Button size="icon" variant="outline" className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRequestStatus(request.id, 'rejected')}>
                              <X className="h-4 w-4" />
                          </Button>
                      </div>
                  )
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const isLoading = requestsLoading || facultyLoading || classesLoading || subjectsLoading || classroomsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
        <h3 className='text-lg font-semibold mb-2'>Pending ({pendingRequests?.length})</h3>
        {pendingRequests && pendingRequests.length > 0 ? renderRequestTable(pendingRequests) : <p className="text-muted-foreground text-center py-8">No pending requests.</p>}
        
        <h3 className='text-lg font-semibold mt-6 mb-2'>Resolved ({resolvedRequests?.length})</h3>
        {resolvedRequests && resolvedRequests.length > 0 ? renderRequestTable(resolvedRequests) : <p className="text-muted-foreground text-center py-8">No resolved requests.</p>}
    </div>
  );
}
