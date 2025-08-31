
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { LeaveRequest, Faculty } from '@/lib/types';
import { Check, X, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLeaveRequests, updateLeaveRequestStatus } from '@/lib/services/leave';
import { getFaculty } from '@/lib/services/faculty';

export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      setIsLoading(true);
      const [requests, facultyData] = await Promise.all([
        getLeaveRequests(),
        getFaculty()
      ]);
      setLeaveRequests(requests);
      setFaculty(facultyData);
      setIsLoading(false);
    }
    fetchRequests();
  }, []);

  const handleRequestStatus = async (id: string, status: 'approved' | 'rejected') => {
    // Optimistic update
    const originalRequests = leaveRequests;
    setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, status } : req));
    try {
      await updateLeaveRequestStatus(id, status);
    } catch (error) {
      setLeaveRequests(originalRequests);
      // Optionally, show an error toast
    }
  };
  
  const getFacultyName = (facultyId: string) => faculty.find(f => f.id === facultyId)?.name || 'Unknown';

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const resolvedRequests = leaveRequests.filter(r => r.status !== 'pending');

  const renderRequestTable = (requests: LeaveRequest[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faculty</TableHead>
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
              <TableCell>{getFacultyName(request.facultyId)}</TableCell>
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
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleRequestStatus(request.id, 'approved')}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRequestStatus(request.id, 'rejected')}>
                      <X className="h-4 w-4" />
                    </Button>
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
             {resolvedRequests.length > 0 ? renderRequestTable(resolvedRequests) : <p className="text-muted-foreground text-center py-8">No resolved leave requests.</p>}
        </TabsContent>
    </Tabs>
  );
}
