
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LeaveRequest } from '@/lib/types';
import { Check, X, Loader2, Trash2 } from 'lucide-react';
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

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  async function fetchRequests() {
    setIsLoading(true);
    try {
        const requests = await getLeaveRequests();
        setLeaveRequests(requests.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()));
    } catch(error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to fetch requests.', variant: 'destructive'});
    }
    setIsLoading(false);
  }

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdating(id);
    try {
      await updateLeaveRequestStatus(id, status);
      await fetchRequests();
      toast({ title: 'Success', description: `Request has been ${status}.`});
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status.', variant: 'destructive'});
    } finally {
        setIsUpdating(null);
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
                        <Button size="icon" variant="outline" className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleRequestStatus(request.id, 'approved')}>
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRequestStatus(request.id, 'rejected')}>
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
  );
}
