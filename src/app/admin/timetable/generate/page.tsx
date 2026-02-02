
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
import { Loader2, ArrowLeft, Bot, AlertTriangle, Library, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { generateTimetableFlow } from '@/ai/flows/generate-timetable-flow';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import React from 'react';

const ALL_TIME_SLOTS = [
    '07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM',
    '09:20 AM - 09:30 AM', // Recess
    '09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM',
    '11:20 AM - 12:20 PM', // Lunch
    '12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'
];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const BREAK_SLOTS = ['09:20 AM - 09:30 AM', '11:20 AM - 12:20 PM'];
const LAB_TIME_PAIRS: [string, string][] = [
    ['07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM'],
    ['12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM']
];


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
    const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments });

    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [applyingClass, setApplyingClass] = useState<string | null>(null);

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading || scheduleLoading || departmentsLoading;

    const handleGenerate = async () => {
        if (!selectedDepartmentId || !classes || !subjects || !faculty || !classrooms || !departments) {
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
        
        try {
            const result = await generateTimetableFlow({
                days: ALL_DAYS,
                timeSlots: ALL_TIME_SLOTS.filter(t => !BREAK_SLOTS.includes(t)),
                classes: relevantClasses,
                subjects,
                faculty,
                classrooms,
                departments,
                existingSchedule: existingSchedule || [],
            });
            
            if (result && result.classTimetables) {
                setGeneratedData(result);
                setReviewDialogOpen(true);
            } else {
                 toast({ title: 'Generation Failed', description: 'The AI engine returned an empty or invalid response.', variant: 'destructive' });
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
            
            setGeneratedData(prev => {
                if (!prev) return null;
                const newClassTimetables = prev.classTimetables.filter(ct => ct.classId !== classId);
                if (newClassTimetables.length === 0) {
                    setReviewDialogOpen(false); // Close dialog if no more timetables to review
                    return null;
                }
                return {
                    ...prev,
                    classTimetables: newClassTimetables,
                }
            })

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
                         <DialogDescription>
                            {generatedData?.summary || "Review the generated timetable for each section."}
                            {generatedData?.optimizationExplanation && <p className="mt-1 text-xs text-muted-foreground">{generatedData.optimizationExplanation}</p>}
                        </DialogDescription>
                    </DialogHeader>
                    
                    {generatedData && generatedData.classTimetables && generatedData.classTimetables.length > 0 ? (
                        <Tabs defaultValue={generatedData.classTimetables[0]?.classId} className="w-full">
                            <TabsList className="flex-wrap h-auto">
                                {generatedData.classTimetables.map(ct => (
                                    <TabsTrigger key={ct.classId} value={ct.classId}>{ct.className}</TabsTrigger>
                                ))}
                            </TabsList>
                             
                            {generatedData.classTimetables.map(ct => (
                                <TabsContent key={ct.classId} value={ct.classId}>
                                    <Card>
                                        <CardContent className="pt-6">
                                            <ScrollArea className="h-[60vh]">
                                                <Table className="border">
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className="w-28 text-sm p-2">Time</TableHead>
                                                            {ALL_DAYS.map(day => (
                                                                <TableHead key={day} className="text-center text-sm p-2">{day}</TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {ALL_TIME_SLOTS.sort(sortTime).map((time, timeIndex) => {
                                                            if (BREAK_SLOTS.includes(time)) {
                                                                return (
                                                                    <TableRow key={time}>
                                                                        <TableCell className="font-medium text-muted-foreground align-middle text-xs p-2">{time}</TableCell>
                                                                        <TableCell colSpan={ALL_DAYS.length} className="text-center font-semibold bg-secondary text-muted-foreground p-2">
                                                                            {time === '11:20 AM - 12:20 PM' ? 'LUNCH BREAK' : 'RECESS'}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )
                                                            }
                                                            
                                                            return (
                                                                <TableRow key={time} className="h-28">
                                                                    <TableCell className="font-medium align-top text-xs p-2">{time}</TableCell>
                                                                    {ALL_DAYS.map(day => {
                                                                        const previousTime = timeIndex > 0 ? ALL_TIME_SLOTS.sort(sortTime)[timeIndex - 1] : null;
                                                                        if (previousTime) {
                                                                            const isContinuationOfLab = LAB_TIME_PAIRS.some(pair =>
                                                                                time === pair[1] &&
                                                                                ct.timetable.some(slot => slot.day === day && slot.time === pair[0] && slot.isLab)
                                                                            );
                                                                            if (isContinuationOfLab) {
                                                                                return null;
                                                                            }
                                                                        }

                                                                        const slotsInCell = ct.timetable.filter(g => g.day === day && g.time === time);
                                                                        const isLabStart = slotsInCell.some(s => s.isLab);

                                                                        return (
                                                                            <TableCell key={day} className="p-1 align-top" rowSpan={isLabStart ? 2 : 1}>
                                                                                <div className={cn("h-full", isLabStart && "grid grid-cols-2 gap-1")}>
                                                                                    {slotsInCell.map((slot, index) => {
                                                                                        const subject = subjects?.find(s => s.id === slot.subjectId);
                                                                                        if (subject?.id === 'LIB001') {
                                                                                            return (
                                                                                                <div key={index} className="bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-md p-2 h-full flex flex-col items-center justify-center text-center">
                                                                                                    <Library className="h-5 w-5 mb-1"/>
                                                                                                    <p className="font-semibold text-xs">Library</p>
                                                                                                </div>
                                                                                            )
                                                                                        }
                                                                                        
                                                                                        let bgColor = "bg-muted";
                                                                                        if (slot.isLab) bgColor = "bg-purple-100 dark:bg-purple-900/40";
                                                                                        else if (subject?.isSpecial) bgColor = "bg-primary/10";
                                                                                        
                                                                                        return (
                                                                                            <div key={index} className={cn("rounded-md p-2 text-[11px] leading-tight shadow-sm h-full flex flex-col justify-between", bgColor)}>
                                                                                                <div>
                                                                                                    <p className="font-bold truncate">{subject?.name}</p>
                                                                                                    {slot.isLab && <p className="font-medium text-purple-800 dark:text-purple-200">{slot.batch}</p>}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <p className="truncate text-muted-foreground">{faculty?.find(f=>f.id === slot.facultyId)?.name}</p>
                                                                                                    <p className="truncate font-semibold text-muted-foreground">{classrooms?.find(c=>c.id === slot.classroomId)?.name || 'TBD'}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </TableCell>
                                                                        )
                                                                    })}
                                                                </TableRow>
                                                            )
                                                        })}
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
                    ) : <p className="text-center py-8 text-muted-foreground">No timetable could be generated with the current settings.</p>}
                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}

    