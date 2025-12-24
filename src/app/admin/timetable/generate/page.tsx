
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
import { generateTimetable as generateTimetableFlow } from '@/lib/ga-engine';
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const BREAK_SLOTS = ['09:20-09:30', '11:20-12:20'];

function sortTime(a: string, b: string) {
    const toMinutes = (time: string) => {
        const [start] = time.split('-');
        const [h, m] = start.split(':').map(Number);
        return h * 60 + m;
    };
    return toMinutes(a) - toMinutes(b);
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
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isReviewDialogOpen, setReviewDialogOpen] = useState(false);
    const [generatedData, setGeneratedData] = useState<GenerateTimetableOutput | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    const handleGenerate = async () => {
        if (!classes || !subjects || !faculty || !classrooms) {
            toast({ title: 'Data not loaded yet. Please wait.', variant: 'destructive' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateTimetableFlow({
                days: DAYS,
                timeSlots: ALL_TIME_SLOTS,
                classes,
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
            const scheduleToSave = generatedData.generatedSchedule.map(slot => ({
                ...slot,
                day: slot.day as any
            }));
            
            await replaceSchedule(scheduleToSave as Schedule[]);

            toast({ title: "Schedule Applied!", description: `The new master timetable has been applied successfully.` });
            queryClient.invalidateQueries({ queryKey: ['schedule'] });
            setReviewDialogOpen(false);
            setGeneratedData(null);
        } catch (e: any) {
            toast({ title: 'Failed to Apply', description: e.message, variant: 'destructive'});
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

    const isLoading = classesLoading || subjectsLoading || facultyLoading || classroomsLoading;
    
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
                        <CardTitle>Master Timetable Generator</CardTitle>
                        <CardDescription>
                            Use the intelligent scheduling engine to generate a conflict-free master timetable for the entire university based on all defined constraints.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        {isLoading ? <Loader2 className="animate-spin" /> : (
                           <Button onClick={handleGenerate} disabled={isGenerating} size="lg">
                                {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
                                Generate Master Timetable
                            </Button>
                        )}
                    </CardContent>
                </Card>

                { !isLoading &&
                    <div className="space-y-6 animate-in fade-in-0">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <InfoCard icon={Users} title="Total Classes" numberValue={classes?.length} />
                            <InfoCard icon={BookOpen} title="Total Subjects" numberValue={subjects?.length} />
                            <InfoCard icon={UserCheck} title="Total Faculty" numberValue={faculty?.length} />
                            <InfoCard icon={Warehouse} title="Total Classrooms" numberValue={classrooms?.length} />
                        </div>
                        <Alert>
                            <Bot className="h-4 w-4" />
                            <AlertTitle>Ready to Generate!</AlertTitle>
                            <AlertDescription>
                                The AI will use all available university data to generate the optimal master timetable. This process will replace the entire existing schedule.
                            </AlertDescription>
                        </Alert>
                    </div>
                }
            </div>
            
            <Dialog open={isReviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                <DialogContent className="max-w-7xl">
                    <DialogHeader>
                        <DialogTitle>Review Generated Master Timetable</DialogTitle>
                        <DialogDescription>{generatedData?.summary}</DialogDescription>
                    </DialogHeader>
                    {generatedData && (
                        <Tabs defaultValue={classes?.[0]?.id || ''}>
                            <TabsList className="mb-4">
                                {classes?.map(c => (
                                    <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>
                                ))}
                            </TabsList>

                            {classes?.map(c => {
                                const classSchedule = generatedData.generatedSchedule.filter(s => s.classId === c.id);
                                const scheduleByTime = ALL_TIME_SLOTS.sort(sortTime).map(time => {
                                    if (BREAK_SLOTS.includes(time)) {
                                        return { time, isBreak: true, slots: [] };
                                    }
                                    const dailySlots = DAYS.map(day => {
                                        const slot = classSchedule.find(s => s.day === day && s.time === time);
                                        return { day, slot };
                                    });
                                    return { time, slots: dailySlots, isBreak: false };
                                });
                                
                                return (
                                <TabsContent key={c.id} value={c.id}>
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
                                                {scheduleByTime.map(({ time, slots, isBreak }) => (
                                                    <TableRow key={time}>
                                                        <TableCell className="border font-medium text-xs whitespace-nowrap p-2">{time}</TableCell>
                                                        {isBreak ? (
                                                            <TableCell colSpan={DAYS.length} className="border text-center font-semibold bg-secondary p-2">
                                                                {time === '09:20-09:30' ? '10 MIN BREAK' : 'RECESS'}
                                                            </TableCell>
                                                        ) : (
                                                            slots.map(({ day, slot }) => (
                                                                <TableCell key={`${time}-${day}`} className="border p-1 align-top text-xs min-w-[150px] h-20">
                                                                    {slot ? (
                                                                         <div className={cn("p-1 rounded-sm text-[11px] leading-tight mb-1", getRelationInfo(slot.subjectId, 'subject')?.isSpecial ? 'bg-primary/20' : 'bg-muted')}>
                                                                            <div><strong>{getRelationInfo(slot.subjectId, 'subject')?.name}</strong></div>
                                                                            <div className="truncate">{getRelationInfo(slot.facultyId, 'faculty')?.name}</div>
                                                                            <div>{getRelationInfo(slot.classroomId, 'classroom')?.name}</div>
                                                                        </div>
                                                                    ) : generatedData.codeChefDay === day ? (
                                                                        <div className="flex items-center justify-center h-full text-blue-600 font-semibold text-center">Code Chef Day</div>
                                                                    ) : null }
                                                                </TableCell>
                                                            ))
                                                        )}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </TabsContent>
                            )})}
                        </Tabs>
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
