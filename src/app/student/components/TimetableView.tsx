
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
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const BREAK_SLOTS = ['09:30 AM - 10:00 AM', '12:00 PM - 01:00 PM'];


function sortTime(a: string, b: string) {
    const toDate = (time: string) => {
        const [timePart, modifier] = time.split(' ');
        let [hours, minutes] = timePart.split(':');
        if (hours === '12') {
            hours = '0';
        }
        if (modifier === 'PM') {
            hours = (parseInt(hours, 10) + 12).toString();
        }
        return new Date(1970, 0, 1, parseInt(hours), parseInt(minutes));
    };
    return toDate(a).getTime() - toDate(b).getTime();
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
  
  const scheduleByDay = DAYS.map(day => {
    const daySlots = studentSchedule.filter(slot => slot.day === day);
    const fullDaySchedule = ALL_TIME_SLOTS.map(time => {
        if (BREAK_SLOTS.includes(time)) {
             return {
                id: `${day}-${time}-break`,
                time: time,
                isBreak: true,
                day: day,
            };
        }
        const scheduledSlot = daySlots.find(slot => slot.time === time);
        if (scheduledSlot) {
            const subject = subjects.find(sub => sub.id === scheduledSlot.subjectId);
            return {
              ...scheduledSlot,
              subjectIsSpecial: subject?.isSpecial || false,
            };
        }
        return {
            id: `${day}-${time}-library`,
            time: time,
            subjectName: 'Library Slot',
            facultyName: '-',
            classroomName: '-',
            day: day,
            isLibrary: true,
        };
    });
    return {
        day,
        slots: fullDaySchedule.sort((a,b) => sortTime(a.time, b.time)),
    }
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
        <div className="space-y-6">
        {scheduleByDay.map(({ day, slots }) => (
            <Card key={day}>
            <CardHeader>
                <CardTitle>{day}</CardTitle>
            </CardHeader>
            <CardContent>
                {slots.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Faculty</TableHead>
                            <TableHead>Classroom</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {slots.map((slot) => (
                            <TableRow 
                                key={slot.id}
                                className={(slot as EnrichedSchedule).subjectIsSpecial ? `bg-[#4A0080] text-white hover:bg-[#4A0080]/90` : ''}
                            >
                                <TableCell>{slot.time}</TableCell>
                                {(slot as any).isLibrary ? (
                                    <TableCell colSpan={3} className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Library className="h-4 w-4" />
                                            <span>Library Slot</span>
                                        </div>
                                    </TableCell>
                                ) : (slot as any).isBreak ? (
                                    <TableCell colSpan={3} className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Coffee className="h-4 w-4" />
                                            <span>Break</span>
                                        </div>
                                    </TableCell>
                                ) : (
                                    <>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {(slot as EnrichedSchedule).subjectName}
                                                {(slot as EnrichedSchedule).subjectIsSpecial && <Star className="h-3 w-3 text-yellow-400" />}
                                            </div>
                                        </TableCell>
                                        <TableCell>{(slot as EnrichedSchedule).facultyName}</TableCell>
                                        <TableCell>
                                            <Badge variant={(slot as EnrichedSchedule).subjectIsSpecial ? 'default' : 'outline'}>
                                                {(slot as EnrichedSchedule).classroomName}
                                            </Badge>
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                ) : (
                <p className="text-muted-foreground text-center py-4">No classes scheduled for {day}.</p>
                )}
            </CardContent>
            </Card>
        ))}
        </div>
    </div>
  );
}
