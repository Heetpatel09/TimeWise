
'use client';
import { useState, useEffect, useMemo } from 'react';
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
import { getClasses, addClass } from '@/lib/services/classes';
import { getFaculty, addFaculty } from '@/lib/services/faculty';
import type { Subject, Class, Faculty } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Star, Beaker, BookOpen, Building, UserCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function DepartmentsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isDeptDialogOpen, setDeptDialogOpen] = useState(false);
  const [isFacultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const [currentFaculty, setCurrentFaculty] = useState<Partial<Faculty>>({});

  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<Record<string, string | null>>({});

  const { toast } = useToast();

  const departments = Array.from(new Set(classes.map(c => c.department)));

  async function loadData() {
    setIsLoading(true);
    try {
      const [subjectData, classData, facultyData] = await Promise.all([getSubjects(), getClasses(), getFaculty()]);
      setSubjects(subjectData);
      setClasses(classData);
      setFaculty(facultyData);
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
    if (currentSubject && currentSubject.department) {
      setIsSubmitting(true);
      try {
        if (currentSubject.id) {
          await updateSubject(currentSubject as Subject);
          toast({ title: "Subject Updated" });
        } else {
          await addSubject(currentSubject as Omit<Subject, 'id'>);
          toast({ title: "Subject Added" });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentSubject({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({ title: "Department is required", description: "Please select a department for the subject.", variant: "destructive" });
    }
  };

  const handleSaveFaculty = async () => {
    if (currentFaculty && currentFaculty.department) {
      setIsSubmitting(true);
      try {
          await addFaculty(currentFaculty as Omit<Faculty, 'id'>);
          toast({ title: "Faculty Added", description: "The new faculty member has been created." });
        await loadData();
        setFacultyDialogOpen(false);
        setCurrentFaculty({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
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
                name: `${newDepartmentName.trim()} Placeholder`,
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

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      await loadData();
      toast({ title: "Subject Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const openNewSubjectDialog = (department: string, semester?: number) => {
    setCurrentSubject({ type: 'Theory', semester: semester || 1, department });
    setDialogOpen(true);
  };
  
  const openNewFacultyDialog = (department: string) => {
    setCurrentFaculty({ department, employmentType: 'full-time' });
    setFacultyDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-end items-center">
            <Button onClick={() => setDeptDialogOpen(true)}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Department
            </Button>
        </div>
       {departments.map(dept => {
           const classesInDept = classes.filter(c => c.department === dept);
           const facultyInDept = faculty.filter(f => f.department === dept);
           const selectedClassId = selectedClasses[dept];
           const selectedClass = classesInDept.find(c => c.id === selectedClassId);
           const subjectsInClass = selectedClass ? subjects.filter(s => s.department === dept && s.semester === selectedClass.semester) : [];

           return (
           <Card key={dept}>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className='space-y-1.5'>
                        <CardTitle className="flex items-center gap-2 text-2xl"><Building className="h-6 w-6" />{dept}</CardTitle>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Select onValueChange={(value) => setSelectedClasses(prev => ({...prev, [dept]: value}))}>
                            <SelectTrigger className="w-full sm:w-[220px]">
                                <SelectValue placeholder="Select a class..." />
                            </SelectTrigger>
                            <SelectContent>
                                {classesInDept.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => openNewSubjectDialog(dept, selectedClass?.semester)} className="w-full sm:w-auto">
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Subject
                        </Button>
                        <Button onClick={() => openNewFacultyDialog(dept)} variant="outline" className="w-full sm:w-auto">
                            <UserCheck className="h-4 w-4 mr-2" /> Add Faculty
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Subjects {selectedClass ? `for ${selectedClass.name}` : ''}</h3>
                         <div className="border rounded-lg">
                            <ScrollArea className="h-72">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Type</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {subjectsInClass.length > 0 ? subjectsInClass.map((subject) => (
                                      <TableRow key={subject.id}>
                                        <TableCell>
                                            <div>{subject.name}</div>
                                            <div className="text-xs text-muted-foreground">{subject.code}</div>
                                        </TableCell>
                                        <TableCell className='capitalize'>
                                            <Badge variant={'outline'} className="gap-1">
                                                {subject.type === 'Lab' ? <Beaker className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                                                {subject.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => { setCurrentSubject(subject); setDialogOpen(true); }}>
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
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">{selectedClassId ? 'No subjects found for this class.' : 'Select a class to view subjects.'}</TableCell>
                                        </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold mb-2">Faculty Members</h3>
                         <div className="border rounded-lg">
                            <ScrollArea className="h-72">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Designation</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {facultyInDept.length > 0 ? facultyInDept.map((fac) => (
                                      <TableRow key={fac.id}>
                                        <TableCell>
                                            <div>{fac.name}</div>
                                            <div className="text-xs text-muted-foreground">{fac.email}</div>
                                        </TableCell>
                                        <TableCell>{fac.designation}</TableCell>
                                      </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">No faculty found for this department.</TableCell>
                                        </TableRow>
                                    )}
                                  </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
           </Card>
       )})}

      {/* Subject Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setCurrentSubject({}); setDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{currentSubject?.id ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
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
                  <Label htmlFor="s-semester">Semester</Label>
                  <Input id="s-semester" type="number" min="1" max="8" value={currentSubject.semester ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, semester: parseInt(e.target.value) || 1 })} disabled={isSubmitting}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-type">Type</Label>
                  <Input id="s-type" value={currentSubject.type ?? ''} placeholder="e.g. Theory, Lab" onChange={(e) => setCurrentSubject({ ...currentSubject, type: e.target.value })} disabled={isSubmitting}/>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveSubject} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Faculty Dialog */}
      <Dialog open={isFacultyDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setCurrentFaculty({}); setFacultyDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Faculty to {currentFaculty.department}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="f-name">Name</Label>
                <Input id="f-name" value={currentFaculty.name ?? ''} onChange={(e) => setCurrentFaculty({ ...currentFaculty, name: e.target.value })} disabled={isSubmitting}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-email">Email</Label>
                <Input id="f-email" type="email" value={currentFaculty.email ?? ''} onChange={(e) => setCurrentFaculty({ ...currentFaculty, email: e.target.value })} disabled={isSubmitting}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-designation">Designation</Label>
                <Input id="f-designation" value={currentFaculty.designation ?? ''} onChange={(e) => setCurrentFaculty({ ...currentFaculty, designation: e.target.value })} disabled={isSubmitting}/>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFacultyDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveFaculty} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
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
    </div>
  );
}
