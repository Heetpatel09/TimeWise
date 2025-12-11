
'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStudentsByClass } from '@/lib/services/students';
import { getAttendanceForSlot, upsertAttendance } from '@/lib/services/attendance';
import type { Student, Attendance, EnrichedSchedule } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface AttendanceDialogProps {
  slot: EnrichedSchedule | null;
  date: Date;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function AttendanceDialog({ slot, date, isOpen, onOpenChange }: AttendanceDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const dateString = date.toISOString().split('T')[0];

  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ['students', slot?.classId],
    queryFn: () => getStudentsByClass(slot!.classId),
    enabled: !!slot,
  });

  const { data: existingAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ['attendance', slot?.id, dateString],
    queryFn: () => getAttendanceForSlot(slot!.id, dateString),
    enabled: !!slot,
  });

  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent'>>({});

  useEffect(() => {
    if (students && existingAttendance) {
      const initialAttendance = students.reduce((acc, student) => {
        const record = existingAttendance.find(a => a.studentId === student.id);
        acc[student.id] = record?.status === 'absent' ? 'absent' : 'present';
        return acc;
      }, {} as Record<string, 'present' | 'absent'>);
      setAttendance(initialAttendance);
    } else if (students) {
      const initialAttendance = students.reduce((acc, student) => {
        acc[student.id] = 'present';
        return acc;
      }, {} as Record<string, 'present' | 'absent'>);
      setAttendance(initialAttendance);
    }
  }, [students, existingAttendance]);
  
  const mutation = useMutation({
    mutationFn: (records: Omit<Attendance, 'id' | 'timestamp' | 'isLocked'>[]) => upsertAttendance(records),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', slot?.id, dateString] });
      toast({ title: 'Attendance Saved', description: 'The attendance has been recorded.' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });

  const handleSave = () => {
    if (!slot) return;
    const records = Object.entries(attendance).map(([studentId, status]) => ({
      scheduleId: slot.id,
      studentId,
      date: dateString,
      status,
    }));
    mutation.mutate(records);
  };
  
  const handleStatusChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendance(prev => ({...prev, [studentId]: status}));
  }

  const handleSelectAll = (checked: boolean) => {
    if (students) {
        const newAttendance = students.reduce((acc, student) => {
            acc[student.id] = checked ? 'present' : 'absent';
            return acc;
        }, {} as Record<string, 'present' | 'absent'>);
        setAttendance(newAttendance);
    }
  }

  const allPresent = students ? Object.values(attendance).every(s => s === 'present') : false;
  const isLoading = studentsLoading || attendanceLoading;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Take Attendance</DialogTitle>
          <DialogDescription>
            {slot?.subjectName} - {slot?.className} on {new Date(date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                    <TableHead className="w-12">
                        <Checkbox 
                            checked={allPresent}
                            onCheckedChange={handleSelectAll}
                            aria-label="Select all students"
                        />
                    </TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students?.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>
                        <Checkbox 
                            checked={attendance[student.id] === 'present'}
                            onCheckedChange={(checked) => handleStatusChange(student.id, checked ? 'present' : 'absent')}
                        />
                    </TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell className="text-right">
                       <RadioGroup 
                         value={attendance[student.id] || 'present'}
                         onValueChange={(value: 'present' | 'absent') => handleStatusChange(student.id, value)}
                         className="justify-end"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="present" id={`present-${student.id}`} />
                            <Label htmlFor={`present-${student.id}`}>Present</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="absent" id={`absent-${student.id}`} />
                            <Label htmlFor={`absent-${student.id}`}>Absent</Label>
                          </div>
                        </RadioGroup>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    