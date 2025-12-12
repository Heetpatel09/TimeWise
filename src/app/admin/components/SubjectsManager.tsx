
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '@/lib/services/subjects';
import type { Subject } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Star, Beaker, BookOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Textarea } from '@/components/ui/textarea';

export default function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load subjects.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (currentSubject) {
      setIsSubmitting(true);
      try {
        if (currentSubject.id) {
          await updateSubject(currentSubject as Subject);
          toast({ title: "Subject Updated", description: "The subject details have been saved." });
        } else {
          await addSubject(currentSubject as Omit<Subject, 'id'>);
          toast({ title: "Subject Added", description: "The new subject has been added." });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentSubject({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = (subject: Subject) => {
    setCurrentSubject(subject);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteSubject(id);
      await loadData();
      toast({ title: "Subject Deleted", description: "The subject has been removed." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentSubject({ isSpecial: false, type: 'theory', semester: 1 });
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openNewDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Subject
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Special</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell>{subject.code}</TableCell>
                <TableCell className='capitalize'>
                    <Badge variant={subject.type === 'lab' ? 'secondary' : 'outline'} className="gap-1">
                        {subject.type === 'lab' ? <Beaker className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                        {subject.type}
                    </Badge>
                </TableCell>
                <TableCell>{subject.semester}</TableCell>
                <TableCell>
                  {subject.isSpecial && <Badge variant="secondary" className="text-amber-600 border-amber-500/50"><Star className="h-3 w-3 mr-1" />Special</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(subject)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/10">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the subject and any associated schedule slots.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(subject.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setCurrentSubject({});
        setDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentSubject?.id ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription>
              {currentSubject?.id ? 'Update the details of the subject.' : 'Add a new subject to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={currentSubject.name ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })} disabled={isSubmitting}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" value={currentSubject.code ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, code: e.target.value })} disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input id="semester" type="number" min="1" max="8" value={currentSubject.semester ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, semester: parseInt(e.target.value) || 1 })} disabled={isSubmitting}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={currentSubject?.type} onValueChange={(v: 'theory' | 'lab') => setCurrentSubject({ ...currentSubject, type: v })} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="theory">Theory</SelectItem>
                        <SelectItem value="lab">Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="syllabus">Syllabus</Label>
                <Textarea 
                    id="syllabus" 
                    value={currentSubject.syllabus ?? ''} 
                    onChange={(e) => setCurrentSubject({ ...currentSubject, syllabus: e.target.value })} 
                    placeholder='e.g., {"modules":[{"name":"Module 1","topics":["Topic A"],"weightage":"50%"}]}'
                    disabled={isSubmitting}
                />
            </div>
            <div className="flex items-center space-x-2 pt-2">
                 <Switch
                    id="special"
                    checked={currentSubject.isSpecial || false}
                    onCheckedChange={(checked) => setCurrentSubject({ ...currentSubject, isSpecial: checked })}
                    disabled={isSubmitting}
                />
                <Label htmlFor="special" className="text-sm text-muted-foreground">This is a fixed, non-reschedulable subject.</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
