'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { schedule as allSchedule, classes, subjects } from '@/lib/placeholder-data';
import type { Schedule } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';

// Assume logged-in faculty is Dr. Alan Turing (FAC001) for demo
const LOGGED_IN_FACULTY_ID = 'FAC001';

export default function ScheduleView() {
  const facultySchedule = allSchedule.filter(s => s.facultyId === LOGGED_IN_FACULTY_ID);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Schedule | null>(null);
  const [requestMessage, setRequestMessage] = useState('');
  const { toast } = useToast();

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

  const handleSubmitRequest = () => {
    console.log('Request submitted for slot', selectedSlot?.id, ':', requestMessage);
    // Placeholder for API call to admin
    setDialogOpen(false);
    setRequestMessage('');
    toast({
      title: "Request Sent",
      description: "Your schedule change request has been sent to the admin for approval.",
    });
  };

  return (
    <div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facultySchedule.length > 0 ? facultySchedule.map((slot) => (
              <TableRow key={slot.id}>
                <TableCell>{slot.day}</TableCell>
                <TableCell>{slot.time}</TableCell>
                <TableCell>{getRelationName(slot.classId, 'class')}</TableCell>
                <TableCell>{getRelationName(slot.subjectId, 'subject')}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => handleRequestChange(slot)}>
                    Request Change
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">No classes scheduled.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest}>
                <Send className="h-4 w-4 mr-2" />
                Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
