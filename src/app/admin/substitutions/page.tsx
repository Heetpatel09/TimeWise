'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getEnrichedSubstituteAssignments, updateSubstituteAssignmentStatus } from '@/lib/services/substitutions';
import type { EnrichedSubstituteAssignment } from '@/lib/types';
import { Loader2, Check, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


export default function SubstitutionsPage() {
    const [assignments, setAssignments] = useState<EnrichedSubstituteAssignment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState<string | null>(null);
    const { toast } = useToast();

    async function loadData() {
        setIsLoading(true);
        try {
            const data = await getEnrichedSubstituteAssignments();
            setAssignments(data);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to load substitution requests.', variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        loadData();
    }, []);

    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        setIsUpdating(id);
        try {
            await updateSubstituteAssignmentStatus(id, status);
            toast({ title: 'Success', description: `Request has been ${status}.` });
            await loadData();
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update request status.', variant: 'destructive' });
        } finally {
            setIsUpdating(null);
        }
    }
    
    const pendingAssignments = assignments.filter(a => a.status === 'pending');
    const resolvedAssignments = assignments.filter(a => a.status !== 'pending');


    const renderTable = (data: EnrichedSubstituteAssignment[]) => (
         <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Original Faculty</TableHead>
                        <TableHead>Substitute Faculty</TableHead>
                        <TableHead>Class Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                            <TableCell>{item.originalFacultyName}</TableCell>
                            <TableCell>{item.substituteFacultyName}</TableCell>
                            <TableCell>
                                <div className="text-xs">
                                    <div><strong>Class:</strong> {item.schedule.className}</div>
                                    <div><strong>Subject:</strong> {item.schedule.subjectName}</div>
                                    <div><strong>Time:</strong> {item.schedule.day}, {item.schedule.time}</div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={item.status === 'pending' ? 'secondary' : item.status === 'approved' ? 'default' : 'destructive'}>
                                    {item.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                {item.status === 'pending' && (
                                    <div className="flex gap-2 justify-end">
                                        {isUpdating === item.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Button size="icon" variant="outline" className="h-8 w-8 bg-green-100 text-green-700 hover:bg-green-200" onClick={() => handleStatusUpdate(item.id, 'approved')}>
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="outline" className="h-8 w-8 bg-red-100 text-red-700 hover:bg-red-200" onClick={() => handleStatusUpdate(item.id, 'rejected')}>
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
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Substitutions</CardTitle>
                <CardDescription>Review and approve faculty substitution requests.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Tabs defaultValue="pending">
                    <TabsList>
                        <TabsTrigger value="pending">Pending ({pendingAssignments.length})</TabsTrigger>
                        <TabsTrigger value="resolved">Resolved ({resolvedAssignments.length})</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending">
                        {pendingAssignments.length > 0 ? renderTable(pendingAssignments) : <p className="text-muted-foreground text-center py-8">No pending substitution requests.</p>}
                    </TabsContent>
                    <TabsContent value="resolved">
                        {resolvedAssignments.length > 0 ? renderTable(resolvedAssignments) : <p className="text-muted-foreground text-center py-8">No resolved requests found.</p>}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
