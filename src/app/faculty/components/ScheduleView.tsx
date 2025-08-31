'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { getSchedule } from '@/lib/services/schedule';
import type { Schedule, Class, Subject } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Download, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addScheduleChangeRequest } from '@/lib/services/schedule-changes';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { useAuth } from '@/context/AuthContext';


export default function ScheduleView() {
  const { user } = useAuth();
  const [facultySchedule, setFacultySchedule] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Schedule | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function loadData() {
      if (user) {
        setIsLoading(true);
        const [allSchedule, classData, subjectData] = await Promise.all([
          getSchedule(),
          getClasses(),
          getSubjects(),
        ]);
        setFacultySchedule(allSchedule.filter(s => s.facultyId === user.id));
        setClasses(classData);
        setSubjects(subjectData);
        setIsLoading(false);
      }
    }
    loadData();
  }, [user]);

  const getRelationName = (id: string, type: 'class' | 'subject') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id)?.name;
      case 'subject': return subjects.find(s => s.id === id)?.name;
      default: return 'N/A';
    }
  };

  const handleRequestChange = (slot: Schedule) => {
    setSelectedSlot(slot);
    setDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedSlot || !requestMessage) {
       toast({ title: 'Missing Message', description: 'Please provide a reason for the change.', variant: 'destructive' });
       return;
    }
    if (!user) return;
    setIsSubmitting(true);
    try {
        await addScheduleChangeRequest({
            scheduleId: selectedSlot.id,
            facultyId: user.id,
            reason: requestMessage,
        });
        setDialogOpen(false);
        setRequestMessage('');
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
    ]);

    (doc as any).autoTable({
        head: [['Day', 'Time', 'Class', 'Subject']],
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
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>{slot.time}</TableCell>
                        <TableCell>{getRelationName(slot.classId, 'class')}</TableCell>
                        <TableCell>{getRelationName(slot.subjectId, 'subject')}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleRequestChange(slot)}>
                            Request Change
                          </Button>
                        </TableCell>
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

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Request Schedule Change</DialogTitle>
            <DialogDescription>
              Send a message to the administrator regarding this slot.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
                <p><strong>Slot:</strong> {selectedSlot?.day}, {selectedSlot?.time}</p>
                <p><strong>Class:</strong> {getRelationName(selectedSlot?.classId || '', 'class')}</p>
                <p><strong>Subject:</strong> {getRelationName(selectedSlot?.subjectId || '', 'subject')}</p>
            </div>
            <div className="grid w-full gap-1.5">
              <Label htmlFor="message">Your Message</Label>
              <Textarea 
                placeholder="Please specify the reason for the change (e.g., cancellation, rescheduling request)." 
                id="message"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
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
