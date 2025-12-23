
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '@/lib/services/subjects';
import { getClasses, addClass, renameDepartment } from '@/lib/services/classes';
import { getFaculty, addFaculty, updateFaculty, deleteFaculty } from '@/lib/services/faculty';
import type { Subject, Class, Faculty, SubjectPriority } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, BookOpen, Building, Beaker, Pencil, ChevronsUpDown, Check, X, Eye, EyeOff, Copy, UserCheck } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const PRIORITY_OPTIONS: SubjectPriority[] = ['Non Negotiable', 'High', 'Medium', 'Low'];
const DESIGNATION_OPTIONS = ['Professor', 'Assistant Professor', 'Lecturer'];
const YEAR_OPTIONS = [1, 2, 3, 4];

const facultySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    code: z.string().min(1, "Staff ID is required"),
    department: z.string().min(1, "Department is required"),
    designation: z.string().min(1, "Designation is required"),
    employmentType: z.enum(['full-time', 'part-time', 'contract']),
    maxWeeklyHours: z.coerce.number().min(1, "Required").max(48, "Cannot exceed 48"),
    designatedYear: z.coerce.number().min(1, "Required"),
    allottedSubjects: z.array(z.string()).optional(),
});

function MultiSelectSubjects({
  options,
  selected,
  onChange,
  className,
  placeholder = "Select subjects...",
}: {
  options: { label: string; value: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-auto min-h-10", className)}
          onClick={() => setOpen(!open)}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length === 0 && <span className="text-muted-foreground">{placeholder}</span>}
            {selected.map((value) => {
              const label = options.find((o) => o.value === value)?.label;
              return (
                <Badge
                  key={value}
                  variant="secondary"
                  className="mr-1"
                >
                  {label}
                   <button
                    type="button"
                    className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleUnselect(value);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={() => handleUnselect(value)}
                   >
                     <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                   </button>
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <ScrollArea className="max-h-72">
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((s) => s !== option.value)
                        : [...selected, option.value]
                    );
                    setOpen(true);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
};


function FacultyForm({
  faculty,
  subjects,
  onSave,
  onCancel,
  isSubmitting,
  department,
}: {
  faculty: Partial<Faculty>;
  subjects: Subject[];
  onSave: (data: z.infer<typeof facultySchema>, password?: string) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  department: string;
}) {
  const form = useForm<z.infer<typeof facultySchema>>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
        ...faculty,
        department: department,
        allottedSubjects: faculty.allottedSubjects || [],
        maxWeeklyHours: faculty.maxWeeklyHours || 20,
    },
  });

  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [subjectSemesterFilter, setSubjectSemesterFilter] = useState<string>('all');
  
  const subjectOptions = useMemo(() => {
    return subjects
        .filter(s => subjectSemesterFilter === 'all' || s.semester.toString() === subjectSemesterFilter)
        .map(s => ({ value: s.id, label: `${s.name} (Sem ${s.semester})` }));
  }, [subjects, subjectSemesterFilter]);
  
  const semesterOptions = useMemo(() => {
    const semesters = new Set(subjects.map(s => s.semester));
    return ['all', ...Array.from(semesters).sort((a,b) => a-b).map(String)];
  }, [subjects]);


  const handleSubmit = (data: z.infer<typeof facultySchema>) => {
    if (!faculty.id && passwordOption === 'manual' && !manualPassword) {
      toast({ title: "Password Required", description: "Please enter a password for the new faculty member.", variant: "destructive" });
      return;
    }
    
    const { maxWeeklyHours, employmentType } = data;
    if (employmentType === 'part-time' && (maxWeeklyHours! < 15 || maxWeeklyHours! > 30)) {
        form.setError('maxWeeklyHours', { message: 'Part-time hours must be between 15 and 30.'});
        return;
    }

    onSave(data, passwordOption === 'manual' ? manualPassword : undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <ScrollArea className="max-h-[65vh] p-1 pr-4">
        <div className="grid gap-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
        
            <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Staff ID</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Designation</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select designation"/></SelectTrigger></FormControl><SelectContent>{DESIGNATION_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
        </div>

        <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Input {...field} disabled={true} /><FormMessage /></FormItem>)} />
        
        <div className="space-y-2">
            <Label>Filter Subjects by Semester</Label>
             <Select value={subjectSemesterFilter} onValueChange={setSubjectSemesterFilter}>
                <SelectTrigger><SelectValue placeholder="Select Semester"/></SelectTrigger>
                <SelectContent>
                    {semesterOptions.map(sem => <SelectItem key={sem} value={sem}>{sem === 'all' ? 'All Semesters' : `Semester ${sem}`}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>

        <FormField
            control={form.control}
            name="allottedSubjects"
            render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Subject(s) to be Allotted</FormLabel>
                <MultiSelectSubjects
                    options={subjectOptions}
                    selected={field.value || []}
                    onChange={field.onChange}
                />
                <FormMessage />
                </FormItem>
            )}
            />

        <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="designatedYear" render={({ field }) => (<FormItem><FormLabel>Designated Year</FormLabel><Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}><FormControl><SelectTrigger><SelectValue placeholder="Select year"/></SelectTrigger></FormControl><SelectContent>{YEAR_OPTIONS.map(y => <SelectItem key={y} value={y.toString()}>Year {y}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="employmentType" render={({ field }) => (<FormItem><FormLabel>Employment Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger></FormControl><SelectContent><SelectItem value="full-time">Full-time</SelectItem><SelectItem value="part-time">Part-time</SelectItem><SelectItem value="contract">Contract</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
        </div>

            <FormField control={form.control} name="maxWeeklyHours" render={({ field }) => (<FormItem><FormLabel>Max Working Hours</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value) || 0)} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />

        {!faculty.id && (
            <>
                <div className="space-y-2"><Label>Password</Label>
                <RadioGroup value={passwordOption} onValueChange={(v: 'auto' | 'manual') => setPasswordOption(v)} className="flex gap-4 pt-2">
                    <div className="flex items-center space-x-2"><RadioGroupItem value="auto" id="auto-faculty" /><Label htmlFor="auto-faculty">Auto-generate</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="manual" id="manual-faculty" /><Label htmlFor="manual-faculty">Manual</Label></div>
                </RadioGroup>
                </div>
                {passwordOption === 'manual' && (
                  <div className="space-y-2">
                      <Label htmlFor="manual-password">Set Password</Label>
                      <div className="relative">
                          <Input 
                              id="manual-password" 
                              type={showPassword ? "text" : "password"}
                              value={manualPassword} 
                              onChange={(e) => setManualPassword(e.target.value)} 
                              className="pr-10"
                              disabled={isSubmitting}
                          />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute inset-y-0 right-0 h-full px-3"
                              onClick={() => setShowPassword(!showPassword)}
                              >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                      </div>
                  </div>
              )}
            </>
        )}
        </div>
        </ScrollArea>
        <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
        </DialogFooter>
      </form>
    </Form>
  )
}


export default function DepartmentsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isSubjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [isDeptDialogOpen, setDeptDialogOpen] = useState(false);
  const [isFacultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const [currentFaculty, setCurrentFaculty] = useState<Partial<Faculty>>({});
  const [newFacultyCredentials, setNewFacultyCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);

  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isRenameDeptDialogOpen, setRenameDeptDialogOpen] = useState(false);
  const [renamingDepartmentName, setRenamingDepartmentName] = useState('');
  
  const { toast } = useToast();

  const departments = useMemo(() => Array.from(new Set(classes.map(c => c.department))), [classes]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [subjectData, classData, facultyData] = await Promise.all([getSubjects(), getClasses(), getFaculty()]);
      setSubjects(subjectData);
      setClasses(classData);
      setAllFaculty(facultyData);
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

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      await loadData();
      toast({ title: "Subject Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const handleSaveFaculty = async (data: z.infer<typeof facultySchema>, password?: string) => {
      setIsSubmitting(true);
      try {
        const dataToSave = {...data, roles: []};
        if (dataToSave.id) {
          await updateFaculty(dataToSave as Faculty);
          toast({ title: "Faculty Updated", description: "The faculty member's details have been saved." });
        } else {
          const result = await addFaculty(dataToSave, password);
          toast({ title: "Faculty Added", description: "The new faculty member has been created." });
          if (result.initialPassword) {
            setNewFacultyCredentials({ email: result.email, initialPassword: result.initialPassword });
          }
        }
        await loadData();
        setFacultyDialogOpen(false);
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };

  const handleDeleteFaculty = async (id: string) => {
    try {
      await deleteFaculty(id);
      await loadData();
      toast({ title: "Faculty Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  const openNewSubjectDialog = () => {
    setCurrentSubject({ type: 'theory', semester: 1, priority: 'High' });
    setSubjectDialogOpen(true);
  };
  
  const openNewFacultyDialog = () => {
    setCurrentFaculty({ employmentType: 'full-time' });
    setFacultyDialogOpen(true);
  };
  
  const openEditFacultyDialog = (faculty: Faculty) => {
    setCurrentFaculty(faculty);
    setFacultyDialogOpen(true);
  };
  
  const openRenameDialog = () => {
      if (selectedDepartment) {
          setRenamingDepartmentName(selectedDepartment);
          setRenameDeptDialogOpen(true);
      }
  }

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
  }

  const dept = selectedDepartment;
  const subjectsInDept = subjects.filter(s => s.department === dept && (semesterFilter === 'all' || s.semester.toString() === semesterFilter));
  const facultyInDept = allFaculty.filter(f => f.department === dept);
  const classesInDept = classes.filter(c => c.department === dept);
  
  const semesterOptions = useMemo(() => {
    if (!dept) return [];
    const semesters = new Set(subjects.filter(s => s.department === dept).map(s => s.semester));
    return ['all', ...Array.from(semesters).sort((a,b) => a-b).map(String)];
  }, [subjects, dept]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  
  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
             <div className="flex items-center gap-2">
                <Select value={selectedDepartment || ''} onValueChange={(val) => {setSelectedDepartment(val)}}>
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
                </CardHeader>
                <CardContent>
                    <div className='flex justify-end gap-2 mb-4'>
                        <Button onClick={openNewSubjectDialog} className="w-full sm:w-auto">
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Subject
                        </Button>
                        <Button onClick={openNewFacultyDialog} className="w-full sm:w-auto">
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Faculty
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* Subjects Section */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen/> Subjects</h3>
                                <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by Semester"/></SelectTrigger>
                                    <SelectContent>
                                        {semesterOptions.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Semesters' : `Semester ${s}`}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
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
                                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No subjects found for this department/semester.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>
                        </div>

                        {/* Faculty Section */}
                        <div>
                             <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><UserCheck/> Faculty</h3>
                             <div className="border rounded-lg">
                                 <ScrollArea className="h-96">
                                     <Table>
                                         <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Designation</TableHead><TableHead>Subjects</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                         <TableBody>
                                             {facultyInDept.length > 0 ? facultyInDept.map(fac => (
                                                 <TableRow key={fac.id}>
                                                     <TableCell>
                                                         <div className="flex items-center gap-3">
                                                            <Avatar>
                                                                <AvatarImage src={fac.avatar} alt={fac.name} />
                                                                <AvatarFallback>{fac.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-bold">{fac.name}</div>
                                                                <div className="text-sm text-muted-foreground">{fac.email}</div>
                                                            </div>
                                                         </div>
                                                     </TableCell>
                                                     <TableCell>{fac.designation}</TableCell>
                                                     <TableCell>
                                                         <div className="flex flex-wrap gap-1">
                                                              {fac.allottedSubjects?.slice(0, 2).map(subId => {
                                                                  const subject = subjects.find(s => s.id === subId);
                                                                  return subject ? <Badge key={subId} variant="outline">{subject.code}</Badge> : null;
                                                              })}
                                                              {fac.allottedSubjects && fac.allottedSubjects.length > 2 && (
                                                                  <Badge variant="outline">+{fac.allottedSubjects.length - 2} more</Badge>
                                                              )}
                                                         </div>
                                                     </TableCell>
                                                     <TableCell className="text-right">
                                                         <DropdownMenu>
                                                             <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                             <DropdownMenuContent>
                                                                 <DropdownMenuItem onClick={() => openEditFacultyDialog(fac)}><Edit className="h-4 w-4 mr-2"/>Edit</DropdownMenuItem>
                                                                  <AlertDialog>
                                                                    <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the faculty member.</AlertDialogDescription></AlertDialogHeader>
                                                                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteFaculty(fac.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                 </AlertDialog>
                                                             </DropdownMenuContent>
                                                         </DropdownMenu>
                                                     </TableCell>
                                                 </TableRow>
                                             )) : (
                                                 <TableRow><TableCell colSpan={4} className="h-24 text-center text-muted-foreground">No faculty found in this department.</TableCell></TableRow>
                                             )}
                                         </TableBody>
                                     </Table>
                                 </ScrollArea>
                             </div>
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

      {/* Faculty Dialog */}
      <Dialog open={isFacultyDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setCurrentFaculty({}); setFacultyDialogOpen(isOpen); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentFaculty?.id ? 'Edit Faculty' : 'Add Faculty'}</DialogTitle>
            <DialogDescription>
              {currentFaculty?.id ? 'Update faculty details.' : `Add a new faculty member to the ${selectedDepartment} department.`}
            </DialogDescription>
          </DialogHeader>
            <FacultyForm
              faculty={currentFaculty}
              subjects={subjects.filter(s => s.department === selectedDepartment)}
              onSave={handleSaveFaculty}
              onCancel={() => setFacultyDialogOpen(false)}
              isSubmitting={isSubmitting}
              department={selectedDepartment!}
            />
        </DialogContent>
      </Dialog>
      
      {/* New Faculty Credentials Dialog */}
       <Dialog open={!!newFacultyCredentials} onOpenChange={() => setNewFacultyCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faculty Member Created</DialogTitle>
            <DialogDescription>
              Share the following credentials with the new faculty member so they can log in. The password is temporary.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTitle>Login Credentials</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <div>
                    <Label>Email</Label>
                    <Input readOnly value={newFacultyCredentials?.email ?? ''} />
                  </div>
                  {newFacultyCredentials?.initialPassword && (
                    <div>
                        <Label>Initial Password</Label>
                        <div className="flex items-center gap-2">
                        <Input readOnly type="text" value={newFacultyCredentials?.initialPassword ?? ''} />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(newFacultyCredentials?.initialPassword || '')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-2">The faculty member will be required to change this password on their first login.</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewFacultyCredentials(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    