
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { faculty, leaveRequests as initialLeaveRequests } from '@/lib/placeholder-data';
import type { LeaveRequest } from '@/lib/types';
import { Check, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function LeaveRequestsPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);

  const handleRequestStatus = (id: string, status: 'approved' | 'rejected') => {
    setLeaveRequests(leaveRequests.map(req => req.id === id ? { ...req, status } : req));
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
              <TableCell>{request.startDate}</TableCell>
              <TableCell>{request.endDate}</TableCell>
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
