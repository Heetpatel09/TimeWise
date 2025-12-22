
'use client';
import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFaculty, addFaculty, updateFaculty, deleteFaculty } from '@/lib/services/faculty';
import { getSubjects } from '@/lib/services/subjects';
import type { Faculty, Subject } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Copy, Eye, EyeOff, ChevronsUpDown, Check, X, Building } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


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


const DESIGNATION_OPTIONS = ['Professor', 'Assistant Professor', 'Lecturer'];
const YEAR_OPTIONS = [1, 2, 3, 4];
const DEPARTMENT_OPTIONS = ['Computer Engineering', 'IT', 'AI & DS', 'Electronics Engineering', 'Mechanical Engineering'];


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
                  <div
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
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUnselect(value);
                    }}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </div>
                </Badge>
              );
            })}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
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
}: {
  faculty: Partial<Faculty>;
  subjects: Subject[];
  onSave: (data: z.infer<typeof facultySchema>, password?: string) => void;
  onCancel: () => void;
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

  const subjectOptions = subjects.map(s => ({ value: s.id, label: `${s.name} (${s.code})` }));

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
        <ScrollArea className="max-h-[70vh] p-1">
          <div className="grid gap-4 py-4 pr-4">
             <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
             <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
            
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="code" render={({ field }) => (<FormItem><FormLabel>Staff ID</FormLabel><FormControl><Input {...field} disabled={isSubmitting} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="designation" render={({ field }) => (<FormItem><FormLabel>Designation</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select designation"/></SelectTrigger></FormControl><SelectContent>{DESIGNATION_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Specific Department</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select department"/></SelectTrigger></FormControl><SelectContent>{DEPARTMENT_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            
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


export default function FacultyManager() {
  const [allFaculty, setAllFaculty] = useState<Faculty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFaculty, setCurrentFaculty] = useState<Partial<Faculty>>({});
  const [newFacultyCredentials, setNewFacultyCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);
  const { toast } = useToast();

  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');

  const departments = useMemo(() => ['all', ...Array.from(new Set(allFaculty.map(f => f.department)))], [allFaculty]);

  async function loadData() {
    setIsLoading(true);
    try {
      const [facultyData, subjectData] = await Promise.all([getFaculty(), getSubjects()]);
      setAllFaculty(facultyData);
      setSubjects(subjectData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data: z.infer<typeof facultySchema>, password?: string) => {
      setIsSubmitting(true);
      try {
        const dataToSave = {...data, roles: []}; // Roles are not managed here
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
        setDialogOpen(false);
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
  }

  const handleEdit = (fac: Faculty) => {
    setCurrentFaculty(fac);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteFaculty(id);
      await loadData();
      toast({ title: "Faculty Deleted", description: "The faculty member has been removed." });
    } catch (error: any) {
       toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentFaculty({ employmentType: 'full-time' });
    setDialogOpen(true);
  };
  
  const filteredFaculty = useMemo(() => {
    return allFaculty.filter(f => {
        const departmentMatch = departmentFilter === 'all' || f.department === departmentFilter;
        const designationMatch = designationFilter === 'all' || f.designation === designationFilter;
        return departmentMatch && designationMatch;
    });
  }, [allFaculty, departmentFilter, designationFilter]);

  const facultyByDepartment = useMemo(() => {
    return filteredFaculty.reduce((acc, fac) => {
      if (!acc[fac.department]) {
        acc[fac.department] = [];
      }
      acc[fac.department].push(fac);
      return acc;
    }, {} as Record<string, Faculty[]>);
  }, [filteredFaculty]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className='space-y-6'>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className='flex gap-2'>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Department..."/></SelectTrigger>
                <SelectContent>{departments.map(d => <SelectItem key={d} value={d}>{d === 'all' ? 'All Departments' : d}</SelectItem>)}</SelectContent>
            </Select>
             <Select value={designationFilter} onValueChange={setDesignationFilter}>
                <SelectTrigger className="w-full sm:w-[200px]"><SelectValue placeholder="Filter by Designation..."/></SelectTrigger>
                <SelectContent>
                    <SelectItem value='all'>All Designations</SelectItem>
                    {DESIGNATION_OPTIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <Button onClick={openNewDialog} className="w-full sm:w-auto">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Faculty
        </Button>
      </div>

       {Object.keys(facultyByDepartment).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(facultyByDepartment).map(([department, faculty]) => (
                <Collapsible key={department} defaultOpen>
                    <Card>
                        <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Building className="h-5 w-5" /> 
                                    {department}
                                    <Badge variant="secondary" className="ml-2">{faculty.length} members</Badge>
                                    <ChevronsUpDown className="h-4 w-4 ml-auto text-muted-foreground" />
                                </CardTitle>
                            </CardHeader>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                             <CardContent>
                                <div className="border rounded-lg">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Staff ID</TableHead>
                                      <TableHead>Designation</TableHead>
                                      <TableHead>Subjects</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {faculty.map((fac) => (
                                      <TableRow key={fac.id}>
                                        <TableCell className="font-medium">
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
                                        <TableCell>{fac.code}</TableCell>
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
                                            <DropdownMenuTrigger asChild>
                                              <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleEdit(fac)}>
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
                                                        This action cannot be undone. This will permanently delete the faculty member and any associated schedule slots.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(fac.id)}>Continue</AlertDialogAction>
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
                            </CardContent>
                        </CollapsibleContent>
                    </Card>
                </Collapsible>
            ))}
          </div>
        ) : (
            <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No faculty members match the current filters.
                </CardContent>
            </Card>
       )}


      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentFaculty?.id ? 'Edit Faculty' : 'Add Faculty'}</DialogTitle>
            <DialogDescription>
              {currentFaculty?.id ? 'Update faculty details.' : 'Add a new faculty member.'}
            </DialogDescription>
          </DialogHeader>
          <FacultyForm
            faculty={currentFaculty}
            subjects={subjects}
            onSave={handleSave}
            onCancel={() => setDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
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
