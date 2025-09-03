
'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, Sparkles, AlertCircle, Save, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateTimetable } from '@/ai/flows/generate-timetable-flow';
import type { Schedule, Class, Subject, Faculty, Classroom } from '@/lib/types';
import { replaceSchedule } from '@/lib/services/schedule';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';


interface TimetableGeneratorProps {
  classes: Class[];
  subjects: Subject[];
  faculty: Faculty[];
  classrooms: Classroom[];
  role: 'admin' | 'faculty';
}

export default function TimetableGenerator({ classes, subjects, faculty, classrooms, role }: TimetableGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<Omit<Schedule, 'id'>[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedSchedule(null);
    try {
      const result = await generateTimetable();
      setGeneratedSchedule(result.timetable);
      toast({ title: 'Success', description: 'New timetable generated successfully.' });
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during generation.');
      toast({ title: 'Error', description: 'Failed to generate timetable.', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!generatedSchedule) return;
    startSaving(async () => {
        try {
            await replaceSchedule(generatedSchedule);
            toast({ title: 'Schedule Saved', description: 'The new timetable has been saved and is now active.' });
            setGeneratedSchedule(null); // Clear the preview after saving
        } catch (err: any) {
            toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
        }
    });
  }
  
  const getRelationName = (id: string, type: 'class' | 'subject' | 'faculty' | 'classroom') => {
    switch (type) {
      case 'class': return classes.find(c => c.id === id)?.name;
      case 'subject': return subjects.find(s => s.id === id)?.name;
      case 'faculty': return faculty.find(f => f.id === id)?.name;
      case 'classroom': return classrooms.find(cr => cr.id === id)?.name;
      default: return 'N/A';
    }
  };
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const scheduleByDay = generatedSchedule ? days.map(day => ({
    day,
    slots: generatedSchedule.filter(slot => slot.day === day),
  })) : [];


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Timetable Generator</CardTitle>
          <CardDescription>
            Use AI to automatically generate a full weekly schedule based on all available classes, subjects, faculty, and classrooms.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {role === 'admin' && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        Generating and saving a new timetable will <span className="font-bold">permanently delete</span> the current schedule, including any pending change requests. This action cannot be undone.
                    </AlertDescription>
                </Alert>
            )}
           {role === 'faculty' && (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Faculty View</AlertTitle>
                    <AlertDescription>
                        As a faculty member, you can generate and view a potential timetable for planning purposes, but you cannot save it.
                    </AlertDescription>
                </Alert>
            )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            {isGenerating ? 'Generating...' : 'Generate New Timetable'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Generation Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardFooter>
      </Card>

      {generatedSchedule && (
        <Card className="animate-in fade-in-0 duration-500">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Generated Timetable Preview</CardTitle>
                        <CardDescription>Review the generated schedule below before saving.</CardDescription>
                    </div>
                    {role === 'admin' && (
                         <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Schedule
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    This will replace the current entire schedule with this new one. All existing slots and requests will be deleted. This action is irreversible.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleSave}>Yes, Save It</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
               {scheduleByDay.map(({ day, slots }) => (
                <div key={day}>
                    <h3 className="font-bold text-lg mb-2">{day}</h3>
                     <div className="border rounded-lg">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Faculty</TableHead>
                                <TableHead>Classroom</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {slots.map((slot, index) => (
                                <TableRow key={index}>
                                    <TableCell>{slot.time}</TableCell>
                                    <TableCell>{getRelationName(slot.classId, 'class')}</TableCell>
                                    <TableCell>{getRelationName(slot.subjectId, 'subject')}</TableCell>
                                    <TableCell>{getRelationName(slot.facultyId, 'faculty')}</TableCell>
                                    <TableCell>{getRelationName(slot.classroomId, 'classroom')}</TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                     </div>
                </div>
               ))}
            </CardContent>
        </Card>
      )}
    </div>
  );
}
