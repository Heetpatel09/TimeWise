
'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { getAllAttendanceRecords, lockAttendanceSlot } from '@/lib/services/attendance';
import type { EnrichedAttendance } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { format, parseISO } from 'date-fns';

export default function AttendanceManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: attendanceRecords, isLoading } = useQuery<EnrichedAttendance[]>({
    queryKey: ['allAttendance'],
    queryFn: getAllAttendanceRecords
  });

  const lockMutation = useMutation({
    mutationFn: ({ scheduleId, date }: { scheduleId: string, date: string }) => lockAttendanceSlot(scheduleId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allAttendance'] });
      toast({ title: 'Attendance Locked', description: 'The attendance for this slot has been finalized.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const getStatusVariant = (status: 'present' | 'absent' | 'disputed') => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'disputed': return 'secondary';
      default: return 'outline';
    }
  };

  const groupedRecords = attendanceRecords?.reduce((acc, record) => {
    const key = `${record.scheduleId}-${record.date}`;
    if (!acc[key]) {
      acc[key] = {
        details: {
          scheduleId: record.scheduleId,
          date: record.date,
          className: record.className,
          subjectName: record.subjectName,
          facultyName: record.facultyName,
          day: record.day,
          time: record.time,
          isLocked: record.isLocked,
        },
        records: []
      };
    }
    acc[key].records.push(record);
    // If any record in the group is locked, the whole group is locked
    if (record.isLocked) {
        acc[key].details.isLocked = true;
    }
    return acc;
  }, {} as Record<string, { details: any, records: EnrichedAttendance[] }>);

  const sortedGroups = Object.values(groupedRecords || {}).sort((a, b) => new Date(b.details.date).getTime() - new Date(a.details.date).getTime());

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  return (
    <div className="space-y-6">
      {sortedGroups.map(({ details, records }) => (
        <div key={`${details.scheduleId}-${details.date}`} className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold">{details.subjectName} - {details.className}</h3>
              <p className="text-sm text-muted-foreground">
                {format(parseISO(details.date), 'PPP')} | {details.day}, {details.time} | Prof. {details.facultyName}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={details.isLocked || lockMutation.isPending}>
                  <Lock className="h-4 w-4 mr-2" />
                  {details.isLocked ? 'Locked' : 'Lock Attendance'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to lock this attendance?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. Locking will finalize the attendance for this slot, and no further changes can be made by faculty or students.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => lockMutation.mutate({ scheduleId: details.scheduleId, date: details.date })}>
                    Confirm & Lock
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map(record => (
                <TableRow key={record.id}>
                  <TableCell>{record.studentName}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(record.timestamp).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
