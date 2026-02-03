
'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { EnrichedSchedule, Classroom } from '@/lib/types';
import { addScheduleChangeRequest } from '@/lib/services/schedule-changes';
import { getClassrooms } from '@/lib/services/classrooms';
import { Loader2 } from 'lucide-react';

interface SlotChangeRequestDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    facultyId: string;
    facultySchedule: EnrichedSchedule[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export default function SlotChangeRequestDialog({ isOpen, onOpenChange, facultyId, facultySchedule }: SlotChangeRequestDialogProps) {
    const [selectedSlotId, setSelectedSlotId] = useState<string>('');
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [requestedClassroomId, setRequestedClassroomId] = useState<string>('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    
    const { toast } = useToast();

    useEffect(() => {
        async function loadClassrooms() {
            const allClassrooms = await getClassrooms();
            setClassrooms(allClassrooms);
        }
        if (isOpen) {
            loadClassrooms();
        }
    }, [isOpen]);

    const slotsForSelectedDay = facultySchedule.filter(s => s.day === selectedDay);

    const handleDayChange = (day: string) => {
        setSelectedDay(day);
        setSelectedSlotId('');
        setRequestedClassroomId('');
    };
    
    const handleSubmit = async () => {
        if (!selectedSlotId || !reason) {
            toast({ title: 'Missing Information', description: 'Please select a slot and provide a reason.', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            await addScheduleChangeRequest({
                scheduleId: selectedSlotId,
                facultyId,
                reason,
                requestedClassroomId: requestedClassroomId || undefined,
            });
            toast({ title: 'Request Sent', description: 'Your slot change request has been submitted for admin approval.' });
            onOpenChange(false);
            // Reset form
            setSelectedDay('');
            setSelectedSlotId('');
            setReason('');
            setRequestedClassroomId('');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to submit request.', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const selectedSlot = facultySchedule.find(s => s.id === selectedSlotId);
    const availableClassrooms = selectedSlot ? classrooms.filter(c => c.type === selectedSlot.classroomType && c.id !== selectedSlot.classroomId) : [];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Request a Slot Change</DialogTitle>
                    <DialogDescription>
                        Select a slot from your schedule and describe the change you'd like to request.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="day">Day</Label>
                        <Select value={selectedDay} onValueChange={handleDayChange}>
                            <SelectTrigger id="day"><SelectValue placeholder="Select a day" /></SelectTrigger>
                            <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    {selectedDay && (
                        <div className="space-y-2">
                             <Label htmlFor="slot">Slot</Label>
                            <Select value={selectedSlotId} onValueChange={setSelectedSlotId} disabled={!selectedDay}>
                                <SelectTrigger id="slot"><SelectValue placeholder="Select a slot" /></SelectTrigger>
                                <SelectContent>
                                    {slotsForSelectedDay.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.time} - {s.subjectName} ({s.className})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    
                    {selectedSlot && (
                         <div className="space-y-2">
                             <Label htmlFor="classroom">New Classroom (Optional)</Label>
                            <Select value={requestedClassroomId} onValueChange={setRequestedClassroomId}>
                                <SelectTrigger id="classroom"><SelectValue placeholder="Request a different classroom" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">No classroom change</SelectItem>
                                    {availableClassrooms.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="reason">Reason for Change</Label>
                        <Textarea id="reason" placeholder="e.g., I need to swap this with my afternoon class." value={reason} onChange={e => setReason(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !selectedSlotId || !reason}>
                        {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Submit Request
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
