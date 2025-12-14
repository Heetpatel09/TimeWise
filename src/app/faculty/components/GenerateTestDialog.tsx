
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import type { Class, Subject } from '@/lib/types';
// import { generateTestPaper, GenerateTestPaperOutput } from '@/ai/flows/generate-test-paper-flow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addExam } from '@/lib/services/exams';
import { format } from 'date-fns';

type GenerateTestPaperOutput = any;

interface GenerateTestDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  facultyId: string;
}

export default function GenerateTestDialog({ isOpen, onOpenChange, facultyId }: GenerateTestDialogProps) {
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [topics, setTopics] = useState<string>('');
  const [paperStyle, setPaperStyle] = useState<'multiple_choice' | 'short_answer' | 'mixed'>('multiple_choice');

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [generatedPaper, setGeneratedPaper] = useState<GenerateTestPaperOutput | null>(null);

  useEffect(() => {
    async function loadData() {
      if (isOpen) {
        const [classData, subjectData] = await Promise.all([getClasses(), getSubjects()]);
        setClasses(classData);
        setSubjects(subjectData);
      }
    }
    loadData();
  }, [isOpen]);

  const resetForm = () => {
    setSelectedClassId('');
    setSelectedSubjectId('');
    setTopics('');
    setPaperStyle('multiple_choice');
    setGeneratedPaper(null);
  }

  const handleGenerate = async () => {
    if (!selectedClassId || !selectedSubjectId || !topics) {
      toast({ title: "Missing Information", description: "Please select a class, subject, and provide topics.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    toast({ title: "AI Disabled", description: "AI features are currently disabled.", variant: "destructive"});
    setIsGenerating(false);
    // try {
    //   const subjectName = subjects.find(s => s.id === selectedSubjectId)?.name || '';
    //   const className = classes.find(c => c.id === selectedClassId)?.name || '';
    //   const result = await generateTestPaper({
    //     subjectName,
    //     className,
    //     topics: topics.split('\n'),
    //     paperStyle,
    //   });
    //   setGeneratedPaper(result);
    // } catch (error: any) {
    //   toast({ title: "AI Generation Failed", description: error.message, variant: "destructive" });
    // } finally {
    //   setIsGenerating(false);
    // }
  };

  const handlePublish = async () => {
      if (!generatedPaper || !selectedClassId || !selectedSubjectId) return;
      setIsPublishing(true);
      try {
        // Here you would typically save the generated questions to a 'tests' or 'assignments' table.
        // For this demo, we'll create an "exam" entry to show it on student dashboards.
        await addExam({
            subjectId: selectedSubjectId,
            classId: selectedClassId,
            date: format(new Date(), 'yyyy-MM-dd'),
            time: 'AI Generated Test' // Placeholder time
        });
        toast({ title: "Test Published!", description: "The test is now available for students." });
        onOpenChange(false);
        resetForm();
      } catch (error: any) {
          toast({ title: "Publishing Failed", description: error.message, variant: "destructive" });
      } finally {
          setIsPublishing(false);
      }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) resetForm(); onOpenChange(open); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Generate Weekly Test with AI</DialogTitle>
          <DialogDescription>
            Create a test by specifying the topics and paper style. The AI will handle the rest.
          </DialogDescription>
        </DialogHeader>

        {!generatedPaper ? (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger id="class"><SelectValue placeholder="Select a class" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                   <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger id="subject"><SelectValue placeholder="Select a subject" /></SelectTrigger>
                    <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topics">Topics (one per line)</Label>
                <Textarea id="topics" placeholder="e.g., Normalization (1NF, 2NF, 3NF)\nSQL Joins\nTransactions" value={topics} onChange={e => setTopics(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paper-style">Paper Style</Label>
                <Select value={paperStyle} onValueChange={(v: any) => setPaperStyle(v)}>
                    <SelectTrigger id="paper-style"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice Questions (MCQs)</SelectItem>
                        <SelectItem value="short_answer">Short Answer Questions</SelectItem>
                        <SelectItem value="mixed">Mixed (MCQs and Short Answers)</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
        ) : (
            <ScrollArea className="h-96 my-4 border rounded-md p-4">
                <div className="space-y-6">
                    {generatedPaper.questions.map((q: any, index: number) => (
                        <Card key={index}>
                            <CardHeader>
                                <CardTitle className="text-base">Question {index + 1}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p>{q.questionText}</p>
                                {q.options && (
                                    <ul className="space-y-2 list-disc pl-5">
                                        {q.options.map((opt: string, i: number) => <li key={i}>{opt}</li>)}
                                    </ul>
                                )}
                                <p className="font-semibold text-primary">Answer: <span className="font-normal text-foreground">{q.answer}</span></p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        )}

        <DialogFooter>
            {generatedPaper ? (
                <>
                    <Button variant="outline" onClick={() => setGeneratedPaper(null)}>Back</Button>
                    <Button onClick={handlePublish} disabled={isPublishing}>
                        {isPublishing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Publish Test
                    </Button>
                </>
            ) : (
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                        Generate
                    </Button>
                </>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
