'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSubstituteAssignment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getSubstituteAssignmentsForFaculty } from '@/lib/services/substitutions';

export default function SubstituteAssignmentsView() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<EnrichedSubstituteAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            try {
                const data = await getSubstituteAssignmentsForFaculty(user.id);
                setAssignments(data);
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to load assignments.', variant: 'destructive'});
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadData();
  }, [user, toast]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (assignments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">You have no approved substitution assignments.</p>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Classroom</TableHead>
            <TableHead>Original Faculty</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
              <TableCell>{item.schedule.day}, {item.schedule.time}</TableCell>
              <TableCell>{item.schedule.className}</TableCell>
              <TableCell>{item.schedule.subjectName}</TableCell>
              <TableCell>{item.schedule.classroomName}</TableCell>
              <TableCell>{item.originalFacultyName}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
