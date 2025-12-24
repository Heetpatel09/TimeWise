
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
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
    const { data: existingSchedule, isLoading: scheduleLoading } = useQuery<Schedule[]>({ queryKey: ['schedule'], queryFn: getSchedule });
    
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const departments = useMemo(() => classes ? [...new Set(classes.map(c => c.department))] : [], [classes]);
    const semestersInDept = useMemo(() => {
        if (!classes || !selectedDepartment) return [];
        const semesters = new Set(classes.filter(c => c.department === selectedDepartment).map(c => c.semester));
        return Array.from(semesters).sort((a,b) => a-b);
    }, [classes, selectedDepartment]);


    useEffect(() => {
        if (departments.length > 0 && !selectedDepartment) {
            setSelectedDepartment(departments[0]);
        }
    }, [departments, selectedDepartment]);
    
     useEffect(() => {
        if (semestersInDept.length > 0 && !selectedSemester) {
            setSelectedSemester(semestersInDept[0].toString());
        } else if (semestersInDept.length > 0 && selectedSemester && !semestersInDept.includes(parseInt(selectedSemester))) {
            setSelectedSemester(semestersInDept[0].toString());
        } else if (semestersInDept.length === 0) {
            setSelectedSemester('');
        }
    }, [semestersInDept, selectedSemester]);


    const handleGenerate = async () => {
        if (!selectedDepartment || !selectedSemester || !classes || !subjects || !faculty || !classrooms) {
            toast({ title: 'Data not loaded yet. Please wait.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const classesToGenerate = classes.filter(c => c.department === selectedDepartment && c.semester.toString() === selectedSemester);
            if (classesToGenerate.length === 0) throw new Error("No classes found for the selected department and semester.");

            const result = await generateTimetableFlow({
                days: DAYS,
                timeSlots: ALL_TIME_SLOTS,
                classes: classesToGenerate,
                subjects,
                faculty,
                classrooms,
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
            // Replace the entire schedule with the newly generated one
            await replaceSchedule(generatedData.generatedSchedule as Schedule[]);
            toast({ title: "Schedule Applied!", description: `The new timetable has been successfully created.` });
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

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading;
    
    return (
        <DashboardLayout pageTitle="Admin / Timetable Generator" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <div className="grid grid-cols-1 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Master Timetable Generator</CardTitle>
                        <CardDescription>
                            Generate a conflict-free timetable for an entire semester within a department.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label>Department</label>
                                <Select value={selectedDepartment} onValueChange={(val) => {setSelectedDepartment(val); setSelectedSemester('')}}>
                                    <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                                    <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                    <label>Semester</label>
                                <Select value={selectedSemester} onValueChange={setSelectedSemester} disabled={!selectedDepartment}>
                                    <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                    <SelectContent>{semestersInDept.map(s => <SelectItem key={s} value={s.toString()}>Semester {s}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGenerate} disabled={isGenerating || !selectedSemester} size="lg" className="w-full sm:w-auto">
                            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                            Generate Timetable
                        </Button>
                    </CardFooter>
                </Card>
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
                                                        const slots = (generatedData.generatedSchedule as Schedule[]).filter(s => s.day === day && s.time === time);
                                                        
                                                        return (
                                                            <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                                {slots.map(slot => (
                                                                     <div key={slot.id || `${slot.classId}-${slot.subjectId}`} className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", getRelationInfo(slot.subjectId, 'subject')?.isSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                                        <div><strong>{getRelationInfo(slot.subjectId, 'subject')?.name}</strong></div>
                                                                        <div className="truncate text-muted-foreground">{getRelationInfo(slot.facultyId, 'faculty')?.name}</div>
                                                                        <div className='flex justify-between'>
                                                                            <Badge variant="outline">{getRelationInfo(slot.classroomId, 'classroom')?.name}</Badge>
                                                                            <Badge variant="secondary">{getRelationInfo(slot.classId, 'class')?.name}</Badge>
                                                                        </div>
                                                                    </div>
                                                                ))}
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
                            Apply Full Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
