
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
import { getSchedule, replaceSchedule } from '@/lib/services/schedule';
import { getDepartments } from '@/lib/services/departments';
import type { Class, Subject, Faculty, Classroom, Schedule, GenerateTimetableOutput, Department } from '@/lib/types';
import { Loader2, ArrowLeft, Bot } from 'lucide-react';
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
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const filteredClasses = useMemo(() => {
        if (!selectedDepartmentId || !classes) return [];
        return classes.filter(c => c.departmentId === selectedDepartmentId);
    }, [selectedDepartmentId, classes]);

    const handleGenerate = async () => {
        const classToGenerate = classes?.find(c => c.id === selectedClassId);

        if (isLoading || !classToGenerate || !subjects || !faculty || !classrooms || !existingSchedule || !departments) {
            toast({ title: 'Data not loaded or selection missing', description: 'Please select a department and class, and wait for all data to load.', variant: 'destructive' });
            return;
        }

        setIsGenerating(true);
        try {
            const result = await generateTimetableFlow({
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                timeSlots: ALL_TIME_SLOTS,
                classes: [classToGenerate], // Pass only the selected class
                subjects,
                faculty,
                classrooms,
                departments,
                existingSchedule,
            });
            
            if (result && result.error) {
                toast({ title: 'Generation Failed', description: result.error, variant: 'destructive', duration: 10000 });
            } else if (result && result.semesterTimetables) {
                setGeneratedData(result);
                setReviewDialogOpen(true);
            } else {
                 toast({ title: 'Generation Failed', description: 'The AI engine returned an unexpected response.', variant: 'destructive' });
            }
        } catch (e: any) {
            console.error("Timetable generation caught error:", e);
            const description = e?.message && typeof e.message === 'string' ? e.message : 'An unexpected error occurred. Check the console for details.';
            toast({ title: 'Engine Error', description, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleApplySchedule = async () => {
        if (!generatedData || !generatedData.semesterTimetables) return;
        
        const newFullSchedule = generatedData.semesterTimetables.flatMap(st => st.timetable.map(g => ({
            id: `SCH_${g.classId}_${g.day}_${g.time}`,
            ...g
        })));

        setIsApplying(true);
        try {
            await replaceSchedule(newFullSchedule);
            toast({ title: "Schedule Applied!", description: `The new university-wide timetable has been created.` });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            setReviewDialogOpen(false);
            setGeneratedData(null);
        } catch (e: any) {
            toast({ title: 'Failed to Apply', description: e.message, variant: 'destructive' });
        } finally {
            setIsApplying(false);
        }
    }

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading || departmentsLoading;

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
                        Generate an optimized, conflict-free timetable for all semesters based on faculty experience, workload, and subject priorities.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     {isLoading ? (
                         <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                     ) : (
                        <div className="flex flex-wrap gap-4">
                           <div className="space-y-2">
                                <Label htmlFor="department">Department</Label>
                                <Select value={selectedDepartmentId} onValueChange={(v) => { setSelectedDepartmentId(v); setSelectedClassId(''); }}>
                                    <SelectTrigger className="w-[250px]" id="department">
                                        <SelectValue placeholder="Select a Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="class">Class</Label>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedDepartmentId}>
                                    <SelectTrigger className="w-[250px]" id="class">
                                        <SelectValue placeholder="Select a Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredClasses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                     )}
                </CardContent>
                <CardFooter>
                     <Button onClick={handleGenerate} disabled={isGenerating || isLoading || !selectedClassId} size="lg">
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
                            <AlertTitle>Generation Error</AlertTitle>
                            <AlertDescription>{generatedData.error}</AlertDescription>
                        </Alert>
                    )}
                    {generatedData && (
                        <Tabs defaultValue="faculty">
                            <TabsList className="grid grid-cols-2 w-full">
                                <TabsTrigger value="timetables">Semester Timetables</TabsTrigger>
                                <TabsTrigger value="faculty">Faculty Workload</TabsTrigger>
                            </TabsList>
                             <TabsContent value="timetables">
                                <ScrollArea className="h-[60vh] p-1">
                                    <div className="space-y-6">
                                        <div className='text-center font-semibold p-2 bg-purple-100 dark:bg-purple-900 rounded-md'>
                                            CodeChef Day is on <span className="font-bold">{generatedData.codeChefDay}</span>. No classes are scheduled on this day.
                                        </div>
                                    {generatedData.semesterTimetables.map(st => (
                                        <Card key={st.semester}>
                                            <CardHeader><CardTitle>Semester {st.semester}</CardTitle></CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Day</TableHead>
                                                            {ALL_TIME_SLOTS.map(t => <TableHead key={t}>{t}</TableHead>)}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].filter(d => d !== generatedData.codeChefDay).map(day => (
                                                        <TableRow key={day}>
                                                            <TableCell className="font-semibold">{day}</TableCell>
                                                            {ALL_TIME_SLOTS.map(time => {
                                                                const slot = st.timetable.find(g => g.day === day && g.time === time);
                                                                const subject = slot ? subjects?.find(s => s.id === slot.subjectId) : null;
                                                                return (
                                                                    <TableCell key={time}>
                                                                        {slot && subject ? (
                                                                            <div className="text-xs">
                                                                                <div>{subject.name}</div>
                                                                                <div className="text-muted-foreground">{faculty?.find(f=>f.id === slot.facultyId)?.name}</div>
                                                                            </div>
                                                                        ) : null}
                                                                    </TableCell>
                                                                )
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    </div>
                                </ScrollArea>
                            </TabsContent>
                            <TabsContent value="faculty">
                                 <ScrollArea className="h-[60vh]">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Faculty</TableHead>
                                                <TableHead>Experience Level</TableHead>
                                                <TableHead>Workload (Hours)</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {generatedData.facultyWorkload.sort((a,b) => b.experience - a.experience).map(fw => (
                                                <TableRow key={fw.facultyId}>
                                                    <TableCell>{fw.facultyName}</TableCell>
                                                    <TableCell>{fw.experience.toFixed(1)} yrs ({fw.level})</TableCell>
                                                    <TableCell>{fw.assignedHours} / {fw.maxHours}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                 </ScrollArea>
                            </TabsContent>
                        </Tabs>
                    )}
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApplySchedule} disabled={isApplying || !generatedData || !!generatedData.error}>
                            {isApplying && <Loader2 className="animate-spin mr-2" />}
                            Apply Full Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
