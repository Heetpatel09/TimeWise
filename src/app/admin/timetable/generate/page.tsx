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
import { getStudents } from '@/lib/services/students';
import { getDepartments } from '@/lib/services/departments';
import type { Class, Subject, Faculty, Classroom, Schedule, GenerateTimetableOutput, Student, Department } from '@/lib/types';
import { Loader2, ArrowLeft, Bot, Users, BookOpen, Library } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM',
    '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Break
    '09:30 AM - 10:25 AM',
    '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Break
    '12:20 PM - 01:15 PM',
    '01:15 PM - 02:10 PM'
];
const BREAK_SLOTS = ['09:20 AM - 09:30 AM', '11:20 AM - 12:20 PM'];
const LECTURE_TIME_SLOTS = ALL_TIME_SLOTS.filter(t => !BREAK_SLOTS.includes(t));


function sortTime(a: string, b: string) {
    const toMinutes = (time: string) => {
        const [start] = time.split(' - ');
        let [h, m] = start.split(':').map(Number);
        const modifier = time.slice(-2);
        if (h === 12) h = 0;
        if (modifier === 'PM') h += 12;
        return h * 60 + m;
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
    const { data: existingSchedule, isLoading: scheduleLoading } = useQuery<Schedule[]>({ queryKey: ['schedule'], queryFn: getSchedule });
    const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({ queryKey: ['students'], queryFn: getStudents });
    const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments });
    
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [workingDays, setWorkingDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    
    const semestersInDept = useMemo(() => {
        if (!classes || !selectedDepartmentId) return [];
        const semesters = new Set(classes.filter(c => c.departmentId === selectedDepartmentId).map(c => c.semester));
        return Array.from(semesters).sort((a,b) => a-b);
    }, [classes, selectedDepartmentId]);

    const classesInSemester = useMemo(() => {
        if (!classes || !selectedDepartmentId || !selectedSemester) return [];
        return classes.filter(c => c.departmentId === selectedDepartmentId && c.semester.toString() === selectedSemester);
    }, [classes, selectedDepartmentId, selectedSemester]);
    
    const selectedClassDetails = useMemo(() => {
        if (!selectedClassId || !classes || !students || !subjects || !faculty) return null;
        const cls = classes.find(c => c.id === selectedClassId);
        if (!cls) return null;
        
        const studentCount = students.filter(s => s.classId === selectedClassId).length;
        const classSubjects = subjects.filter(s => s.departmentId === cls.departmentId && s.semester === cls.semester)
            .map(sub => ({
                ...sub,
                facultyName: faculty.find(f => f.allottedSubjects?.includes(sub.id))?.name || 'N/A'
            }));

        return {
            studentCount,
            subjects: classSubjects
        };
    }, [selectedClassId, classes, students, subjects, faculty]);

    useEffect(() => {
        if (departments && departments.length > 0 && !selectedDepartmentId) {
            setSelectedDepartmentId(departments[0].id);
        }
    }, [departments, selectedDepartmentId]);
    
    useEffect(() => {
        if (semestersInDept.length > 0 && !semestersInDept.includes(parseInt(selectedSemester))) {
            setSelectedSemester(semestersInDept[0].toString());
        } else if (semestersInDept.length === 0) {
            setSelectedSemester('');
        }
    }, [semestersInDept, selectedSemester]);

     useEffect(() => {
        if (classesInSemester.length > 0 && !classesInSemester.some(c => c.id === selectedClassId)) {
            setSelectedClassId(classesInSemester[0].id);
        } else if (classesInSemester.length === 0) {
            setSelectedClassId('');
        }
    }, [classesInSemester, selectedClassId]);

    const handleDayChange = (day: string, checked: boolean) => {
        setWorkingDays(prev => {
            if (checked) {
                return [...prev, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
            } else {
                return prev.filter(d => d !== day);
            }
        });
    };

    const handleGenerate = async () => {
        if (!selectedClassId || !classes || !subjects || !faculty || !classrooms || !existingSchedule || !departments || !students) {
            toast({ title: 'Data not loaded yet', description: 'Please wait a moment for all data to load before generating a timetable.', variant: 'destructive' });
            return;
        }

        if (workingDays.length === 0) {
            toast({ title: 'No Days Selected', description: 'Please select at least one working day.', variant: 'destructive'});
            return;
        }

        setIsGenerating(true);
        try {
            const classToGenerate = classes.find(c => c.id === selectedClassId);
            if (!classToGenerate) throw new Error("Selected class not found.");
            
            const result = await generateTimetableFlow({
                days: workingDays,
                timeSlots: LECTURE_TIME_SLOTS,
                classes: [classToGenerate],
                subjects,
                faculty,
                classrooms,
                departments,
                existingSchedule: existingSchedule.filter(s => s.classId !== selectedClassId),
            });

            if (result && result.generatedSchedule.length > 0) {
                 setGeneratedData(result);
                 setReviewDialogOpen(true);
            } else {
                toast({ title: 'Generation Failed', description: result.summary || result.error || "Could not generate a valid timetable.", variant: 'destructive', duration: 10000 });
            }
        } catch (e: any) {
            toast({ title: 'Engine Error', description: e.message || "An unexpected error occurred from the server.", variant: 'destructive' });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleApplySchedule = async () => {
        if (!generatedData || !existingSchedule || !selectedClassId) return;
        setIsApplying(true);
        try {
            const otherSchedules = existingSchedule.filter(s => s.classId !== selectedClassId);
            const newFullSchedule = [...otherSchedules, ...(generatedData.generatedSchedule as Schedule[])];
            
            await replaceSchedule(newFullSchedule);
            toast({ title: "Schedule Applied!", description: `The new timetable for the selected class has been created and merged.` });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            setReviewDialogOpen(false);
            setGeneratedData(null);
        } catch (e: any) {
            toast({ title: 'Failed to Apply', description: e.message, variant: 'destructive' });
        } finally {
            setIsApplying(false);
        }
    }

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading || studentsLoading || departmentsLoading;
    
    const codeChefDay = generatedData?.codeChefDay;

    return (
        <DashboardLayout pageTitle="Admin / Timetable Generator" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configuration</CardTitle>
                            <CardDescription>Select a class and working days to generate a timetable.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {isLoading ? <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div> : (
                                <>
                                    <div className="space-y-2">
                                        <Label>1. Select Department</Label>
                                        <Select value={selectedDepartmentId} onValueChange={(val) => { setSelectedDepartmentId(val); setSelectedSemester(''); setSelectedClassId('') }}>
                                            <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                            <SelectContent>{departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>2. Select Semester</Label>
                                        <Select value={selectedSemester} onValueChange={(val) => { setSelectedSemester(val); setSelectedClassId(''); }} disabled={!selectedDepartmentId}>
                                            <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                            <SelectContent>{semestersInDept.map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>3. Select Class</Label>
                                        <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedSemester}>
                                            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                                            <SelectContent>{classesInSemester.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>4. Select Working Days</Label>
                                        <div className="grid grid-cols-3 gap-2 rounded-lg border p-4">
                                            {DAYS.map(day => (
                                                <div key={day} className="flex items-center gap-2">
                                                    <Checkbox
                                                        id={`day-${day}`}
                                                        checked={workingDays.includes(day)}
                                                        onCheckedChange={(checked) => handleDayChange(day, !!checked)}
                                                    />
                                                    <Label htmlFor={`day-${day}`} className="text-sm font-normal">{day}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                    <Button onClick={handleGenerate} disabled={isGenerating || !selectedClassId || isLoading} size="lg" className="w-full">
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                        Generate Timetable
                    </Button>
                </div>
                
                <div className="lg:col-span-2">
                    {selectedClassDetails ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Class Details: {classes?.find(c=>c.id === selectedClassId)?.name}</CardTitle>
                                <CardDescription>An overview of the selected class's requirements.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <Card>
                                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                                <Users className="h-4 w-4 text-muted-foreground"/>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">{selectedClassDetails.studentCount}</div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold flex items-center gap-2 text-sm"><BookOpen className="h-4 w-4 text-muted-foreground"/>Subjects & Faculty</h3>
                                        <ScrollArea className="h-48 border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Subject</TableHead>
                                                        <TableHead>Faculty</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedClassDetails.subjects.map(sub => (
                                                        <TableRow key={sub.id}>
                                                            <TableCell className="text-xs">{sub.name}</TableCell>
                                                            <TableCell className="text-xs">{sub.facultyName}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                         <Card className="flex flex-col items-center justify-center text-center h-full p-8">
                             <CardHeader>
                                <CardTitle>Select a Class</CardTitle>
                                <CardDescription>Choose a class from the left panel to see its details and generate a timetable.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Bot className="h-16 w-16 text-muted-foreground" />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
            
            <Dialog open={isReviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <DialogTitle>Review Generated Timetable for {classes?.find(c => c.id === selectedClassId)?.name}</DialogTitle>
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
                                            {workingDays.map(day => (
                                                <TableHead key={day} className={cn("border font-semibold p-2 text-center", day === codeChefDay && "bg-purple-100 dark:bg-purple-900/30")}>{day}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ALL_TIME_SLOTS.sort(sortTime).map(time => {
                                            if (BREAK_SLOTS.includes(time)) {
                                                return (
                                                    <TableRow key={time}>
                                                        <TableCell className="border font-medium text-xs whitespace-nowrap p-2">{time}</TableCell>
                                                        <TableCell colSpan={workingDays.length} className="border text-center font-semibold bg-secondary text-muted-foreground">
                                                             {time === '09:20 AM - 09:30 AM' ? 'RECESS' : 'LUNCH BREAK'}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            }
                                            return (
                                            <TableRow key={time}>
                                                <TableCell className="border font-medium text-xs whitespace-nowrap p-2 align-top h-24">{time}</TableCell>
                                                {workingDays.map(day => {
                                                    const slot = (generatedData.generatedSchedule as Schedule[]).find(s => s.day === day && s.time === time);
                                                    return (
                                                        <TableCell key={`${time}-${day}`} className={cn("border p-1 align-top text-xs min-w-[150px] h-24", day === codeChefDay && "bg-purple-100/50 dark:bg-purple-900/20")}>
                                                            {day === codeChefDay ? (
                                                                <div className="flex justify-center items-center h-full text-center font-semibold text-purple-700 dark:text-purple-300">CODE CHEF</div>
                                                            ) : slot ? (() => {
                                                                const subject = subjects?.find(s => s.id === slot.subjectId);
                                                                const facultyMember = faculty?.find(f => f.id === slot.facultyId);
                                                                const classroom = classrooms?.find(c => c.id === slot.classroomId);

                                                                if (!subject) return null;

                                                                if (subject.id === 'LIB001') {
                                                                    return (
                                                                        <div className='flex justify-center items-center h-full text-muted-foreground'>
                                                                            <Library className="h-4 w-4 mr-2" />
                                                                            <span>Library</span>
                                                                        </div>
                                                                    );
                                                                }
                                                                
                                                                return (
                                                                    <div className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", subject?.isSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                                        <div><strong>{subject.name}</strong></div>
                                                                        <div className="truncate text-muted-foreground">{facultyMember?.name || 'N/A'}</div>
                                                                        <div className='flex justify-between mt-1'>
                                                                            <Badge variant="outline">{classroom?.name || 'N/A'}</Badge>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })() : null}
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        )})}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                            ) : (
                                <p>No schedule generated. The AI might not have found a valid configuration.</p>
                            )}
                        </div>
                    )}
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApplySchedule} disabled={isApplying || !generatedData || generatedData.generatedSchedule.length === 0}>
                            {isApplying && <Loader2 className="animate-spin mr-2" />}
                            Apply & Merge Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
