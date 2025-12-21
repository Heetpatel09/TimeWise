
'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '@/lib/services/subjects';
import { getClasses, addClass } from '@/lib/services/classes';
import { getFaculty, addFaculty, updateFaculty, deleteFaculty } from '@/lib/services/faculty';
import type { Subject, Class, Faculty } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, BookOpen, Building, UserCheck, Beaker, ChevronsUpDown, Check, Eye, EyeOff, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


const facultySchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    code: z.string().optional(),
    designation: z.string().optional(),
    employmentType: z.enum(['full-time', 'part-time', 'contract']),
    maxWeeklyHours: z.coerce.number().optional(),
    designatedYear: z.coerce.number().optional(),
    allottedSubjects: z.array(z.string()).optional(),
});

function MultiSelect({ options, selected, onSelect, placeholder }: { options: {value: string, label: string}[], selected: string[], onSelect: (selected: string[]) => void, placeholder: string }) {
  const [open, setOpen] = useState(false);

  const handleSelect = (currentValue: string) => {
    const newSelected = selected.includes(currentValue)
      ? selected.filter(v => v !== currentValue)
      : [...selected, currentValue];
    onSelect(newSelected);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className='truncate'>{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const DESIGNATION_OPTIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Lab Assistant'];
const YEAR_OPTIONS = [1, 2, 3, 4];

function FacultyForm({
  faculty,
  subjects,
  onSave,
  isSubmitting,
}: {
  faculty: Partial<Faculty>;
  subjects: Subject[];
  onSave: (data: z.infer<typeof facultySchema>, password?: string) => void;
  isSubmitting: boolean;
}) {
  const form = useForm<z.infer<typeof facultySchema>>({
    resolver: zodResolver(facultySchema),
    defaultValues: {
        ...faculty,
        allottedSubjects: faculty.allottedSubjects || [],
    },
  });

  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const subjectOptions = subjects.map(s => ({ value: s.id, label: `${s.name} (Sem ${s.semester})` }));

  const handleSubmit = (data: z.infer<typeof facultySchema>) => {
    if (!faculty.id && passwordOption === 'manual' && !manualPassword) {
      toast({ title: "Password Required", description: "Please enter a password for the new faculty member.", variant: "destructive" });
      return;
    }
    onSave(data, passwordOption === 'manual' ? manualPassword : undefined);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <ScrollArea className="max-h-[70vh] p-1">
          <div className="grid gap-4 py-4 pr-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                    <FormItem><FormLabel>Staff ID</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )}
                />
                 <FormField
                    control={form.control}
                    name="designation"
                    render={({ field }) => (
                        <FormItem><FormLabel>Designation</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                            <SelectTrigger><SelectValue placeholder="Select designation"/></SelectTrigger>
                         </FormControl><SelectContent>
                            {DESIGNATION_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent></Select>
                        <FormMessage /></FormItem>
                    )}
                    />
            </div>
            <FormField
                control={form.control}
                name="allottedSubjects"
                render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Allotted Subjects</FormLabel>
                    <MultiSelect options={subjectOptions} selected={field.value || []} onSelect={field.onChange} placeholder="Select subjects..." />
                    <FormMessage />
                    </FormItem>
                )}
                />
            <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="employmentType"
                    render={({ field }) => (
                        <FormItem><FormLabel>Employment Type</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl>
                            <SelectTrigger><SelectValue placeholder="Select type"/></SelectTrigger>
                         </FormControl><SelectContent>
                            <SelectItem value="full-time">Full-time</SelectItem>
                            <SelectItem value="part-time">Part-time</SelectItem>
                            <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent></Select>
                        <FormMessage /></FormItem>
                    )}
                    />
                <FormField
                    control={form.control}
                    name="designatedYear"
                    render={({ field }) => (
                        <FormItem><FormLabel>Designated Year</FormLabel>
                         <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value?.toString()}><FormControl>
                            <SelectTrigger><SelectValue placeholder="Select year"/></SelectTrigger>
                         </FormControl><SelectContent>
                            {YEAR_OPTIONS.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                        </SelectContent></Select>
                        <FormMessage /></FormItem>
                    )}
                    />
            </div>
             <FormField
                control={form.control}
                name="maxWeeklyHours"
                render={({ field }) => (
                    <FormItem><FormLabel>Max Weekly Hours</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>
                )}
                />
            {!faculty.id && (
                <>
                    <div className="space-y-2"><Label>Password</Label>
                    <RadioGroup value={passwordOption} onValueChange={(v: 'auto' | 'manual') => setPasswordOption(v)} className="flex gap-4 pt-2">
                        <div className="flex items-center space-x-2"><RadioGroupItem value="auto" id="auto-faculty" /><Label htmlFor="auto-faculty">Auto-generate</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="manual" id="manual-faculty" /><Label htmlFor="manual-faculty">Manual</Label></div>
                    </RadioGroup>
                    </div>
                    {passwordOption === 'manual' && (
                    <div className="space-y-2"><Label htmlFor="manual-password-faculty">Set Password</Label>
                        <div className="relative">
                            <Input id="manual-password-faculty" type={showPassword ? "text" : "password"} value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} className="pr-10" disabled={isSubmitting}/>
                            <Button type="button" variant="ghost" size="icon" className="absolute inset-y-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                        </div>
                    </div>
                    )}
                </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="mt-4 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => (document.querySelector('[cmdk-dialog-close-button]') as HTMLElement)?.click()} disabled={isSubmitting}>Cancel</Button>
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
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [isDeptDialogOpen, setDeptDialogOpen] = useState(false);
  const [isFacultyDialogOpen, setFacultyDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newFacultyCredentials, setNewFacultyCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);

  const [currentSubject, setCurrentSubject] = useState<Partial<Subject>>({});
  const [currentFaculty, setCurrentFaculty] = useState<Partial<Faculty>>({});
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);

  const [newDepartmentName, setNewDepartmentName] = useState('');
  
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
    if (currentSubject && currentSubject.name && currentSubject.code && currentSubject.type && currentSubject.semester && activeDepartment) {
      const subjectToSave = { ...currentSubject, department: activeDepartment };
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
        setActiveDepartment(null);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({ title: "Missing information", description: "Please fill out all subject fields.", variant: "destructive" });
    }
  };

  const handleSaveFaculty = async (data: z.infer<typeof facultySchema>, password?: string) => {
    if (activeDepartment) {
      const facultyToSave = { ...data, department: activeDepartment };
      setIsSubmitting(true);
      try {
        if (facultyToSave.id) {
            await updateFaculty(facultyToSave as Faculty);
            toast({ title: "Faculty Updated" });
        } else {
            const result = await addFaculty(facultyToSave as Omit<Faculty, 'id'>, password);
            toast({ title: "Faculty Added" });
            if(result.initialPassword) {
                setNewFacultyCredentials({ email: result.email, initialPassword: result.initialPassword });
            }
        }
        await loadData();
        setFacultyDialogOpen(false);
        setCurrentFaculty({});
        setActiveDepartment(null);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
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

  const handleDeleteSubject = async (id: string) => {
    try {
      await deleteSubject(id);
      await loadData();
      toast({ title: "Subject Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const handleDeleteFaculty = async (id: string) => {
    try {
      await deleteFaculty(id);
      await loadData();
      toast({ title: "Faculty Member Deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };
  
  const openNewSubjectDialog = (department: string) => {
    setActiveDepartment(department);
    setCurrentSubject({ type: 'theory', semester: 1 });
    setSubjectDialogOpen(true);
  };
  
  const openNewFacultyDialog = (department: string) => {
    setActiveDepartment(department);
    setCurrentFaculty({ employmentType: 'full-time', designation: 'Assistant Professor', designatedYear: 1 });
    setFacultyDialogOpen(true);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
  }

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
           const subjectsInDept = subjects.filter(s => s.department === dept);
           const facultyInDept = faculty.filter(f => f.department === dept);
           const classesInDept = classes.filter(c => c.department === dept);

           return (
           <Card key={dept}>
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className='space-y-1.5'>
                        <CardTitle className="flex items-center gap-2 text-2xl"><Building className="h-6 w-6" />{dept}</CardTitle>
                        <div className="flex flex-wrap gap-1">
                          {classesInDept.map(c => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={() => openNewSubjectDialog(dept)} className="w-full sm:w-auto">
                            <PlusCircle className="h-4 w-4 mr-2" /> Add Subject
                        </Button>
                        <Button onClick={() => openNewFacultyDialog(dept)} variant="outline" className="w-full sm:w-auto">
                            <UserCheck className="h-4 w-4 mr-2" /> Add Faculty
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">Subjects</h3>
                         <div className="border rounded-lg">
                            <ScrollArea className="h-72">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Semester</TableHead>
                                      <TableHead>Type</TableHead>
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
                                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setActiveDepartment(dept); setCurrentSubject(subject); setSubjectDialogOpen(true); }}>
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
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">No subjects found.</TableCell>
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
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {facultyInDept.length > 0 ? facultyInDept.map((fac) => (
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
                                        <TableCell className="text-right">
                                           <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setActiveDepartment(dept); setCurrentFaculty(fac); setFacultyDialogOpen(true); }}>
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
                                                        <AlertDialogAction onClick={() => handleDeleteFaculty(fac.id)}>Continue</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                  </AlertDialogContent>
                                              </AlertDialog>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </TableCell>
                                      </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No faculty found.</TableCell>
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
      <Dialog open={isSubjectDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) {setCurrentSubject({}); setActiveDepartment(null); } setSubjectDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{currentSubject?.id ? 'Edit Subject' : 'Add Subject to ' + activeDepartment}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="s-name">Name</Label>
              <Input id="s-name" value={currentSubject.name ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })} disabled={isSubmitting}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-code">Code</Label>
              <Input id="s-code" value={currentSubject.code ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, code: e.target.value })} disabled={isSubmitting}/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-type">Type</Label>
              <Input id="s-type" value={currentSubject.type ?? ''} placeholder="e.g. Theory, Lab" onChange={(e) => setCurrentSubject({ ...currentSubject, type: e.target.value })} disabled={isSubmitting}/>
            </div>
             <div className="space-y-2">
              <Label htmlFor="s-semester">Semester</Label>
              <Input id="s-semester" type="number" min="1" max="8" value={currentSubject.semester ?? ''} onChange={(e) => setCurrentSubject({ ...currentSubject, semester: parseInt(e.target.value) || 1 })} disabled={isSubmitting}/>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubjectDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSaveSubject} disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Faculty Dialog */}
      <Dialog open={isFacultyDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) {setCurrentFaculty({}); setActiveDepartment(null); } setFacultyDialogOpen(isOpen); }}>
        <DialogContent className="sm:max-w-2xl" cmdk-dialog-close-button="">
           <DialogHeader>
                <DialogTitle>{currentFaculty?.id ? `Edit ${currentFaculty.name}` : `Add Faculty to ${activeDepartment}`}</DialogTitle>
            </DialogHeader>
            <FacultyForm
                faculty={currentFaculty}
                subjects={subjects.filter(s => s.department === activeDepartment)}
                onSave={handleSaveFaculty}
                isSubmitting={isSubmitting}
            />
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

       <Dialog open={!!newFacultyCredentials} onOpenChange={() => setNewFacultyCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faculty Member Created</DialogTitle>
            <DialogDescription>
              Share the following credentials with the new faculty member so they can log in. The password is randomly generated for security if not specified.
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

    