
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClassrooms } from '@/lib/services/classrooms';
import { getSchedule, applyScheduleForClass } from '@/lib/services/schedule';
import { getDepartments } from '@/lib/services/departments';
import type { Class, Subject, Faculty, Classroom, Schedule, GenerateTimetableOutput, Department } from '@/lib/types';
import { Loader2, ArrowLeft, Bot, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM',
    '09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM',
    '12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'
];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableGeneratorPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({ queryKey: ['classes'], queryFn: getClasses });
    const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: faculty, isLoading: facultyLoading } = useQuery<Faculty[]>({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: classrooms, isLoading: classroomsLoading } = useQuery<Classroom[]>({ queryKey: ['classrooms'], queryFn: getClassrooms });
    const { data: existingSchedule, isLoading: scheduleLoading } = useQuery<Schedule[]>({ queryKey: ['schedule'], queryFn: getSchedule });
    const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments });

    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [applyingClass, setApplyingClass] = useState<string | null>(null);

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading || departmentsLoading;

    const handleGenerate = async () => {
        if (!selectedDepartmentId || !classes || !subjects || !faculty || !classrooms || !existingSchedule || !departments) {
            toast({ title: 'Data not loaded or selection missing', description: 'Please select a department and wait for all data to load.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);

        const relevantClasses = classes.filter(c => c.departmentId === selectedDepartmentId);
        if (relevantClasses.length === 0) {
            toast({ title: 'No Classes Found', description: 'There are no classes in the selected department to generate a timetable for.', variant: 'destructive' });
            setIsGenerating(false);
            return;
        }
        
        const cleanSubjects = JSON.parse(JSON.stringify(subjects));
        const cleanFaculty = JSON.parse(JSON.stringify(faculty));

        try {
            const result = await generateTimetableFlow({
                days: ALL_DAYS.filter(d => d !== 'Saturday'),
                timeSlots: ALL_TIME_SLOTS,
                classes: relevantClasses,
                subjects: cleanSubjects,
                faculty: cleanFaculty,
                classrooms,
                departments,
                existingSchedule,
            });
            
            if (result && result.classTimetables) {
                setGeneratedData(result);
                setReviewDialogOpen(true);
            } else {
                 toast({ title: 'Generation Failed', description: result.error || 'The AI engine returned an empty or invalid response.', variant: 'destructive' });
            }
        } catch (e: any) {
            console.error("Timetable generation caught error:", e);
            const description = e?.message && typeof e.message === 'string' ? e.message : 'An unexpected error occurred. Check the console for details.';
            toast({ title: 'Engine Error', description, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleApplyScheduleForClass = async (classId: string, timetable: Omit<Schedule, 'id'>[]) => {
        setApplyingClass(classId);
        try {
            await applyScheduleForClass(classId, timetable);
            toast({ title: "Schedule Applied!", description: `The new timetable for this section has been saved.` });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            // Optional: Close dialog or indicate success on the tab
        } catch(e: any) {
            toast({ title: 'Failed to Apply', description: e.message, variant: 'destructive' });
        } finally {
            setApplyingClass(null);
        }
    }


    return (
        <DashboardLayout pageTitle="Admin / Timetable Generator" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>University Timetable Generator</CardTitle>
                    <CardDescription>
                        Generate an optimized, conflict-free timetable for all sections within a department.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                         <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                     ) : (
                        <div className="flex flex-wrap gap-4">
                           <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                                    <SelectTrigger className="w-[250px]" id="department">
                                        <SelectValue placeholder="Select a Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                     )}
                </CardContent>
                <CardFooter>
                     <Button onClick={handleGenerate} disabled={isGenerating || isLoading || !selectedDepartmentId} size="lg">
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                        Generate Timetable
                    </Button>
                </CardFooter>
            </Card>
            
            <Dialog open={isReviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <DialogTitle>Review Generated Timetable</DialogTitle>
                        <DialogDescription>{generatedData?.summary}</DialogDescription>
                    </DialogHeader>
                    {generatedData && generatedData.error && (
                         <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Generation Issues Encountered</AlertTitle>
                            <AlertDescription className="max-h-24 overflow-y-auto">{generatedData.error}</AlertDescription>
                        </Alert>
                    )}
                    {generatedData && generatedData.classTimetables && (
                        <Tabs defaultValue={generatedData.classTimetables[0]?.classId}>
                            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${generatedData.classTimetables.length}, minmax(0, 1fr))`}}>
                                {generatedData.classTimetables.map(ct => (
                                    <TabsTrigger key={ct.classId} value={ct.classId}>{ct.className}</TabsTrigger>
                                ))}
                            </TabsList>
                             
                            {generatedData.classTimetables.map(ct => (
                                <TabsContent key={ct.classId} value={ct.classId}>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <ScrollArea className="h-[60vh]">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Day</TableHead>
                                                            {ALL_TIME_SLOTS.map(t => <TableHead key={t}>{t}</TableHead>)}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                    {ALL_DAYS.filter(d => d !== 'Saturday').map(day => (
                                                        <TableRow key={day}>
                                                            <TableCell className="font-semibold">{day}</TableCell>
                                                            {ALL_TIME_SLOTS.map(time => {
                                                                const slotsInCell = ct.timetable.filter(g => g.day === day && g.time === time);
                                                                return (
                                                                    <TableCell key={time} className="p-1 align-top min-w-[150px]">
                                                                        <div className="space-y-1">
                                                                            {slotsInCell.map(slot => {
                                                                                const subject = subjects?.find(s => s.id === slot.subjectId);
                                                                                return (
                                                                                    <div key={slot.subjectId + (slot.batch || '')} className="text-xs p-2 rounded bg-muted">
                                                                                        <div className='font-bold'>{subject?.name} {slot.batch && <span className='text-muted-foreground'>({slot.batch})</span>}</div>
                                                                                        <div>{faculty?.find(f=>f.id === slot.facultyId)?.name}</div>
                                                                                        <div className="text-muted-foreground font-semibold">{classrooms?.find(c=>c.id === slot.classroomId)?.name || 'TBD'}</div>
                                                                                    </div>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                    </TableCell>
                                                                )
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                    </TableBody>
                                                </Table>
                                            </ScrollArea>
                                        </CardContent>
                                        <CardFooter className='justify-end'>
                                             <Button onClick={() => handleApplyScheduleForClass(ct.classId, ct.timetable)} disabled={applyingClass === ct.classId}>
                                                {applyingClass === ct.classId && <Loader2 className="animate-spin mr-2" />}
                                                Apply Schedule for {ct.className}
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
