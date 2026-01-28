

'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStudentsByClass } from '@/lib/services/students';
import { getAttendanceForSlot, upsertAttendance } from '@/lib/services/attendance';
import type { Student, Attendance, EnrichedSchedule } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

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

  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'disputed'>>({});
  const [quickMarkValue, setQuickMarkValue] = useState('');

  useEffect(() => {
    if (students && existingAttendance) {
      const initialAttendance = students.reduce((acc, student) => {
        const record = existingAttendance.find(a => a.studentId === student.id);
        acc[student.id] = record?.status || 'present';
        return acc;
      }, {} as Record<string, 'present' | 'absent' | 'disputed'>);
      setAttendance(initialAttendance);
    } else if (students) {
      const initialAttendance = students.reduce((acc, student) => {
        acc[student.id] = 'present';
        return acc;
      }, {} as Record<string, 'present' | 'absent' | 'disputed'>);
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
    const records = Object.entries(attendance)
        .filter(([studentId, status]) => status !== 'disputed') // Don't save over a student's dispute
        .map(([studentId, status]) => ({
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

  const handleQuickMark = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && quickMarkValue.trim() !== '') {
        e.preventDefault();
        if (!students) return;

        const term = quickMarkValue.trim().toLowerCase();
        
        const studentToMark = students.find(
            s => s.rollNumber.toString() === term || s.name.toLowerCase().includes(term)
        );

        if (studentToMark) {
            if (attendance[studentToMark.id] !== 'present') {
                handleStatusChange(studentToMark.id, 'present');
            }
            toast({
                title: 'Marked Present',
                description: `${studentToMark.name} is marked as present.`,
            });
            setQuickMarkValue('');
        } else {
            toast({
                title: 'Student Not Found',
                description: `No student found matching "${quickMarkValue}".`,
                variant: 'destructive',
            });
        }
    }
  };

  const handleSelectAll = (checked: boolean | string) => {
    if (students) {
        const newAttendance = { ...attendance };
        students.forEach(student => {
            if (newAttendance[student.id] !== 'disputed') {
                newAttendance[student.id] = checked ? 'present' : 'absent';
            }
        });
        setAttendance(newAttendance);
    }
  }

  const allPresent = students ? students.every(s => attendance[s.id] === 'present' || attendance[s.id] === 'disputed') : false;
  const isLoading = studentsLoading || attendanceLoading;
  const disputedCount = Object.values(attendance).filter(s => s === 'disputed').length;

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
          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {disputedCount > 0 && (
                <Alert>
                    <AlertTriangle className="h-4 w-4"/>
                    <AlertTitle>{disputedCount} Disputed Record(s)</AlertTitle>
                    <AlertDescription>
                        A student has disputed their 'absent' mark. Please verify and update their status.
                    </AlertDescription>
                </Alert>
            )}
            <div className="space-y-2">
                <Label htmlFor="quick-mark">Quick Mark</Label>
                <Input
                    id="quick-mark"
                    placeholder="Enter Roll No. or Name and press Enter to mark present"
                    value={quickMarkValue}
                    onChange={(e) => setQuickMarkValue(e.target.value)}
                    onKeyDown={handleQuickMark}
                />
            </div>
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
                  <TableRow key={student.id} className={attendance[student.id] === 'disputed' ? 'bg-yellow-100 dark:bg-yellow-900/30' : ''}>
                    <TableCell>
                        <Checkbox 
                            checked={attendance[student.id] === 'present'}
                            onCheckedChange={(checked) => handleStatusChange(student.id, checked ? 'present' : 'absent')}
                            disabled={attendance[student.id] === 'disputed'}
                        />
                    </TableCell>
                    <TableCell>{student.name}</TableCell>
                    <TableCell className="text-right">
                       {attendance[student.id] === 'disputed' ? (
                           <Badge variant="secondary" className="bg-yellow-400 text-yellow-900">
                               <HelpCircle className="h-3 w-3 mr-1" />
                               Disputed
                           </Badge>
                       ) : (
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
                       )}
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

