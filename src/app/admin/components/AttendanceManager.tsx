
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';


function AttendanceStats({ records }: { records: EnrichedAttendance[] }) {
    const total = records.length;
    if (total === 0) return null;

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const disputed = records.filter(r => r.status === 'disputed').length;
    const percentage = (present / total) * 100;

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-2 rounded-lg bg-secondary">
                <p className="text-2xl font-bold">{percentage.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Present</p>
            </div>
             <div className="p-2 rounded-lg bg-secondary">
                <p className="text-2xl font-bold text-green-600">{present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
            </div>
             <div className="p-2 rounded-lg bg-secondary">
                <p className="text-2xl font-bold text-red-600">{absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
            </div>
             <div className="p-2 rounded-lg bg-secondary">
                <p className="text-2xl font-bold text-yellow-600">{disputed}</p>
                <p className="text-xs text-muted-foreground">Disputed</p>
            </div>
        </div>
    )
}


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
    <Accordion type="single" collapsible className="w-full space-y-4">
      {sortedGroups.map(({ details, records }) => (
        <Card key={`${details.scheduleId}-${details.date}`}>
            <AccordionItem value={`${details.scheduleId}-${details.date}`} className="border-b-0">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                             <CardTitle>{details.subjectName} - {details.className}</CardTitle>
                             <CardDescription>
                                {format(parseISO(details.date), 'PPP')} | {details.day}, {details.time} | Prof. {details.facultyName}
                            </CardDescription>
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
                </CardHeader>
                <CardContent>
                   <AttendanceStats records={records} />
                   <AccordionTrigger className="text-sm mt-4">View Details</AccordionTrigger>
                </CardContent>
                 <AccordionContent>
                    <div className="border-t">
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
                 </AccordionContent>
            </AccordionItem>
        </Card>
      ))}
    </Accordion>
  );
}
