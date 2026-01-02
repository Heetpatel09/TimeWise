

'use client';

import { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { EnrichedSchedule, Student, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Library, Bot, CheckSquare, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '@/context/AuthContext';
import { getTimetableDataForStudent, getSubjectsForStudent } from '../../student/actions';
import { cn } from '@/lib/utils';
import { getSchedule, getScheduleForFacultyInRange } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { Badge } from '@/components/ui/badge';
import { format, isToday } from 'date-fns';
import AttendanceDialog from './AttendanceDialog';

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

  const totalWorkingHours = useMemo(() => {
    if (!facultySchedule) return 0;
    // Each non-library slot is considered one working hour
    return facultySchedule.filter(slot => slot.subjectId !== 'LIB001').length;
  }, [facultySchedule]);

  const handleTakeAttendance = (slot: EnrichedSchedule) => {
    setSelectedSlotForAttendance(slot);
    setAttendanceDialogOpen(true);
  }

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Schedule for ${user?.name}`, 14, 16);
    doc.text(`Total Weekly Hours: ${totalWorkingHours}`, 14, 22);

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
        startY: 30,
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
  const codeChefDay = facultySchedule.find(s => s.subjectId === 'CODECHEF')?.day;


  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Weekly Hours</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{totalWorkingHours} hours</div>
                <p className="text-xs text-muted-foreground">Based on scheduled (non-library) classes</p>
            </CardContent>
        </Card>
        <Button onClick={exportPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
        </Button>
      </div>
      <div className="space-y-6">
        <Card>
            <CardContent className="p-0">
                 <div className="overflow-x-auto">
                    <Table className="border-collapse">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="border font-semibold">Time</TableHead>
                                {DAYS.map(day => <TableHead key={day} className={cn("border font-semibold text-center", day === codeChefDay && "bg-purple-100 dark:bg-purple-900/30")}>{day}</TableHead>)}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {scheduleByTime.map(row => (
                                <TableRow key={row.time}>
                                    <TableCell className="border font-medium text-xs whitespace-nowrap">{row.time}</TableCell>
                                    {row.isBreak ? (
                                        <TableCell colSpan={DAYS.length} className="border text-center font-semibold bg-secondary text-muted-foreground">
                                            {row.time === '09:20 AM - 09:30 AM' ? 'RECESS' : 'LUNCH BREAK'}
                                        </TableCell>
                                    ) : (
                                        row.slots?.map((slot, index) => (
                                            <TableCell key={index} className={cn("border p-1 align-top text-xs min-w-[150px] h-28", DAYS[index] === codeChefDay && "bg-purple-100/50 dark:bg-purple-900/20")}>
                                                {slot ? (
                                                     slot.subjectId === 'LIB001' ? (
                                                        <div className='flex justify-center items-center h-full text-muted-foreground'>
                                                            <Library className="h-4 w-4 mr-2" />
                                                            <span>Library</span>
                                                        </div>
                                                     ) : (
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
                                                     )
                                                ) : (
                                                    (DAYS[index] === codeChefDay) && (
                                                        <div className="flex items-center justify-center h-full text-purple-600 dark:text-purple-300 font-semibold text-center">
                                                            <Bot className="h-4 w-4 mr-2"/>
                                                            <span>CodeChef Day</span>
                                                        </div>
                                                    )
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

    