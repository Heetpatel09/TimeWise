
'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSchedule, Student, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Library, Coffee, Star } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { getTimetableDataForStudent, getSubjectsForStudent } from '../actions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TimetableData {
    student: Student & { className: string };
    schedule: EnrichedSchedule[];
}

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '09:30 AM - 10:00 AM', // Break
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM', // Break
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['09:30 AM - 10:00 AM', '12:00 PM - 01:00 PM'];

export default function TimetableView() {
  const { user } = useAuth();
  const [data, setData] = useState<TimetableData | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
        if (user?.id) {
            setIsLoading(true);
            const [timetableData, subjectData] = await Promise.all([
              getTimetableDataForStudent(user.id),
              getSubjectsForStudent(user.id)
            ]);
            setData(timetableData as TimetableData);
            setSubjects(subjectData);
            setIsLoading(false);
        }
    }
    loadData();
  }, [user]);

  const studentSchedule = data?.schedule || [];
  const className = data?.student?.className || '';

  const exportPDF = () => {
    if (!data?.student) return;
    const doc = new jsPDF();
    doc.text(`Timetable for ${data.student.name} (${className})`, 14, 16);
    
    const tableData = DAYS.flatMap(day => {
        const daySlots = ALL_TIME_SLOTS.map(time => {
            if (BREAK_SLOTS.includes(time)) {
                return [day, time, 'Break', '-', '-'];
            }
            const slot = studentSchedule.find(s => s.day === day && s.time === time);
            if (slot) {
                return [day, time, slot.subjectName, slot.facultyName, slot.classroomName];
            }
            return [day, time, 'Library Slot', '-', '-'];
        });
        return daySlots;
    });

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Subject', 'Faculty', 'Classroom']],
        body: tableData,
        startY: 20,
    });

    doc.save('my_timetable.pdf');
  }
  
  const scheduleByTime = ALL_TIME_SLOTS.map(time => {
    if (BREAK_SLOTS.includes(time)) {
        return {
            time: time,
            isBreak: true,
            slots: [],
        };
    }
    const dailySlots = DAYS.map(day => {
      const slotsForDayAndTime = studentSchedule.filter(
        s => s.day === day && s.time === time
      );
      return {
        day,
        slots: slotsForDayAndTime.map(slot => {
             const subject = subjects.find(sub => sub.id === slot.subjectId);
              return {
                ...slot,
                subjectIsSpecial: subject?.isSpecial || false,
              };
        }),
      };
    });
    return { time, slots: dailySlots, isBreak: false };
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
        <div className="flex justify-end mb-4">
            <Button onClick={exportPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
            </Button>
        </div>
        <Card>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table className="border-collapse">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border font-semibold">Time</TableHead>
                                {DAYS.map(day => (
                                    <TableHead key={day} className="border font-semibold">{day}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduleByTime.map(({ time, slots, isBreak }) => (
                                <TableRow key={time}>
                                    <TableCell className="border font-medium text-xs whitespace-nowrap">{time}</TableCell>
                                    {isBreak ? (
                                        <TableCell colSpan={DAYS.length} className="border text-center font-semibold bg-secondary">
                                            RECESS TIME: {time.replace(/ AM| PM/g, '')}
                                        </TableCell>
                                    ) : (
                                        slots.map(({ day, slots: daySlots }) => (
                                            <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                {daySlots.length > 0 ? (
                                                    daySlots.map(slot => (
                                                        <div key={slot.id} className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", slot.subjectIsSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                            <div><strong>{slot.subjectName}</strong></div>
                                                            <div>{slot.facultyName}</div>
                                                            <div>{slot.classroomName}</div>
                                                        </div>
                                                    ))
                                                ) : ( day !== 'Saturday' &&
                                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                                        <Library className="h-4 w-4" />
                                                    </div>
                                                )}
                                            </TableCell>
                                        ))
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
