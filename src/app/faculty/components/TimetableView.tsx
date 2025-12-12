
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

  const scheduleByDay = DAYS.map(day => {
    const daySlots = facultySchedule.filter(slot => slot.day === day);
    const fullDaySchedule = ALL_TIME_SLOTS.map(time => {
        if (BREAK_SLOTS.includes(time)) {
            return { id: `${day}-${time}-break`, time: time, isBreak: true, day: day };
        }
        const scheduledSlot = daySlots.find(slot => slot.time === time);
        if (scheduledSlot) return scheduledSlot;
        return { id: `${day}-${time}-library`, time: time, day: day, isLibrary: true };
    }).sort((a,b) => sortTime(a.time, b.time));
    return { day, slots: fullDaySchedule };
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
                          <TableHead>Class</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Classroom</TableHead>
                          <TableHead>Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slots.map((slot: any) => (
                          <TableRow key={slot.id} className={slot.subjectIsSpecial ? `bg-purple-900/10 dark:bg-purple-900/50` : ''}>
                            <TableCell>{slot.time}</TableCell>
                            {slot.isLibrary ? (
                               <TableCell colSpan={4} className="text-muted-foreground">
                                     <div className="flex items-center gap-2">
                                         <Library className="h-4 w-4" />
                                         <span>Library Slot</span>
                                     </div>
                               </TableCell>
                            ) : slot.isBreak ? (
                                <TableCell colSpan={4} className="text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Coffee className="h-4 w-4" />
                                        <span>Break</span>
                                    </div>
                                </TableCell>
                            ) : (
                              <>
                                <TableCell>{(slot as EnrichedSchedule).className}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                  {(slot as EnrichedSchedule).subjectName}
                                  {(slot as EnrichedSchedule).subjectIsSpecial && <Star className="h-3 w-3 text-yellow-400" />}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={(slot as EnrichedSchedule).subjectIsSpecial ? 'default' : (slot as EnrichedSchedule).classroomType === 'lab' ? 'secondary' : 'outline'}>
                                    {(slot as EnrichedSchedule).classroomName}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => handleTakeAttendance(slot)}
                                        disabled={day !== todayName}
                                    >
                                        <CheckSquare className="h-4 w-4 mr-2" />
                                        Mark Attendance
                                    </Button>
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
