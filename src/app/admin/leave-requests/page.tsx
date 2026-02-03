
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LeaveRequest, Faculty, Schedule, EnrichedSchedule } from '@/lib/types';
import { Check, X, Loader2, Trash2, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaveRequests, updateLeaveRequestStatus, deleteResolvedLeaveRequests } from '@/lib/services/leave';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSchedule, updateSchedule } from '@/lib/services/schedule';
import { getFaculty } from '@/lib/services/faculty';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableFacultyForSlot, getScheduleForFacultyInRange } from '@/lib/services/schedule';
import { Card, CardContent } from '@/components/ui/card';


export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isReassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [slotsToReassign, setSlotsToReassign] = useState<EnrichedSchedule[]>([]);
  const [availableFacultyMap, setAvailableFacultyMap] = useState<Record<string, Faculty[]>>({});
  const [reassignmentData, setReassignmentData] = useState<Record<string, string>>({});
  const [isReassigning, setIsReassigning] = useState(false);
  
  const { toast } = useToast();

  async function fetchRequests() {
    setIsLoading(true);
    try {
        const [requests, facultyData] = await Promise.all([
          getLeaveRequests(),
          getFaculty()
        ]);
        setLeaveRequests(requests.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
        setFaculty(facultyData);
    } catch(error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to fetch data.', variant: 'destructive'});
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequestStatus = async (request: LeaveRequest, status: 'approved' | 'rejected') => {
    setIsUpdating(request.id);
    try {
      await updateLeaveRequestStatus(request.id, status);
      await fetchRequests();
      toast({ title: 'Success', description: `Request has been ${status}.`});
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status.', variant: 'destructive'});
    } finally {
        setIsUpdating(null);
    }
  };

  const handleOpenReassignDialog = async (request: LeaveRequest) => {
    setSelectedRequest(request);
    
    const slots = await getScheduleForFacultyInRange(request.requesterId, request.startDate, request.endDate);
    setSlotsToReassign(slots);

    if (slots.length > 0) {
      const facultyMap: Record<string, Faculty[]> = {};
      for (const slot of slots) {
        const available = await getAvailableFacultyForSlot(slot.day, slot.time);
        facultyMap[slot.id] = available.filter(f => f.id !== request.requesterId);
      }
      setAvailableFacultyMap(facultyMap);
      setReassignDialogOpen(true);
    } else {
      // No classes to reassign, just approve directly
      await handleRequestStatus(request, 'approved');
    }
  }

  const handleReassignment = async () => {
    if (!selectedRequest) return;
    setIsReassigning(true);
    
    try {
      // Update schedule for each reassigned slot
      for (const slotId in reassignmentData) {
        const newFacultyId = reassignmentData[slotId];
        const slotToUpdate = slotsToReassign.find(s => s.id === slotId);
        if (slotToUpdate && newFacultyId) {
          await updateSchedule({ ...slotToUpdate, facultyId: newFacultyId });
        }
      }
      
      // Approve the leave request
      await handleRequestStatus(selectedRequest, 'approved');

      toast({ title: "Reassignment Complete", description: "Classes have been reassigned and leave has been approved."});
      setReassignDialogOpen(false);
      setReassignmentData({});

    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to reassign classes.', variant: 'destructive' });
    } finally {
        setIsReassigning(false);
    }
  };


  const handleClearHistory = async () => {
    setIsDeleting(true);
    try {
        await deleteResolvedLeaveRequests();
        await fetchRequests();
        toast({ title: 'History Cleared', description: 'All resolved leave requests have been deleted.'});
    } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to clear history.', variant: 'destructive'});
    } finally {
        setIsDeleting(false);
    }
  }
  
  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const resolvedRequests = leaveRequests.filter(r => r.status !== 'pending');

  const renderRequestTable = (requests: LeaveRequest[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requester</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.requesterName}</TableCell>
               <TableCell className="capitalize">
                <Badge variant={request.requesterRole === 'faculty' ? 'secondary' : 'outline'}>{request.requesterRole}</Badge>
              </TableCell>
              <TableCell>{new Date(request.startDate).toLocaleDateString()}</TableCell>
              <TableCell>{new Date(request.endDate).toLocaleDateString()}</TableCell>
              <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
              <TableCell>
                <Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {request.status === 'pending' && (
                  <div className="flex gap-2 justify-end">
                    {isUpdating === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" 
                          onClick={() => request.requesterRole === 'faculty' ? handleOpenReassignDialog(request) : handleRequestStatus(request, 'approved')}
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRequestStatus(request, 'rejected')}>
                            <X className="h-4 w-4" />
                        </Button>
                        </>
                    )}
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div>
        <Tabs defaultValue="pending">
            <TabsList>
                <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
                <TabsTrigger value="resolved">Resolved ({resolvedRequests.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="pending">
                {pendingRequests.length > 0 ? renderRequestTable(pendingRequests) : <p className="text-muted-foreground text-center py-8">No pending leave requests.</p>}
            </TabsContent>
            <TabsContent value="resolved">
                <div className="flex justify-end mb-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={resolvedRequests.length === 0 || isDeleting}>
                        {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        Clear History
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete all {resolvedRequests.length} resolved leave requests.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                 {resolvedRequests.length > 0 ? renderRequestTable(resolvedRequests) : <p className="text-muted-foreground text-center py-8">No resolved leave requests.</p>}
            </TabsContent>
        </Tabs>
        <Dialog open={isReassignDialogOpen} onOpenChange={setReassignDialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Re-assign Classes for {selectedRequest?.requesterName}</DialogTitle>
                    <DialogDescription>
                        This faculty member has classes scheduled during their leave. Please assign a substitute for each slot.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto p-1">
                    <div className="space-y-4">
                        {slotsToReassign.map(slot => (
                            <Card key={slot.id}>
                                <CardContent className="p-4 grid grid-cols-2 gap-4 items-center">
                                    <div>
                                        <p className="font-semibold">{slot.day}, {slot.time}</p>
                                        <p className="text-sm">{slot.className}: {slot.subjectName}</p>
                                        <p className="text-sm text-muted-foreground">Classroom: {slot.classroomName}</p>
                                    </div>
                                    <div>
                                        <Label htmlFor={`faculty-select-${slot.id}`}>Substitute Faculty</Label>
                                        <Select
                                          value={reassignmentData[slot.id]}
                                          onValueChange={(newFacultyId) => setReassignmentData(prev => ({ ...prev, [slot.id]: newFacultyId}))}
                                        >
                                            <SelectTrigger id={`faculty-select-${slot.id}`}>
                                                <SelectValue placeholder="Select a faculty member" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableFacultyMap[slot.id]?.length > 0 ? (
                                                  availableFacultyMap[slot.id].map(fac => (
                                                      <SelectItem key={fac.id} value={fac.id}>{fac.name}</SelectItem>
                                                  ))
                                                ) : (
                                                  <div className='p-2 text-sm text-muted-foreground'>No available faculty</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setReassignDialogOpen(false)} disabled={isReassigning}>Cancel</Button>
                    <Button onClick={handleReassignment} disabled={isReassigning || Object.keys(reassignmentData).length !== slotsToReassign.length}>
                        {isReassigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Approve & Re-assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
