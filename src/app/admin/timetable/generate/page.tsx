
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
import { getSchedule, replaceSchedule } from '@/lib/services/schedule';
import type { Class, Subject, Faculty, Classroom, Schedule, GenerateTimetableOutput } from '@/lib/types';
import { Loader2, ArrowLeft, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const ALL_TIME_SLOTS = [
    '07:30-08:25',
    '08:25-09:20',
    '09:20-09:30', // break
    '09:30-10:25',
    '10:25-11:20',
    '11:20-12:20', // recess
    '12:20-13:15',
    '13:15-14:10'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['09:20-09:30', '11:20-12:20'];

function sortTime(a: string, b: string) {
    const toMinutes = (time: string) => {
        const [start] = time.split('-');
        const [h, m] = start.split(':').map(Number);
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

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading;
    
    return (
        <DashboardLayout pageTitle="Admin / Timetable Generator" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Class-wise Timetable Generator</CardTitle>
                        <CardDescription>
                            Generate a conflict-free timetable for a specific class. The engine will schedule it around the existing master timetable.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                           <>
                                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Department" /></SelectTrigger>
                                    <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={!selectedDepartment}>
                                    <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Select Class" /></SelectTrigger>
                                    <SelectContent>{classesInDept.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                               <Button onClick={handleGenerate} disabled={isGenerating || !selectedClassId} size="lg">
                                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                                    Generate for Class
                                </Button>
                           </>
                        )}
                    </CardContent>
                </Card>

                { !isLoading &&
                    <Alert>
                        <Bot className="h-4 w-4" />
                        <AlertTitle>Ready to Generate!</AlertTitle>
                        <AlertDescription>
                            The AI will use all available university data to generate an optimal timetable for the selected class, ensuring it fits perfectly with the existing schedule.
                        </AlertDescription>
                    </Alert>
                }
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
                                                        {time === '09:20-09:30' ? '10 MIN BREAK' : 'RECESS'}
                                                    </TableCell>
                                                ) : (
                                                    DAYS.map(day => {
                                                        const slot = (generatedData.generatedSchedule as Schedule[]).find(s => s.day === day && s.time === time);
                                                        const isCodeChef = day === generatedData.codeChefDay
                                                        
                                                        return (
                                                            <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                                {slot ? (
                                                                    <div className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", getRelationInfo(slot.subjectId, 'subject')?.isSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                                        <div><strong>{getRelationInfo(slot.subjectId, 'subject')?.name}</strong></div>
                                                                        <div className="truncate">{getRelationInfo(slot.facultyId, 'faculty')?.name}</div>
                                                                        <div>{getRelationInfo(slot.classroomId, 'classroom')?.name}</div>
                                                                    </div>
                                                                ) : isCodeChef ? (
                                                                    <div className="flex items-center justify-center h-full text-blue-600 font-semibold text-center">Code Chef Day</div>
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
