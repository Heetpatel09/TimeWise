
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DashboardLayout from '@/components/DashboardLayout';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getClassrooms } from '@/lib/services/classrooms';
import { getSchedule, replaceSchedule } from '@/lib/services/schedule';
import type { Class, Subject, Faculty, Classroom, Student, Schedule, GenerateTimetableOutput } from '@/lib/types';
import { Loader2, ArrowLeft, Users, BookOpen, UserCheck, Warehouse, Bot, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


const ALL_TIME_SLOTS = [
    '07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM', 
    '09:30 AM - 10:00 AM', // Recess
    '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', 
    '12:00 PM - 01:00 PM', // Recess
    '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['09:30 AM - 10:00 AM', '12:00 PM - 01:00 PM'];

function sortTime(a: string, b: string) {
    const toDate = (time: string) => {
        const [timePart, modifier] = time.split(' ');
        let [hours, minutes] = timePart.split(':');
        if (hours === '12') hours = '0';
        if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
        return new Date(1970, 0, 1, parseInt(hours), parseInt(minutes));
    };
    return toDate(a).getTime() - toDate(b).getTime();
}


function InfoCard({ icon: Icon, title, stringValue, numberValue }: { icon: React.ElementType, title: string, stringValue?: string, numberValue?: number }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stringValue ?? numberValue}</div>
            </CardContent>
        </Card>
    );
}

export default function TimetableGeneratorPage() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({ queryKey: ['classes'], queryFn: getClasses });
    const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: faculty, isLoading: facultyLoading } = useQuery<Faculty[]>({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: classrooms, isLoading: classroomsLoading } = useQuery<Classroom[]>({ queryKey: ['classrooms'], queryFn: getClassrooms });
    const { data: existingSchedule, isLoading: scheduleLoading } = useQuery<Schedule[]>({ queryKey: ['schedule'], queryFn: getSchedule });

    const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const departments = useMemo(() => Array.from(new Set(classes?.map(c => c.department) || [])), [classes]);
    const classesInDept = useMemo(() => classes?.filter(c => c.department === selectedDepartment) || [], [classes, selectedDepartment]);
    const selectedClass = useMemo(() => classes?.find(c => c.id === selectedClassId), [classes, selectedClassId]);
    const selectedSemester = selectedClass?.semester;

    useEffect(() => {
        setSelectedClassId(null);
    }, [selectedDepartment]);
    
    const contextInfo = useMemo(() => {
        if (!selectedClassId || !selectedSemester || !subjects || !faculty || !classrooms) return null;

        const relevantSubjects = subjects.filter(s => s.department === selectedClass?.department && s.semester === selectedSemester);
        
        // Find all faculty relevant to the department. The GA will handle specific subject assignments.
        const relevantFaculty = faculty.filter(f => f.department === selectedDepartment);

        return {
            subjects: relevantSubjects,
            faculty: relevantFaculty,
            classrooms,
        };
    }, [selectedClassId, selectedSemester, subjects, faculty, classrooms, selectedClass, selectedDepartment]);


    const handleGenerate = async () => {
        if (!selectedClass || !contextInfo || !selectedSemester) {
            toast({ title: 'Please select a department, class, and semester', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateTimetableFlow({
                days: DAYS.filter(d => d !== 'Saturday'), // Standard 5-day week
                timeSlots: ALL_TIME_SLOTS,
                classes: [selectedClass],
                subjects: contextInfo.subjects,
                faculty: contextInfo.faculty,
                classrooms: classrooms || [],
                existingSchedule: existingSchedule || [],
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
        if (!generatedData || !existingSchedule || !selectedClassId) return;

        setIsApplying(true);
        try {
            const otherSchedules = existingSchedule.filter(s => s.classId !== selectedClassId);
            const newFullSchedule = [...otherSchedules, ...(generatedData.generatedSchedule as Schedule[])];
            
            await replaceSchedule(newFullSchedule);

            toast({ title: "Schedule Applied!", description: `The timetable for ${selectedClass?.name} has been updated.` });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            setReviewDialogOpen(false);
            setGeneratedData(null);
        } catch (e: any) {
            toast({ title: 'Failed to Apply', description: e.message, variant: 'destructive'});
        } finally {
            setIsApplying(false);
        }
    }
    
    const scheduleByTime = useMemo(() => {
        if (!generatedData) return [];
        return ALL_TIME_SLOTS.sort(sortTime).map(time => {
            if (BREAK_SLOTS.includes(time)) {
                return { time, isBreak: true, slots: [] };
            }
            const dailySlots = DAYS.map(day => {
                const slot = (generatedData.generatedSchedule as Schedule[]).find(s => s.day === day && s.time === time);
                return { day, slot };
            });
            return { time, slots: dailySlots, isBreak: false };
        });
    }, [generatedData]);


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
                        <CardTitle>Timetable Generator</CardTitle>
                        <CardDescription>Select a department and class to generate a timetable using a Genetic Algorithm.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                <Select onValueChange={setSelectedDepartment} value={selectedDepartment || ''}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select onValueChange={setSelectedClassId} value={selectedClassId || ''} disabled={!selectedDepartment}>
                                    <SelectTrigger className="w-full sm:w-[200px]">
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classesInDept.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {selectedClassId && (
                                    <div className="w-full sm:w-auto">
                                        <Input
                                            readOnly
                                            value={`Semester: ${selectedSemester}`}
                                            className="w-full sm:w-[200px] text-center font-semibold"
                                        />
                                    </div>
                                )}
                                <Button onClick={handleGenerate} disabled={!selectedClassId || isGenerating} className="w-full sm:w-auto">
                                    {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                                    Generate Timetable
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {contextInfo && (
                    <div className="space-y-6 animate-in fade-in-0">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <InfoCard icon={BookOpen} title="Subjects for Semester" numberValue={contextInfo.subjects.length} />
                            <InfoCard icon={UserCheck} title="Faculty in Department" numberValue={contextInfo.faculty.length} />
                            <InfoCard icon={Warehouse} title="Available Classrooms" numberValue={contextInfo.classrooms.length} />
                        </div>
                        <Alert>
                            <Bot className="h-4 w-4" />
                            <AlertTitle>Ready to Generate!</AlertTitle>
                            <AlertDescription>
                                You have selected {selectedClass?.name} (Sem {selectedSemester}). The AI will use the contextual information above to generate the timetable.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
                 {(!selectedDepartment || !selectedClassId) && (
                     <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Selection Required</AlertTitle>
                        <AlertDescription>
                            Please select a department and class to proceed.
                        </AlertDescription>
                    </Alert>
                )}
            </div>
            
            <Dialog open={isReviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <DialogTitle>Review Generated Timetable for {selectedClass?.name}</DialogTitle>
                        <DialogDescription>{generatedData?.summary}</DialogDescription>
                    </DialogHeader>
                    {generatedData && (
                        <ScrollArea className="h-[70vh] border rounded-md">
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
                                    {scheduleByTime.map(({ time, slots, isBreak }) => (
                                        <TableRow key={time}>
                                            <TableCell className="border font-medium text-xs whitespace-nowrap p-2">{time}</TableCell>
                                            {isBreak ? (
                                                <TableCell colSpan={DAYS.length} className="border text-center font-semibold bg-secondary p-2">
                                                    RECESS
                                                </TableCell>
                                            ) : (
                                                slots.map(({ day, slot }) => (
                                                    <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                        {slot ? (
                                                             <div className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", 'bg-muted')}>
                                                                <div><strong>{subjects?.find(s => s.id === slot.subjectId)?.name}</strong></div>
                                                                <div className="truncate">{faculty?.find(f => f.id === slot.facultyId)?.name}</div>
                                                                <div>{classrooms?.find(c => c.id === slot.classroomId)?.name}</div>
                                                                {(slot as any).batch && <Badge variant="secondary" className="mt-1">Batch {(slot as any).batch}</Badge>}
                                                            </div>
                                                        ) : null}
                                                    </TableCell>
                                                ))
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApplySchedule} disabled={isApplying}>
                            {isApplying && <Loader2 className="animate-spin mr-2" />}
                            Apply This Schedule
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
