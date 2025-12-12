
'use client';
import { useQuery } from '@tanstack/react-query';
import type { EnrichedAttendance } from '@/lib/types';
import { getStudentAttendance } from '@/lib/services/attendance';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState, useMemo } from 'react';

interface AttendanceDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  studentId: string;
}

function AttendanceStats({ records }: { records: EnrichedAttendance[] }) {
    const total = records.length;
    if (total === 0) return null;

    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const disputed = records.filter(r => r.status === 'disputed').length;
    const percentage = total > 0 ? (present / total) * 100 : 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Overall Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-3xl font-bold">{percentage.toFixed(0)}%</p>
                    <p className="text-sm text-muted-foreground">Attendance</p>
                </div>
                 <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-3xl font-bold text-green-600">{present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                </div>
                 <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-3xl font-bold text-red-600">{absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                 <div className="p-4 rounded-lg bg-secondary">
                    <p className="text-3xl font-bold text-yellow-600">{disputed}</p>
                    <p className="text-sm text-muted-foreground">Disputed</p>
                </div>
            </CardContent>
        </Card>
    )
}

function AttendanceCalculator({ records }: { records: EnrichedAttendance[] }) {
    const [targetPercentage, setTargetPercentage] = useState(75);
    const total = records.length;
    const present = records.filter(r => r.status === 'present').length;
    const currentPercentage = total > 0 ? (present / total) * 100 : 100;

    const classesToAttend = useMemo(() => {
        if (currentPercentage >= targetPercentage) return 0;
        // Formula: (target * total - 100 * present) / (100 - target)
        const numerator = (targetPercentage * total) - (100 * present);
        const denominator = 100 - targetPercentage;
        if (denominator <= 0) return Infinity; // Cannot reach target
        return Math.ceil(numerator / denominator);
    }, [targetPercentage, currentPercentage, total, present]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Attendance Calculator</CardTitle>
                <CardDescription>Calculate how many classes you need to attend to reach your target percentage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {currentPercentage < 75 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4"/>
                        <AlertTitle>Low Attendance Warning</AlertTitle>
                        <AlertDescription>
                            Your current attendance is {currentPercentage.toFixed(1)}%. You need to attend more classes to avoid consequences.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="space-y-2 flex-1 w-full">
                        <Label htmlFor="target">Target Percentage (%)</Label>
                        <Input
                            id="target"
                            type="number"
                            value={targetPercentage}
                            onChange={e => setTargetPercentage(Number(e.target.value))}
                            min="1"
                            max="100"
                        />
                    </div>
                    <div className="text-center bg-secondary p-4 rounded-md flex-1 w-full mt-2 sm:mt-0">
                        {classesToAttend === Infinity ? (
                            <p className="text-lg font-bold text-destructive">Target Unreachable</p>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">You need to attend</p>
                                <p className="text-3xl font-bold">{classesToAttend}</p>
                                <p className="text-sm text-muted-foreground">more class(es) to reach {targetPercentage}%.</p>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AttendanceDialog({ isOpen, onOpenChange, studentId }: AttendanceDialogProps) {

  const { data: attendanceRecords, isLoading } = useQuery<EnrichedAttendance[]>({
    queryKey: ['studentAttendance', studentId],
    queryFn: () => getStudentAttendance(studentId),
    enabled: !!studentId,
  });

  const getStatusVariant = (status: 'present' | 'absent' | 'disputed') => {
    switch (status) {
      case 'present': return 'default';
      case 'absent': return 'destructive';
      case 'disputed': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>My Attendance</DialogTitle>
          <DialogDescription>
            Here is a log of your attendance records and a tool to calculate your required attendance.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : !attendanceRecords || attendanceRecords.length === 0 ? (
            <div className="text-center py-16">
                <p className="text-muted-foreground">No attendance records found yet.</p>
            </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto space-y-4 p-1">
             <AttendanceStats records={attendanceRecords}/>
             <AttendanceCalculator records={attendanceRecords}/>
            <Card>
                <CardHeader><CardTitle>Attendance Log</CardTitle></CardHeader>
                <CardContent>
                    <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Faculty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {attendanceRecords.map(record => (
                        <TableRow key={record.id}>
                            <TableCell>{format(parseISO(record.date), 'PPP')}</TableCell>
                            <TableCell>{record.subjectName}</TableCell>
                            <TableCell>
                            <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                            </TableCell>
                            <TableCell>{record.facultyName}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                    </Table>
                </CardContent>
            </Card>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
