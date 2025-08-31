'use client';
import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { schedule as allSchedule } from '@/lib/placeholder-data';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClasses } from '@/lib/services/classes';
import type { Subject, Faculty, Class } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Assume logged-in student is Alice Johnson (STU001) in class CLS004
const LOGGED_IN_STUDENT_CLASS_ID = 'CLS004';
const LOGGED_IN_STUDENT_NAME = 'Alice Johnson';

export default function TimetableView() {
  const studentSchedule = allSchedule.filter(s => s.classId === LOGGED_IN_STUDENT_CLASS_ID);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function loadData() {
        setIsLoading(true);
        const [subjectData, facultyData, classData] = await Promise.all([
            getSubjects(),
            getFaculty(),
            getClasses()
        ]);
        setSubjects(subjectData);
        setFaculty(facultyData);
        setClasses(classData);
        setIsLoading(false);
    }
    loadData();
  }, []);

  const className = classes.find(c => c.id === LOGGED_IN_STUDENT_CLASS_ID)?.name;

  const getRelationName = (id: string, type: 'subject' | 'faculty') => {
    switch (type) {
      case 'subject': return subjects.find(s => s.id === id)?.name;
      case 'faculty': return faculty.find(f => f.id === id)?.name;
      default: return 'N/A';
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Timetable for ${LOGGED_IN_STUDENT_NAME} (${className})`, 14, 16);
    
    const tableData = studentSchedule.map(slot => [
        slot.day,
        slot.time,
        getRelationName(slot.subjectId, 'subject'),
        getRelationName(slot.facultyId, 'faculty'),
    ]);

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Subject', 'Faculty']],
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
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {slots.map((slot) => (
                        <TableRow key={slot.id}>
                        <TableCell>{slot.time}</TableCell>
                        <TableCell>{getRelationName(slot.subjectId, 'subject')}</TableCell>
                        <TableCell>{getRelationName(slot.facultyId, 'faculty')}</TableCell>
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
