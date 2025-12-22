
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '@/lib/services/subjects';
import { getClasses, addClass, renameDepartment } from '@/lib/services/classes';
import type { Subject, Class, SubjectPriority } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, BookOpen, Building, Beaker, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PRIORITY_OPTIONS: SubjectPriority[] = ['Non Negotiable', 'High', 'Medium', 'Low'];

export default function DepartmentsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [isDeptDialogOpen, setDeptDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isRenameDeptDialogOpen, setRenameDeptDialogOpen] = useState(false);
  const [renamingDepartmentName, setRenamingDepartmentName] = useState('');
  
  const { toast } = useToast();

  const departments = Array.from(new Set(classes.map(c => c.department)));

  async function loadData() {
    setIsLoading(true);
    try {
      const [subjectData, classData] = await Promise.all([getSubjects(), getClasses()]);
      setSubjects(subjectData);
      setClasses(classData);
      const allDepts = Array.from(new Set(classData.map(c => c.department)));
      if(allDepts.length > 0 && !selectedDepartment){
        setSelectedDepartment(allDepts[0]);
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load department data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSubject = async () => {
    if (currentSubject && currentSubject.name && currentSubject.code && currentSubject.type && currentSubject.semester && selectedDepartment) {
      const subjectToSave = { ...currentSubject, department: selectedDepartment };
      setIsSubmitting(true);
      try {
        if (subjectToSave.id) {
          await updateSubject(subjectToSave as Subject);
          toast({ title: "Subject Updated" });
        } else {
          await addSubject(subjectToSave as Omit<Subject, 'id'>);
          toast({ title: "Subject Added" });
        }
        await loadData();
        setSubjectDialogOpen(false);
        setCurrentSubject({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({ title: "Missing information", description: "Please fill out all subject fields.", variant: "destructive" });
    }
  };

  const handleAddDepartment = async () => {
    if (newDepartmentName.trim()) {
        if (departments.find(d => d.toLowerCase() === newDepartmentName.trim().toLowerCase())) {
            toast({ title: "Department Exists", description: "This department name already exists.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            await addClass({
                name: `Default ${newDepartmentName.trim()} Class`,
                semester: 1,
                department: newDepartmentName.trim()
            });
            toast({ title: "Department Added", description: `The "${newDepartmentName.trim()}" department has been created.`});
            await loadData();
            setDeptDialogOpen(false);
            setNewDepartmentName('');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
  }

  const handleRenameDepartment = async () => {
    if (renamingDepartmentName.trim() && selectedDepartment) {
        if (departments.find(d => d.toLowerCase() === renamingDepartmentName.trim().toLowerCase())) {
            toast({ title: "Department Exists", description: "This department name already exists.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            await renameDepartment(selectedDepartment, renamingDepartmentName.trim());
            toast({ title: "Department Renamed", description: `"${selectedDepartment}" has been renamed to "${renamingDepartmentName.trim()}".`});
            await loadData();
            setSelectedDepartment(renamingDepartmentName.trim());
            setRenameDeptDialogOpen(false);
            setRenamingDepartmentName('');
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
  }

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      await loadData();
      toast({ title: "Subject Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const openNewSubjectDialog = () => {
    setCurrentSubject({ type: 'theory', semester: 1, priority: 'High' });
    setSubjectDialogOpen(true);
  };
  
  const openRenameDialog = () => {
      if (selectedDepartment) {
          setRenamingDepartmentName(selectedDepartment);
          setRenameDeptDialogOpen(true);
      }
  }
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  const dept = selectedDepartment;
  const subjectsInDept = subjects.filter(s => s.department === dept);
  const classesInDept = classes.filter(c => c.department === dept);
  
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
             <div className="flex items-center gap-2">
                <Select value={selectedDepartment || ''} onValueChange={(val) => {setSelectedDepartment(val);}}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select a Department" />
                    </SelectTrigger>
                    <SelectContent>
                        {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={openRenameDialog} disabled={!selectedDepartment}>
                    <Pencil className="h-4 w-4" />
                </Button>
            </div>
            <Button onClick={() => setDeptDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Department
            </Button>
        </div>

       {selectedDepartment && dept && (
           <Card key={dept}>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className='space-y-1.5'>
                        <CardTitle className="flex items-center gap-2 text-2xl"><Building className="h-6 w-6" />{dept}</CardTitle>
                        <div className="flex flex-wrap gap-1">
                          {classesInDept.map(c => <Badge key={c.id} variant="secondary" className="mr-1">{c.name}</Badge>)}
                        </div>
                    </div>
                     <div className="flex flex-col sm:flex-row gap-2 self-start">
                        <Button onClick={openNewSubjectDialog} className="w-full sm:w-auto">
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Subject
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Subjects</h3>
                         <div className="border rounded-lg">
                            <ScrollArea className="h-96">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Semester</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead>Priority</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {subjectsInDept.length > 0 ? subjectsInDept.map((subject) => (
                                      <TableRow key={subject.id}>
                                        <TableCell>
                                          <div>{subject.name}</div>
                                          <div className="text-xs text-muted-foreground">{subject.code}</div>
                                        </TableCell>
                                        <TableCell>{subject.semester}</TableCell>
                                        <TableCell className='capitalize'>
                                            <Badge variant={subject.type.toLowerCase() === 'lab' ? 'secondary' : 'outline'} className="gap-1">
                                                {subject.type.toLowerCase() === 'lab' ? <Beaker className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                                                {subject.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {subject.type === 'theory' && (
                                                <Badge variant="outline">{subject.priority || 'High'}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setCurrentSubject(subject); setSubjectDialogOpen(true); }}>
                                                <Edit className="h-4 w-4 mr-2" /> Edit
                                              </DropdownMenuItem>
                                               <AlertDialog>
                                                  <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                                                  </AlertDialogTrigger>
                                                  <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteSubject(subject.id)}>Continue</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No subjects found for this department.</TableCell>
                                        </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
           </Card>
       )}

      {/* Subject Dialog */}
      <Dialog open={isSubjectDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) {setCurrentSubject({}); } setSubjectDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{currentSubject?.id ? 'Edit Subject' : 'Add Subject to ' + selectedDepartment}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" value={currentSubject.name ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })} disabled={isSubmitting}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-code">Code</Label>
              <Input id="s-code" value={currentSubject.code ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, code: e.target.value })} disabled={isSubmitting}/>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <Label htmlFor="s-type">Type</Label>
                <Select value={currentSubject.type} onValueChange={(v: 'theory' | 'lab') => setCurrentSubject({ ...currentSubject, type: v })}>
                    <SelectTrigger id="s-type"><SelectValue placeholder="Select type"/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="theory">Theory</SelectItem>
                        <SelectItem value="lab">Lab</SelectItem>
                    </SelectContent>
                </Select>
                </div>
                <div className="space-y-2">
                <Label htmlFor="s-semester">Semester</Label>
                <Input id="s-semester" type="number" min="1" max="8" value={currentSubject.semester ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, semester: parseInt(e.target.value) || 1 })} disabled={isSubmitting}/>
                </div>
            </div>
            {currentSubject.type === 'theory' && (
              <div className="space-y-2">
                <Label htmlFor="s-priority">Priority (Weekly Hours)</Label>
                <Select value={currentSubject.priority} onValueChange={(v: SubjectPriority) => setCurrentSubject({ ...currentSubject, priority: v })}>
                    <SelectTrigger id="s-priority"><SelectValue placeholder="Select priority"/></SelectTrigger>
                    <SelectContent>
                        {PRIORITY_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveSubject} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Department Dialog */}
      <Dialog open={isDeptDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setNewDepartmentName(''); setDeptDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Add New Department</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="dept-name">Department Name</Label>
                    <Input id="dept-name" value={newDepartmentName} onChange={(e) => setNewDepartmentName(e.target.value)} placeholder="e.g. Mechanical Engineering" disabled={isSubmitting}/>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setDeptDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleAddDepartment} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Department Dialog */}
      <Dialog open={isRenameDeptDialogOpen} onOpenChange={setRenameDeptDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Rename Department</DialogTitle>
                <DialogDescription>
                    This will update the department name for all associated classes, subjects, and faculty.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="new-dept-name">New Department Name</Label>
                    <Input id="new-dept-name" value={renamingDepartmentName} onChange={(e) => setRenamingDepartmentName(e.target.value)} placeholder="e.g. Mechanical Engineering" disabled={isSubmitting}/>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setRenameDeptDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleRenameDepartment} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Rename</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    