
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClassrooms } from '@/lib/services/classrooms';
import { getStudents } from '@/lib/services/students';
import { getSchedule, replaceSchedule } from '@/lib/services/schedule';
import type { Class, Subject, Faculty, Classroom, Schedule, GenerateTimetableOutput, Student } from '@/lib/types';
import { Loader2, ArrowLeft, Bot, Users, BookOpen, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const ALL_TIME_SLOTS = [
    '07:30 AM - 08:30 AM',
    '08:30 AM - 09:30 AM',
    '09:30 AM - 10:00 AM', // Break
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM', // Break
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const BREAK_SLOTS = ['09:30 AM - 10:00 AM', '12:00 PM - 01:00 PM'];

function sortTime(a: string, b: string) {
    const toMinutes = (time: string) => {
        const [start] = time.split(' - ');
        let [h, m] = start.split(':');
        const modifier = start.slice(-2);
        let hours = parseInt(h, 10);
        if (modifier === 'PM' && hours !== 12) {
            hours += 12;
        }
        if (modifier === 'AM' && hours === 12) {
            hours = 0;
        }
        return hours * 60 + parseInt(m, 10);
    };
    return toMinutes(a) - toMinutes(b);
}

export default function TimetableGeneratorPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({ queryKey: ['classes'], queryFn: getClasses });
    const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: faculty, isLoading: facultyLoading } = useQuery<Faculty[]>({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: classrooms, isLoading: classroomsLoading } = useQuery<Classroom[]>({ queryKey: ['classrooms'], queryFn: getClassrooms });
    const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({ queryKey: ['students'], queryFn: getStudents });
    const { data: existingSchedule, isLoading: scheduleLoading } = useQuery<Schedule[]>({ queryKey: ['schedule'], queryFn: getSchedule });
    
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const departments = useMemo(() => classes ? [...new Set(classes.map(c => c.department))] : [], [classes]);
    const classesInDept = useMemo(() => classes ? classes.filter(c => c.department === selectedDepartment) : [], [classes, selectedDepartment]);

    useEffect(() => {
        if (departments.length > 0 && !selectedDepartment) {
            setSelectedDepartment(departments[0]);
        }
    }, [departments, selectedDepartment]);
    
     useEffect(() => {
        if (classesInDept.length > 0 && !selectedClassId) {
            setSelectedClassId(classesInDept[0].id);
        } else if (classesInDept.length > 0 && selectedClassId && !classesInDept.find(c => c.id === selectedClassId)) {
            setSelectedClassId(classesInDept[0].id);
        } else if (classesInDept.length === 0) {
            setSelectedClassId('');
        }
    }, [classesInDept, selectedClassId]);


    const handleGenerate = async () => {
        if (!selectedClassId || !classes || !subjects || !faculty || !classrooms || !existingSchedule) {
            toast({ title: 'Data not loaded yet. Please wait.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const classToGenerate = classes.find(c => c.id === selectedClassId);
            if (!classToGenerate) throw new Error("Selected class not found.");

            const result = await generateTimetableFlow({
                days: DAYS,
                timeSlots: ALL_TIME_SLOTS,
                classes: [classToGenerate], // Generate for only one class
                subjects,
                faculty,
                classrooms,
                existingSchedule // Provide existing schedule for conflict checking
            });

            if (result.generatedSchedule.length === 0 && result.summary) {
                toast({ title: 'Generation Failed', description: result.summary, variant: 'destructive', duration: 10000 });
            } else {
                setGeneratedData(result);
                setReviewDialogOpen(true);
            }
        } catch (e: any) {
            toast({ title: 'AI Generation Error', description: e.message, variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleApplySchedule = async () => {
        if (!generatedData) return;
        setIsApplying(true);
        try {
            const finalSchedule = [...(existingSchedule || []), ...generatedData.generatedSchedule as Schedule[]];
            await replaceSchedule(finalSchedule);
            toast({ title: "Schedule Updated!", description: `The timetable for the selected class has been integrated.` });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            setReviewDialogOpen(false);
            setGeneratedData(null);
        } catch (e: any) {
            toast({ title: 'Failed to Apply', description: e.message, variant: 'destructive' });
        } finally {
            setIsApplying(false);
        }
    }
    
    const getRelationInfo = (id: string, type: 'class' | 'subject' | 'faculty' | 'classroom') => {
        switch (type) {
        case 'class': return classes?.find(c => c.id === id);
        case 'subject': return subjects?.find(s => s.id === id);
        case 'faculty': return faculty?.find(f => f.id === id);
        case 'classroom': return classrooms?.find(cr => cr.id === id);
        default: return undefined;
        }
    };

    const selectedClassDetails = useMemo(() => {
        if (!selectedClassId || !classes || !students || !subjects || !faculty) return null;
        
        const sClass = classes.find(c => c.id === selectedClassId);
        if (!sClass) return null;

        const studentCount = students.filter(s => s.classId === selectedClassId).length;
        const classSubjects = subjects
            .filter(sub => sub.department === sClass.department && sub.semester === sClass.semester)
            .map(sub => {
                const assignedFaculty = faculty.find(f => f.allottedSubjects?.includes(sub.id));
                return {
                    ...sub,
                    facultyName: assignedFaculty?.name || 'Unassigned'
                };
            });

        return {
            studentCount,
            subjects: classSubjects
        };

    }, [selectedClassId, classes, students, subjects, faculty]);

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading || studentsLoading;
    
    return (
        <DashboardLayout pageTitle="Admin / Timetable Generator" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class-wise Timetable Generator</CardTitle>
                            <CardDescription>
                                Generate a conflict-free timetable for a specific class.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? <Loader2 className="animate-spin" /> : (
                            <>
                                <div className="space-y-2">
                                    <label>Department</label>
                                    <Select value={selectedDepartment} onValueChange={(val) => {setSelectedDepartment(val); setSelectedClassId('')}}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Department" /></SelectTrigger>
                                        <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                     <label>Class</label>
                                    <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedDepartment}>
                                        <SelectTrigger className="w-full"><SelectValue placeholder="Select Class" /></SelectTrigger>
                                        <SelectContent>{classesInDept.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            </>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleGenerate} disabled={isGenerating || !selectedClassId} size="lg" className="w-full">
                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                                Generate for Class
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                   {selectedClassDetails ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Class Details: {classes?.find(c => c.id === selectedClassId)?.name}</CardTitle>
                                <CardDescription>
                                    An overview of the selected class to be scheduled.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary">
                                    <Users className="h-8 w-8 text-primary" />
                                    <div>
                                        <p className="text-2xl font-bold">{selectedClassDetails.studentCount}</p>
                                        <p className="text-sm text-muted-foreground">Student(s)</p>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary"/> Subjects & Faculty</h4>
                                    <ScrollArea className="h-64 border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Subject</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Assigned Faculty</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedClassDetails.subjects.map(sub => (
                                                    <TableRow key={sub.id}>
                                                        <TableCell>{sub.name}</TableCell>
                                                        <TableCell><Badge variant="outline" className="capitalize">{sub.type}</Badge></TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <UserCheck className="h-4 w-4 text-muted-foreground"/>
                                                                {sub.facultyName}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>

                            </CardContent>
                        </Card>
                   ) : !isLoading && (
                     <Card className="flex items-center justify-center h-full">
                        <div className="text-center p-8">
                            <p className="text-muted-foreground">Select a class to view its details and generate a timetable.</p>
                        </div>
                    </Card>
                   )}
                </div>
            </div>
            
            <Dialog open={isReviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <DialogTitle>Review Generated Timetable</DialogTitle>
                        <DialogDescription>{generatedData?.summary}</DialogDescription>
                    </DialogHeader>
                    {generatedData && (
                        <div>
                            {generatedData.generatedSchedule.length > 0 ? (
                            <ScrollArea className="h-[60vh] border rounded-md">
                                <Table className="border-collapse">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="border font-semibold p-2">Time</TableHead>
                                            {DAYS.map(day => (
                                                <TableHead key={day} className="border font-semibold p-2">{day}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ALL_TIME_SLOTS.sort(sortTime).map(time => (
                                            <TableRow key={time}>
                                                <TableCell className="border font-medium text-xs whitespace-nowrap p-2">{time}</TableCell>
                                                {BREAK_SLOTS.includes(time) ? (
                                                     <TableCell colSpan={DAYS.length} className="border text-center font-semibold bg-secondary p-2">
                                                        {time === '09:30 AM - 10:00 AM' ? 'SHORT BREAK' : 'LUNCH BREAK'}
                                                    </TableCell>
                                                ) : (
                                                    DAYS.map(day => {
                                                        const slot = (generatedData.generatedSchedule as Schedule[]).find(s => s.day === day && s.time === time);
                                                        
                                                        return (
                                                            <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                                {slot ? (
                                                                    <div className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", getRelationInfo(slot.subjectId, 'subject')?.isSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                                        <div><strong>{getRelationInfo(slot.subjectId, 'subject')?.name}</strong></div>
                                                                        <div className="truncate">{getRelationInfo(slot.facultyId, 'faculty')?.name}</div>
                                                                        <div>{getRelationInfo(slot.classroomId, 'classroom')?.name}</div>
                                                                    </div>
                                                                ) : null }
                                                            </TableCell>
                                                        )
                                                    })
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                            ) : (
                                <p>No schedule generated. The AI might not have found a valid configuration.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApplySchedule} disabled={isApplying || !generatedData || generatedData.generatedSchedule.length === 0}>
                            {isApplying && <Loader2 className="animate-spin mr-2" />}
                            Integrate This Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
