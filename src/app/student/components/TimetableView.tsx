
'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSchedule, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Library } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { getTimetableDataForStudent } from '../actions';

interface TimetableData {
    student: Student;
    schedule: EnrichedSchedule[];
}

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
        if (user?.id) {
            setIsLoading(true);
            const timetableData = await getTimetableDataForStudent(user.id);
            setData(timetableData);
            setIsLoading(false);
        }
    }
    loadData();
  }, [user]);

  const studentSchedule = data?.schedule || [];
  const className = (data?.student as any)?.className || '';

  const exportPDF = () => {
    if (!data?.student) return;
    const doc = new jsPDF();
    doc.text(`Timetable for ${data.student.name} (${className})`, 14, 16);
    
    const tableData = DAYS.flatMap(day => {
        const daySlots = ALL_TIME_SLOTS.map(time => {
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
        const scheduledSlot = daySlots.find(slot => slot.time === time);
        if (scheduledSlot) {
            return scheduledSlot;
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
                            <TableRow key={slot.id}>
                                <TableCell className="whitespace-nowrap">{slot.time}</TableCell>
                                {(slot as any).isLibrary ? (
                                    <TableCell colSpan={3} className="text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <Library className="h-4 w-4" />
                                            <span>Library Slot</span>
                                        </div>
                                    </TableCell>
                                ) : (
                                    <>
                                        <TableCell>{(slot as EnrichedSchedule).subjectName}</TableCell>
                                        <TableCell>{(slot as EnrichedSchedule).facultyName}</TableCell>
                                        <TableCell>{(slot as EnrichedSchedule).classroomName}</TableCell>
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

    