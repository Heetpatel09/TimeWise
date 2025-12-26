
'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSchedule, Class, Subject, Classroom } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Library, Coffee, Star, PlusSquare, CheckSquare } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { getSchedule } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { Badge } from '@/components/ui/badge';
import { isToday, format } from 'date-fns';
import AttendanceDialog from './AttendanceDialog';

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
  const [facultySchedule, setFacultySchedule] = useState<EnrichedSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [selectedSlotForAttendance, setSelectedSlotForAttendance] = useState<EnrichedSchedule | null>(null);

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            const [allSchedule, classData, subjectData, classroomData] = await Promise.all([
                getSchedule(),
                getClasses(),
                getSubjects(),
                getClassrooms(),
            ]);

            const enrichedSchedule = allSchedule
                .filter(s => s.facultyId === user.id)
                .map(s => {
                    const classroom = classroomData.find(cr => cr.id === s.classroomId);
                    const subject = subjectData.find(sub => sub.id === s.subjectId);
                    return {
                        ...s,
                        className: classData.find(c => c.id === s.classId)?.name || 'N/A',
                        subjectName: subject?.name || 'N/A',
                        subjectIsSpecial: subject?.isSpecial || false,
                        classroomName: classroom?.name || 'N/A',
                        classroomType: classroom?.type || 'classroom'
                    }
                });

            setFacultySchedule(enrichedSchedule);
            setIsLoading(false);
        }
    }
    loadData();
  }, [user]);

  const handleTakeAttendance = (slot: EnrichedSchedule) => {
    setSelectedSlotForAttendance(slot);
    setAttendanceDialogOpen(true);
  }

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Schedule for ${user?.name}`, 14, 16);
    
    const tableData = facultySchedule.map(slot => [
        slot.day,
        slot.time,
        slot.className,
        slot.subjectName,
        slot.classroomName,
    ]);

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Class', 'Subject', 'Classroom']],
        body: tableData,
        startY: 20,
    });

    doc.save('my_schedule.pdf');
  }

  const scheduleByTime = ALL_TIME_SLOTS.sort(sortTime).map(time => {
    if (BREAK_SLOTS.includes(time)) {
        return { time: time, isBreak: true };
    }
    const dailySlots = DAYS.map(day => facultySchedule.find(s => s.day === day && s.time === time));
    return { time, slots: dailySlots };
  });
  
  const todayName = format(new Date(), 'EEEE');

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
        <Card>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            {DAYS.map(day => <TableHead key={day}>{day}</TableHead>)}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {scheduleByTime.map(row => (
                            <TableRow key={row.time}>
                                <TableCell>{row.time}</TableCell>
                                {row.isBreak ? (
                                    <TableCell colSpan={DAYS.length} className="text-center font-semibold bg-secondary">
                                        {row.time === '09:30 AM - 10:00 AM' ? 'RECESS' : 'LUNCH BREAK'}
                                    </TableCell>
                                ) : (
                                    row.slots?.map((slot, index) => (
                                        <TableCell key={index}>
                                            {slot ? (
                                                <div className="space-y-1">
                                                    <p className="font-semibold">{slot.subjectName}</p>
                                                    <p className="text-xs text-muted-foreground">{slot.className}</p>
                                                    <Badge variant={slot.classroomType === 'lab' ? 'secondary' : 'outline'}>{slot.classroomName}</Badge>
                                                    {isToday(new Date()) && slot.day === todayName && (
                                                         <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full mt-2"
                                                            onClick={() => handleTakeAttendance(slot)}
                                                        >
                                                            <CheckSquare className="h-4 w-4 mr-2" />
                                                            Attendance
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                     <Library className="h-4 w-4" />
                                                     <span>Library</span>
                                                 </div>
                                            )}
                                        </TableCell>
                                    ))
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
      
      {isAttendanceDialogOpen && selectedSlotForAttendance && (
        <AttendanceDialog
          slot={selectedSlotForAttendance}
          date={new Date()}
          isOpen={isAttendanceDialogOpen}
          onOpenChange={setAttendanceDialogOpen}
        />
      )}
    </div>
  );
}
