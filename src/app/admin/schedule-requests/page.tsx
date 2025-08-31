
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { schedule as staticSchedule } from '@/lib/placeholder-data';
import type { ScheduleChangeRequest, Schedule, Faculty, Class, Subject } from '@/lib/types';
import { Check, Loader2 } from 'lucide-react';
import { getScheduleChangeRequests, updateScheduleChangeRequestStatus } from '@/lib/services/schedule-changes';
import { getFaculty } from '@/lib/services/faculty';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScheduleRequestsPage() {
  const [requests, setRequests] = useState<ScheduleChangeRequest[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>(staticSchedule); // For demo, schedule is static
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRequests() {
      setIsLoading(true);
      const [fetchedRequests, facultyData, classData, subjectData] = await Promise.all([
        getScheduleChangeRequests(),
        getFaculty(),
        getClasses(),
        getSubjects()
      ]);
      setRequests(fetchedRequests);
      setFaculty(facultyData);
      setClasses(classData);
      setSubjects(subjectData);
      setIsLoading(false);
    }
    fetchRequests();
  }, []);

  const handleRequestStatus = async (id: string, status: 'resolved') => {
    const originalRequests = requests;
    setRequests(requests.map(req => req.id === id ? { ...req, status } : req));
    try {
      await updateScheduleChangeRequestStatus(id, status);
    } catch (error) {
      setRequests(originalRequests);
    }
  };
  
  const getFacultyName = (facultyId: string) => faculty.find(f => f.id === facultyId)?.name || 'Unknown';
  const getScheduleSlot = (scheduleId: string): Schedule | undefined => schedule.find(s => s.id === scheduleId);
  const getRelationName = (id: string, type: 'class' | 'subject') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id)?.name;
      case 'subject': return subjects.find(s => s.id === id)?.name;
      default: return 'N/A';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status === 'resolved');

  const renderRequestTable = (reqs: ScheduleChangeRequest[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faculty</TableHead>
            <TableHead>Slot Details</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reqs.map((request) => {
            const slot = getScheduleSlot(request.scheduleId);
            return (
                <TableRow key={request.id}>
                <TableCell>{getFacultyName(request.facultyId)}</TableCell>
                <TableCell>
                    {slot ? (
                        <div className='text-xs'>
                            <div><strong>Day:</strong> {slot.day}, {slot.time}</div>
                            <div><strong>Class:</strong> {getRelationName(slot.classId, 'class')}</div>
                            <div><strong>Subject:</strong> {getRelationName(slot.subjectId, 'subject')}</div>
                        </div>
                    ) : 'Slot not found'}
                </TableCell>
                <TableCell className="max-w-xs truncate">{request.reason}</TableCell>
                <TableCell>
                    <Badge variant={request.status === 'pending' ? 'secondary' : 'default'}>
                    {request.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {request.status === 'pending' && (
                    <div className="flex gap-2 justify-end">
                        <Button size="icon" variant="outline" className="h-8 w-8 bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => handleRequestStatus(request.id, 'resolved')}>
                            <Check className="h-4 w-4" />
                        </Button>
                    </div>
                    )}
                </TableCell>
                </TableRow>
            )
          })}
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
    <Card>
        <CardHeader>
          <CardTitle>Schedule Change Requests</CardTitle>
          <CardDescription>Review and mark faculty schedule change requests as resolved.</CardDescription>
        </CardHeader>
        <CardContent>
            <h3 className='text-lg font-semibold mb-2'>Pending ({pendingRequests.length})</h3>
            {pendingRequests.length > 0 ? renderRequestTable(pendingRequests) : <p className="text-muted-foreground text-center py-8">No pending requests.</p>}
            
            <h3 className='text-lg font-semibold mt-6 mb-2'>Resolved ({resolvedRequests.length})</h3>
            {resolvedRequests.length > 0 ? renderRequestTable(resolvedRequests) : <p className="text-muted-foreground text-center py-8">No resolved requests.</p>}
        </CardContent>
    </Card>
  );
}
