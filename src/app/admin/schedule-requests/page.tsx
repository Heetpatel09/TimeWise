
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ScheduleChangeRequest, Schedule, Faculty, Class, Subject, Classroom } from '@/lib/types';
import { Check, X, Loader2 } from 'lucide-react';
import { getScheduleChangeRequests, updateScheduleChangeRequestStatus } from '@/lib/services/schedule-changes';
import { getFaculty } from '@/lib/services/faculty';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { getSchedule } from '@/lib/services/schedule';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ScheduleRequestsPage() {
  const [requests, setRequests] = useState<ScheduleChangeRequest[]>([]);
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  async function loadData() {
      setIsLoading(true);
      const [fetchedRequests, scheduleData, facultyData, classData, subjectData, classroomData] = await Promise.all([
        getScheduleChangeRequests(),
        getSchedule(),
        getFaculty(),
        getClasses(),
        getSubjects(),
        getClassrooms(),
      ]);
      setRequests(fetchedRequests);
      setSchedule(scheduleData);
      setFaculty(facultyData);
      setClasses(classData);
      setSubjects(subjectData);
      setClassrooms(classroomData);
      setIsLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestStatus = async (id: string, status: 'resolved' | 'rejected') => {
    setIsUpdating(id);
    try {
      await updateScheduleChangeRequestStatus(id, status);
      await loadData();
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
        setIsUpdating(null);
    }
  };
  
  const getFacultyName = (facultyId: string) => faculty.find(f => f.id === facultyId)?.name || 'Unknown';
  const getScheduleSlot = (scheduleId: string): Schedule | undefined => schedule.find(s => s.id === scheduleId);
  const getRelationName = (id: string | undefined, type: 'class' | 'subject' | 'classroom') => {
    if (!id) return 'N/A';
    switch (type) {
      case 'class': return classes.find(c => c.id === id)?.name;
      case 'subject': return subjects.find(s => s.id === id)?.name;
      case 'classroom': return classrooms.find(cr => cr.id === id)?.name;
      default: return 'N/A';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status !== 'pending');

  const getStatusVariant = (status: ScheduleChangeRequest['status']) => {
    switch(status) {
        case 'pending': return 'secondary';
        case 'resolved': return 'default';
        case 'rejected': return 'destructive';
        default: return 'outline';
    }
  }

  const renderRequestTable = (reqs: ScheduleChangeRequest[]) => (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Faculty</TableHead>
            <TableHead>Slot Details</TableHead>
            <TableHead>Request Details</TableHead>
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
                            <div><strong>Classroom:</strong> {getRelationName(slot.classroomId, 'classroom')}</div>
                        </div>
                    ) : 'Slot not found'}
                </TableCell>
                <TableCell className="max-w-xs">
                    <p className='truncate'>{request.reason}</p>
                    {request.requestedClassroomId && (
                      <p className="text-xs text-muted-foreground mt-1">
                        New Classroom Request: <strong>{getRelationName(request.requestedClassroomId, 'classroom')}</strong>
                      </p>
                    )}
                </TableCell>
                <TableCell>
                    <Badge variant={getStatusVariant(request.status)}>
                        {request.status}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    {request.status === 'pending' && (
                    isUpdating === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    ) : (
                        <div className="flex gap-2 justify-end">
                            <Button size="icon" variant="outline" className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleRequestStatus(request.id, 'resolved')}>
                                <Check className="h-4 w-4" />
                            </Button>
                             <Button size="icon" variant="outline" className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleRequestStatus(request.id, 'rejected')}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )
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
    <div>
        <h3 className='text-lg font-semibold mb-2'>Pending ({pendingRequests.length})</h3>
        {pendingRequests.length > 0 ? renderRequestTable(pendingRequests) : <p className="text-muted-foreground text-center py-8">No pending requests.</p>}
        
        <h3 className='text-lg font-semibold mt-6 mb-2'>Resolved ({resolvedRequests.length})</h3>
        {resolvedRequests.length > 0 ? renderRequestTable(resolvedRequests) : <p className="text-muted-foreground text-center py-8">No resolved requests.</p>}
    </div>
  );
}
