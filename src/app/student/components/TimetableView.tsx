
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSchedule, Student, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Library, Bot } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { getTimetableDataForStudent, getSubjectsForStudent } from '../actions';
import { cn } from '@/lib/utils';

interface TimetableData {
    student: Student & { className: string };
    schedule: EnrichedSchedule[];
}

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Break
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Break
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['09:20 AM - 09:30 AM', '11:20 AM - 12:20 PM'];

function sortTime(a: string, b: string) {
    const toMinutes = (time: string) => {
        const [start] = time.split(' - ');
        let [h, m] = start.split(':').map(Number);
        const modifier = time.slice(-2);
        if (h === 12) h = 0;
        if (modifier === 'PM') h += 12;
        return h * 60 + m;
    };
    return toMinutes(a) - toMinutes(b);
}

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

  const codeChefDay = useMemo(() => {
    // If CodeChef isn't a subject for this student's class, there's no CodeChef day.
    const hasCodeChef = subjects.some(s => s.id === 'CODECHEF');
    if (!hasCodeChef) return undefined;

    // Find a day from Mon-Sat that has no scheduled classes
    return DAYS.find(day => !studentSchedule.some(s => s.day === day));
  }, [subjects, studentSchedule]);


  const exportPDF = () => {
    if (!data?.student) return;
    const doc = new jsPDF();
    doc.text(`Timetable for ${data.student.name} (${className})`, 14, 16);
    
    const tableData = DAYS.flatMap(day => {
        if (day === codeChefDay) {
             return ALL_TIME_SLOTS.sort(sortTime).map(time => {
                if (BREAK_SLOTS.includes(time)) return [day, time, 'Break', '-', '-'];
                return [day, time, 'CodeChef Day', '-', '-'];
            });
        }
        return ALL_TIME_SLOTS.sort(sortTime).map(time => {
            if (BREAK_SLOTS.includes(time)) {
                return [day, time, 'Break', '-', '-'];
            }
            const slot = studentSchedule.find(s => s.day === day && s.time === time);
            if (slot) {
                const subject = subjects.find(sub => sub.id === slot.subjectId);
                if (subject?.id === 'LIB001') {
                    return [day, time, 'Library', '-', '-'];
                }
                const subjectName = subject ? `${subject.name} ${subject.type === 'lab' ? '(Lab)' : ''}` : 'N/A';
                return [day, time, subjectName, slot.facultyName, slot.classroomName];
            }
            return [day, time, '-', '-', '-'];
        });
    });

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Subject', 'Faculty', 'Classroom']],
        body: tableData,
        startY: 20,
    });

    doc.save('my_timetable.pdf');
  }
  
  const scheduleByTime = ALL_TIME_SLOTS.sort(sortTime).map(time => {
    if (BREAK_SLOTS.includes(time)) {
        return { time: time, isBreak: true };
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
                subjectType: subject?.type,
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
                                    <TableHead key={day} className={cn("border font-semibold text-center", day === codeChefDay && "bg-purple-100 dark:bg-purple-900/30")}>{day}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduleByTime.map(({ time, slots, isBreak }) => (
                                <TableRow key={time}>
                                    <TableCell className="border font-medium text-xs whitespace-nowrap">{time}</TableCell>
                                    {isBreak ? (
                                        <TableCell colSpan={DAYS.length} className="border text-center font-semibold bg-secondary text-muted-foreground">
                                             {time === '09:20 AM - 09:30 AM' ? 'RECESS' : 'LUNCH BREAK'}
                                        </TableCell>
                                    ) : (
                                        slots.map(({ day, slots: daySlots }) => {
                                             if (day === codeChefDay) {
                                                return (
                                                    <TableCell key={`${time}-${day}`} className="border p-1 align-middle text-xs min-w-[150px] h-20 bg-purple-100/50 dark:bg-purple-900/20 text-center font-semibold text-purple-700 dark:text-purple-300">
                                                        CODE CHEF
                                                    </TableCell>
                                                )
                                            }
                                            return (
                                            <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                {daySlots.length > 0 ? (
                                                    daySlots.map(slot => (
                                                         slot.subjectId === 'LIB001' ? (
                                                              <div key={slot.id} className='flex justify-center items-center h-full text-muted-foreground'>
                                                                <Library className="h-4 w-4 mr-2" />
                                                                <span>Library</span>
                                                            </div>
                                                         ) : (
                                                            <div key={slot.id} className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", slot.subjectIsSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                                <div><strong>{slot.subjectName} {slot.subjectType === 'lab' && '(Lab)'}</strong></div>
                                                                <div>{slot.facultyName}</div>
                                                                <div>{slot.classroomName}</div>
                                                            </div>
                                                         )
                                                    ))
                                                ) : null}
                                            </TableCell>
                                        )})
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
