
'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSchedule, Student } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { getTimetableDataForStudent } from '../actions';

interface TimetableData {
    student: Student;
    schedule: EnrichedSchedule[];
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
  const className = data?.student?.className || '';

  const exportPDF = () => {
    if (!data?.student) return;
    const doc = new jsPDF();
    doc.text(`Timetable for ${data.student.name} (${className})`, 14, 16);
    
    const tableData = studentSchedule.map(slot => [
        slot.day,
        slot.time,
        slot.subjectName,
        slot.facultyName,
        slot.classroomName,
    ]);

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Subject', 'Faculty', 'Classroom']],
        body: tableData,
        startY: 20,
    });

    doc.save('my_timetable.pdf');
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const scheduleByDay = days.map(day => ({
    day,
    slots: studentSchedule.filter(slot => slot.day === day).sort((a,b) => a.time.localeCompare(b.time)),
  }));

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
                        <TableCell>{slot.time}</TableCell>
                        <TableCell>{slot.subjectName}</TableCell>
                        <TableCell>{slot.facultyName}</TableCell>
                        <TableCell>{slot.classroomName}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
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
