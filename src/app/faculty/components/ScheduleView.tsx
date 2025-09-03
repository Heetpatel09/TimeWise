
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
import { Download, Send, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addScheduleChangeRequest } from '@/lib/services/schedule-changes';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { useAuth } from '@/context/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFaculty } from '@/lib/services/faculty';
import { addSubstituteAssignment } from '@/lib/services/substitutions';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';

export default function ScheduleView() {
  const { user } = useAuth();
  const [facultySchedule, setFacultySchedule] = useState<EnrichedSchedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [substituteFaculty, setSubstituteFaculty] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [isChangeDialogOpen, setChangeDialogOpen] = useState(false);
  const [isSubstituteDialogOpen, setSubstituteDialogOpen] = useState(false);
  
  const [selectedSlot, setSelectedSlot] = useState<EnrichedSchedule | null>(null);
  
  const [requestMessage, setRequestMessage] = useState('');
  const [requestedClassroomId, setRequestedClassroomId] = useState<string | undefined>();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [substituteDate, setSubstituteDate] = useState<Date | undefined>();
  const [selectedSubstituteId, setSelectedSubstituteId] = useState<string | undefined>();

  useEffect(() => {
    async function loadData() {
      if (user) {
        setIsLoading(true);
        const [allSchedule, classData, subjectData, classroomData, allFaculty] = await Promise.all([
          getSchedule(),
          getClasses(),
          getSubjects(),
          getClassrooms(),
          getFaculty(),
        ]);
        
        const enrichedSchedule = allSchedule
            .filter(s => s.facultyId === user.id)
            .map(s => {
                const classroom = classroomData.find(cr => cr.id === s.classroomId);
                return {
                    ...s,
                    className: classData.find(c => c.id === s.classId)?.name || 'N/A',
                    subjectName: subjectData.find(sub => sub.id === s.subjectId)?.name || 'N/A',
                    classroomName: classroom?.name || 'N/A',
                    classroomType: classroom?.type || 'classroom'
                }
            })

        setFacultySchedule(enrichedSchedule);
        setClasses(classData);
        setSubjects(subjectData);
        setClassrooms(classroomData);
        setSubstituteFaculty(allFaculty.filter(f => f.isSubstitute));
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
  
  const openSubstituteDialog = (slot: EnrichedSchedule) => {
    setSelectedSlot(slot);
    setSubstituteDialogOpen(true);
  }

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

  const handleSubmitSubstitute = async () => {
    if (!selectedSlot || !substituteDate || !selectedSubstituteId) {
        toast({ title: 'Missing Information', description: 'Please select a date and a substitute.', variant: 'destructive'});
        return;
    }
    if (!user) return;

    setIsSubmitting(true);
    try {
        await addSubstituteAssignment({
            scheduleId: selectedSlot.id,
            originalFacultyId: user.id,
            substituteFacultyId: selectedSubstituteId,
            date: substituteDate.toISOString().split('T')[0], // format to YYYY-MM-DD
        });
        toast({ title: 'Substitute Requested', description: 'Your request has been sent for admin approval.' });
        setSubstituteDialogOpen(false);
        setSelectedSubstituteId(undefined);
        setSubstituteDate(undefined);
    } catch (error) {
         toast({ title: 'Error', description: 'Failed to request substitute.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  }


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

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const scheduleByDay = days.map(day => ({
    day,
    slots: facultySchedule.filter(slot => slot.day === day).sort((a,b) => a.time.localeCompare(b.time)),
  }));
  
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
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>{slot.time}</TableCell>
                        <TableCell>{slot.className}</TableCell>
                        <TableCell>{slot.subjectName}</TableCell>
                        <TableCell>
                          <Badge variant={slot.classroomType === 'lab' ? 'secondary' : 'outline'}>
                            {slot.classroomName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => openChangeDialog(slot)}>
                                Request Change
                            </Button>
                            <Button variant="secondary" size="sm" onClick={() => openSubstituteDialog(slot)}>
                                <Users className="h-4 w-4 mr-2" />
                                Assign Substitute
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">No classes scheduled for {day}.</p>              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isChangeDialogOpen} onOpenChange={setChangeDialogOpen}>
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
      
      <Dialog open={isSubstituteDialogOpen} onOpenChange={setSubstituteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Substitute</DialogTitle>
            <DialogDescription>
              Request a substitute teacher to cover this class for a specific date.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2 p-4 rounded-md border bg-muted/50">
                <p><strong>Slot:</strong> {selectedSlot?.day}, {selectedSlot?.time}</p>
                <p><strong>Class:</strong> {selectedSlot?.className}</p>
                <p><strong>Subject:</strong> {selectedSlot?.subjectName}</p>
            </div>
             <div className="grid w-full gap-1.5">
                <Label>Date</Label>
                <Calendar
                    mode="single"
                    selected={substituteDate}
                    onSelect={setSubstituteDate}
                    className="rounded-md border"
                    disabled={isSubmitting}
                />
            </div>
             <div className="grid w-full gap-1.5">
                <Label>Available Substitutes</Label>
                <Select value={selectedSubstituteId} onValueChange={setSelectedSubstituteId} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select a substitute" /></SelectTrigger>
                    <SelectContent>
                        {substituteFaculty.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubstituteDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSubmitSubstitute} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Request Substitute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
