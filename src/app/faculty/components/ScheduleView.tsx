
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getSchedule } from '@/lib/services/schedule';
import type { Schedule, Class, Subject, Classroom, EnrichedSchedule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Download, Send, Loader2, Star, Library, Coffee } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addScheduleChangeRequest } from '@/lib/services/schedule-changes';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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


export default function ScheduleView() {
  const { user } = useAuth();
  const [facultySchedule, setFacultySchedule] = useState<EnrichedSchedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [isChangeDialogOpen, setChangeDialogOpen] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState<EnrichedSchedule | null>(null);
  
  const [requestMessage, setRequestMessage] = useState('');
  const [requestedClassroomId, setRequestedClassroomId] = useState<string | undefined>();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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
            })

        setFacultySchedule(enrichedSchedule);
        setClasses(classData);
        setSubjects(subjectData);
        setClassrooms(classroomData);
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const getRelationName = (id: string, type: 'class' | 'subject' | 'classroom') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id)?.name;
      case 'subject': return subjects.find(s => s.id === id)?.name;
      case 'classroom': return classrooms.find(cr => cr.id === id)?.name;
      default: return 'N/A';
    }
  };

  const openChangeDialog = (slot: EnrichedSchedule) => {
    setSelectedSlot(slot);
    setChangeDialogOpen(true);
  };
  
  const handleSubmitRequest = async () => {
    if (!selectedSlot || !requestMessage) {
       toast({ title: 'Missing Information', description: 'Please provide a reason for the change.', variant: 'destructive' });
       return;
    }
    if (!user) return;
    setIsSubmitting(true);
    try {
        await addScheduleChangeRequest({
            scheduleId: selectedSlot.id,
            facultyId: user.id,
            reason: requestMessage,
            requestedClassroomId: requestedClassroomId,
        });
        setChangeDialogOpen(false);
        setRequestMessage('');
        setRequestedClassroomId(undefined);
        toast({
            title: "Request Sent",
            description: "Your schedule change request has been sent to the admin for approval.",
        });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to send request.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };


  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Schedule for ${user?.name}`, 14, 16);
    
    const tableData = facultySchedule.map(slot => [
        slot.day,
        slot.time,
        getRelationName(slot.classId, 'class'),
        getRelationName(slot.subjectId, 'subject'),
        getRelationName(slot.classroomId, 'classroom'),
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
            return {
                id: `${day}-${time}-break`,
                time: time,
                isBreak: true,
                day: day,
            };
        }
        const scheduledSlot = daySlots.find(slot => slot.time === time);
        if (scheduledSlot) {
            return scheduledSlot;
        }
        return {
            id: `${day}-${time}-library`,
            time: time,
            day: day,
            isLibrary: true,
        };
    });
    return {
        day,
        slots: fullDaySchedule.sort((a,b) => sortTime(a.time, b.time)),
    }
  });
  
  const availableClassrooms = classrooms.filter(cr => cr.id !== selectedSlot?.classroomId && cr.type === selectedSlot?.classroomType);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">My Weekly Schedule</h3>
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
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {slots.map((slot: any) => (
                          <TableRow key={slot.id}>
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
                                  {(slot as EnrichedSchedule).subjectIsSpecial && <Star className="h-3 w-3 text-yellow-500" />}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={(slot as EnrichedSchedule).classroomType === 'lab' ? 'secondary' : 'outline'}>
                                    {(slot as EnrichedSchedule).classroomName}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => openChangeDialog(slot)} disabled={(slot as EnrichedSchedule).subjectIsSpecial}>
                                        Request Change
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
                <p className="text-muted-foreground text-center py-4">No classes scheduled for {day}.</p>              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isChangeDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setRequestedClassroomId(undefined);
          setRequestMessage('');
        }
        setChangeDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Schedule Change</DialogTitle>
            <DialogDescription>
              Send a message to the administrator regarding this slot.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2 p-4 rounded-md border bg-muted/50">
                <p><strong>Slot:</strong> {selectedSlot?.day}, {selectedSlot?.time}</p>
                <p><strong>Class:</strong> {selectedSlot?.className}</p>
                <p><strong>Subject:</strong> {selectedSlot?.subjectName}</p>
                <p><strong>Classroom:</strong> {selectedSlot?.classroomName}</p>
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="message">Reason for change</Label>
              <Textarea 
                placeholder="Please specify the reason for the change (e.g., cancellation, rescheduling request)." 
                id="message"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
             <div className="grid w-full gap-1.5">
                <Label htmlFor="classroom">Request different {selectedSlot?.classroomType} (optional)</Label>
                <Select value={requestedClassroomId} onValueChange={setRequestedClassroomId} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder={`Select a ${selectedSlot?.classroomType}`} /></SelectTrigger>
                    <SelectContent>
                        {availableClassrooms.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
