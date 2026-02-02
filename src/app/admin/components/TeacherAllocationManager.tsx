
'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Bot, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getFaculty } from '@/lib/services/faculty';
import { getDepartments } from '@/lib/services/departments';
import type { Class, Subject, Faculty, Department, GenerateTeacherAllocationOutput } from '@/lib/types';
import { generateTeacherAllocationFlow } from '@/ai/flows/generate-teacher-allocation-flow';
import { saveTeacherAllocation } from '@/lib/services/allocations';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function TeacherAllocationManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classes, isLoading: classesLoading } = useQuery<Class[]>({ queryKey: ['classes'], queryFn: getClasses });
  const { data: subjects, isLoading: subjectsLoading } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: getSubjects });
  const { data: faculty, isLoading: facultyLoading } = useQuery<Faculty[]>({ queryKey: ['faculty'], queryFn: getFaculty });
  const { data: departments, isLoading: departmentsLoading } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments });
  
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  const [isGenerating, setIsGenerating] = useState(false);
  const [allocationResult, setAllocationResult] = useState<GenerateTeacherAllocationOutput | null>(null);

  const isLoading = classesLoading || subjectsLoading || facultyLoading || departmentsLoading;

  const semesterOptions = useMemo(() => {
      if (!classes || !selectedDepartmentId) return [];
      const semesters = new Set(
          classes.filter(c => c.departmentId === selectedDepartmentId).map(c => c.semester.toString())
      );
      return Array.from(semesters).sort((a,b) => parseInt(a) - parseInt(b));
  }, [classes, selectedDepartmentId]);

  const { mutate: saveAllocation, isPending: isSaving } = useMutation({
    mutationFn: () => {
        if (!allocationResult || !subjects || !faculty) {
            throw new Error('No allocation data to save.');
        }
        return saveTeacherAllocation(allocationResult, subjects, faculty);
    },
    onSuccess: () => {
        toast({ title: 'Allocation Saved!', description: 'Faculty subject assignments have been updated.' });
        queryClient.invalidateQueries({ queryKey: ['faculty'] });
    },
    onError: (e: any) => {
        toast({ title: 'Save Failed', description: e.message, variant: 'destructive' });
    }
  });

  const handleGenerate = async () => {
    if (!selectedDepartmentId || !selectedSemester || !classes || !subjects || !faculty) {
      toast({ title: 'Selection Missing', description: 'Please select a department and semester.', variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setAllocationResult(null);

    const relevantClasses = classes.filter(c => c.departmentId === selectedDepartmentId && c.semester.toString() === selectedSemester);
    const relevantSubjects = subjects.filter(s => s.departmentId === selectedDepartmentId && s.semester.toString() === selectedSemester && s.id !== 'LIB001');

    if (relevantClasses.length === 0 || relevantSubjects.length === 0) {
        toast({ title: 'No Data', description: 'No classes or subjects found for this selection.', variant: 'destructive'});
        setIsGenerating(false);
        return;
    }

    try {
        const result = await generateTeacherAllocationFlow({
            subjects: relevantSubjects,
            classes: relevantClasses,
            faculty: faculty,
        });
        setAllocationResult(result);
        toast({ title: 'Allocation Generated!', description: 'Review the proposed teacher-section allocation below.' });
    } catch (e: any) {
        toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Teacher-Section Allocator</CardTitle>
          <CardDescription>
            Generate a balanced and randomized teacher allocation for all sections of a specific semester within a department.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          {isLoading ? (
            <div className="flex justify-center p-8 w-full"><Loader2 className="animate-spin" /></div>
          ) : (
            <>
              <Select value={selectedDepartmentId} onValueChange={(val) => { setSelectedDepartmentId(val); setSelectedSemester(''); }}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select a Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSemester} onValueChange={setSelectedSemester} disabled={!selectedDepartmentId}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Select a Semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesterOptions.map(s => <SelectItem key={s} value={s}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={isGenerating || isLoading || !selectedDepartmentId || !selectedSemester} size="lg">
            {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Bot className="mr-2 h-4 w-4" />}
            Generate Allocation
          </Button>
        </CardFooter>
      </Card>
      
      {allocationResult && (
        <Card>
            <CardHeader>
                <CardTitle>Generated Allocation</CardTitle>
                <CardDescription>
                    Review the proposed allocation. Clicking "Save" will update which subjects each faculty member is assigned to in the database.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {Object.entries(allocationResult).map(([subjectName, teacherAllocations], index) => (
                        <AccordionItem value={`item-${index}`} key={index}>
                            <AccordionTrigger className="text-lg font-semibold">{subjectName}</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-2 pl-4">
                                {Object.entries(teacherAllocations).map(([teacherName, sections]) => (
                                    <div key={teacherName}>
                                        <p className="font-medium">{teacherName}</p>
                                        <p className="text-sm text-muted-foreground">{sections.join(', ')}</p>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
            <CardFooter>
                <Button onClick={() => saveAllocation()} disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Allocation
                </Button>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}
