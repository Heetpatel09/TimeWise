
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, BedDouble, PlusCircle, Send } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getStudentHostelDetails, getStudentGatePasses, requestGatePass, getStudentHostelLeaveRequests } from '@/lib/services/hostel-services';
import { addLeaveRequest } from '@/lib/services/leave';
import type { EnrichedRoom, GatePass, LeaveRequest } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface HostelDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  studentId: string;
}

const InfoItem = ({ label, value }: { label: string, value: string | number | undefined }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold">{value || 'N/A'}</p>
    </div>
);

function MyRoomTab({ room }: { room: EnrichedRoom | null }) {
    if (!room) {
        return <div className="text-center py-12 text-muted-foreground">You have not been assigned a hostel room.</div>;
    }
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BedDouble /> My Room Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-6">
                <InfoItem label="Hostel" value={room.hostelName} />
                <InfoItem label="Block" value={room.block} />
                <InfoItem label="Floor" value={room.floor} />
                <InfoItem label="Room No." value={room.roomNumber} />
            </CardContent>
        </Card>
    );
}

function GatePassTab({ studentId }: { studentId: string }) {
    const queryClient = useQueryClient();
    const { data: passes, isLoading } = useQuery<GatePass[]>({
        queryKey: ['gatePasses', studentId],
        queryFn: () => getStudentGatePasses(studentId)
    });

    const [isRequesting, setIsRequesting] = useState(false);
    const [departureDate, setDepartureDate] = useState('');
    const [arrivalDate, setArrivalDate] = useState('');
    const [reason, setReason] = useState('');
    const { toast } = useToast();

    const mutation = useMutation({
        mutationFn: () => requestGatePass({ studentId, departureDate, arrivalDate, reason }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gatePasses', studentId] });
            toast({ title: 'Success', description: 'Gate pass request submitted.' });
            setIsRequesting(false);
            setDepartureDate('');
            setArrivalDate('');
            setReason('');
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

    const getStatusVariant = (status: GatePass['status']) => {
        switch (status) {
          case 'approved': return 'default';
          case 'rejected': return 'destructive';
          case 'pending': return 'secondary';
          default: return 'outline';
        }
    };
    
    return (
        <div className="space-y-4">
            {isRequesting ? (
                 <Card>
                    <CardHeader>
                        <CardTitle>New Gate Pass Request</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="departure">Departure Date</Label><Input id="departure" type="date" value={departureDate} onChange={e => setDepartureDate(e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="arrival">Arrival Date</Label><Input id="arrival" type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="reason">Reason</Label><Textarea id="reason" placeholder="Reason for leave..." value={reason} onChange={e => setReason(e.target.value)} /></div>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsRequesting(false)}>Cancel</Button>
                        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Submit Request
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                 <div className="text-right">
                    <Button onClick={() => setIsRequesting(true)}><PlusCircle className="h-4 w-4 mr-2" />Request New Gate Pass</Button>
                </div>
            )}
           
            <Card>
                <CardHeader><CardTitle>My Gate Passes</CardTitle></CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                     ) : !passes || passes.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No gate passes found.</div>
                     ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Departure</TableHead>
                                    <TableHead>Arrival</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {passes.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{format(parseISO(p.departureDate), 'PPP')}</TableCell>
                                        <TableCell>{format(parseISO(p.arrivalDate), 'PPP')}</TableCell>
                                        <TableCell className="max-w-xs truncate">{p.reason}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(p.status)}>{p.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}

function LeaveRequestTab({ studentId, studentName }: { studentId: string, studentName: string }) {
     const queryClient = useQueryClient();
    const { data: requests, isLoading } = useQuery<LeaveRequest[]>({
        queryKey: ['hostelLeaveRequests', studentId],
        queryFn: () => getStudentHostelLeaveRequests(studentId)
    });

    const [isRequesting, setIsRequesting] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const { toast } = useToast();

    const mutation = useMutation({
        mutationFn: () => addLeaveRequest({ requesterId: studentId, requesterName: studentName, requesterRole: 'student', startDate, endDate, reason, type: 'hostel' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hostelLeaveRequests', studentId] });
            toast({ title: 'Success', description: 'Hostel leave request submitted.' });
            setIsRequesting(false);
            setStartDate('');
            setEndDate('');
            setReason('');
        },
        onError: (error: any) => {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    });

     const getStatusVariant = (status: LeaveRequest['status']) => {
        switch (status) {
          case 'approved': return 'default';
          case 'rejected': return 'destructive';
          case 'pending': return 'secondary';
          default: return 'outline';
        }
    };

    return (
         <div className="space-y-4">
            {isRequesting ? (
                 <Card>
                    <CardHeader><CardTitle>New Hostel Leave Request</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="start">Start Date</Label><Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div>
                            <div className="space-y-2"><Label htmlFor="end">End Date</Label><Input id="end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div>
                        </div>
                        <div className="space-y-2"><Label htmlFor="reason-leave">Reason</Label><Textarea id="reason-leave" placeholder="Reason for leave..." value={reason} onChange={e => setReason(e.target.value)} /></div>
                    </CardContent>
                    <CardFooter className="justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsRequesting(false)}>Cancel</Button>
                        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                             {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Submit Request
                        </Button>
                    </CardFooter>
                </Card>
            ) : (
                <div className="text-right">
                    <Button onClick={() => setIsRequesting(true)}><PlusCircle className="h-4 w-4 mr-2" />Request Hostel Leave</Button>
                </div>
            )}
             <Card>
                <CardHeader><CardTitle>My Hostel Leave Requests</CardTitle></CardHeader>
                <CardContent>
                      {isLoading ? (
                        <div className="flex justify-center items-center h-24"><Loader2 className="h-6 w-6 animate-spin" /></div>
                     ) : !requests || requests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No leave requests found.</div>
                     ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead>Reason</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell>{format(parseISO(r.startDate), 'PPP')}</TableCell>
                                        <TableCell>{format(parseISO(r.endDate), 'PPP')}</TableCell>
                                        <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(r.status)}>{r.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}


export default function HostelDialog({ isOpen, onOpenChange, studentId }: HostelDialogProps) {
    const { data: room, isLoading: roomLoading } = useQuery<EnrichedRoom | null>({
        queryKey: ['hostelDetails', studentId],
        queryFn: () => getStudentHostelDetails(studentId),
        enabled: !!studentId,
    });

    const { user } = useAuth();
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>My Hostel Details</DialogTitle>
                </DialogHeader>
                {roomLoading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <Tabs defaultValue="room" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="room">My Room</TabsTrigger>
                            <TabsTrigger value="gatepass">Gate Passes</TabsTrigger>
                            <TabsTrigger value="leave">Leave Requests</TabsTrigger>
                        </TabsList>
                        <TabsContent value="room" className="mt-4"><MyRoomTab room={room} /></TabsContent>
                        <TabsContent value="gatepass" className="mt-4"><GatePassTab studentId={studentId} /></TabsContent>
                        <TabsContent value="leave" className="mt-4"><LeaveRequestTab studentId={studentId} studentName={user?.name || ''} /></TabsContent>
                    </Tabs>
                )}
                 <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
