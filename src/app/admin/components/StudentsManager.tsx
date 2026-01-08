
'use client';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudents, addStudent, updateStudent, deleteStudent } from '@/lib/services/students';
import { getClasses } from '@/lib/services/classes';
import { getAllAttendanceRecords } from '@/lib/services/attendance';
import type { Student, Class, EnrichedAttendance } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Copy, Eye, EyeOff, FilterX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<EnrichedAttendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [newStudentCredentials, setNewStudentCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);
  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const [filters, setFilters] = useState({
    department: 'all',
    semester: 'all',
    classId: 'all',
    batch: 'all',
  });

  async function loadData() {
    setIsLoading(true);
    try {
      const [studentData, classData, attendanceData] = await Promise.all([getStudents(), getClasses(), getAllAttendanceRecords()]);
      setStudents(studentData);
      setClasses(classData);
      setAttendanceRecords(attendanceData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    loadData();
  }, []);

  const departments = useMemo(() => ['all', ...Array.from(new Set(classes.map(c => c.department)))], [classes]);
  const semesters = useMemo(() => ['all', ...Array.from(new Set(classes.map(c => c.semester.toString()))).sort((a,b) => parseInt(a) - parseInt(b))], [classes]);
  const batches = useMemo(() => ['all', ...Array.from(new Set(students.map(s => s.batch.toString()))).sort()], [students]);
  
  const filteredClasses = useMemo(() => {
    let tempClasses = classes;
    if (filters.department !== 'all') {
      tempClasses = tempClasses.filter(c => c.department === filters.department);
    }
    if (filters.semester !== 'all') {
      tempClasses = tempClasses.filter(c => c.semester.toString() === filters.semester);
    }
    return tempClasses;
  }, [classes, filters.department, filters.semester]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
        const studentClass = classes.find(c => c.id === student.classId);
        if (!studentClass) return false;
        
        if (filters.department !== 'all' && studentClass.department !== filters.department) return false;
        if (filters.semester !== 'all' && studentClass.semester.toString() !== filters.semester) return false;
        if (filters.classId !== 'all' && student.classId !== filters.classId) return false;
        if (filters.batch !== 'all' && student.batch.toString() !== filters.batch) return false;
        
        return true;
    });
  }, [students, classes, filters]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, [filterName]: value };
      // Reset dependent filters
      if (filterName === 'department') {
        newFilters.semester = 'all';
        newFilters.classId = 'all';
      }
      if (filterName === 'semester') {
        newFilters.classId = 'all';
      }
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      department: 'all',
      semester: 'all',
      classId: 'all',
      batch: 'all',
    });
  }

  const studentAttendanceStats = useMemo(() => {
    const stats: Record<string, { present: number, total: number, percentage: number }> = {};
    students.forEach(student => {
        const studentRecords = attendanceRecords.filter(rec => rec.studentId === student.id);
        const presentCount = studentRecords.filter(rec => rec.status === 'present').length;
        const totalCount = studentRecords.length;
        stats[student.id] = {
            present: presentCount,
            total: totalCount,
            percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0
        };
    });
    return stats;
  }, [students, attendanceRecords]);


  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
  }

  const handleSave = async () => {
    if (currentStudent && currentStudent.classId && currentStudent.name && currentStudent.email && currentStudent.enrollmentNumber) {
       if (!currentStudent.id && passwordOption === 'manual' && !manualPassword) {
        toast({ title: "Password Required", description: "Please enter a password for the new student.", variant: "destructive" });
        return;
      }
      setIsSubmitting(true);
      try {
        if (currentStudent.id) {
          await updateStudent(currentStudent as Student);
          toast({ title: "Student Updated", description: "The student's details have been saved." });
        } else {
          const result = await addStudent(
            currentStudent as Omit<Student, 'id'>,
            passwordOption === 'manual' ? manualPassword : undefined
            );
          toast({ title: "Student Added", description: "The new student has been added." });
          if (result.initialPassword) {
            setNewStudentCredentials({ email: result.email, initialPassword: result.initialPassword });
          }
        }
        await loadData();
        setDialogOpen(false);
        setCurrentStudent({});
        setPasswordOption('auto');
        setManualPassword('');
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
        toast({ title: "Missing Information", description: "Please fill all the fields.", variant: "destructive" });
    }
  };

  const handleEdit = (student: Student) => {
    setCurrentStudent(student);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteStudent(id);
      await loadData();
      toast({ title: "Student Deleted", description: "The student has been removed." });
    } catch (error: any) {
       toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentStudent({});
    setPasswordOption('auto');
    setManualPassword('');
    setDialogOpen(true);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Select value={filters.department} onValueChange={(v) => handleFilterChange('department', v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>{departments.map(d => <SelectItem key={d} value={d} className="capitalize">{d === 'all' ? 'All Departments' : d}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.semester} onValueChange={(v) => handleFilterChange('semester', v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>{semesters.map(s => <SelectItem key={s} value={s}>{s === 'all' ? 'All Semesters' : `Semester ${s}`}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filters.classId} onValueChange={(v) => handleFilterChange('classId', v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {filteredClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.batch} onValueChange={(v) => handleFilterChange('batch', v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Year/Batch" /></SelectTrigger>
            <SelectContent>{batches.map(b => <SelectItem key={b} value={b}>{b === 'all' ? 'All Years' : b}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="ghost" onClick={resetFilters}><FilterX className="mr-2 h-4 w-4" /> Reset</Button>
        </CardContent>
      </Card>
      <div className="flex justify-end mb-4">
        <Button onClick={openNewDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Enrollment No.</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>CGPA</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStudents.map((student) => {
              const attendance = studentAttendanceStats[student.id];
              const className = classes.find(c => c.id === student.classId)?.name || 'N/A';
              return (
              <TableRow key={student.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-bold">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{student.enrollmentNumber}</TableCell>
                <TableCell>{className}</TableCell>
                <TableCell>{student.cgpa.toFixed(2)}</TableCell>
                <TableCell>
                  {attendance && attendance.total > 0 ? (
                    <div className="flex items-center gap-2">
                        <span className="font-medium">{attendance.percentage.toFixed(0)}%</span>
                        <Progress value={attendance.percentage} className="w-20 h-2" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-xs">No records</span>
                  )}
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
                      <DropdownMenuItem onClick={() => handleEdit(student)}>
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
                                This action cannot be undone. This will permanently delete the student's record.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(student.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            setCurrentStudent({});
            setManualPassword('');
            setPasswordOption('auto');
        }
        setDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentStudent?.id ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {currentStudent?.id ? 'Update student details.' : 'Add a new student.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={currentStudent.name ?? ''} onChange={(e) => setCurrentStudent({ ...currentStudent, name: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={currentStudent.email ?? ''} onChange={(e) => setCurrentStudent({ ...currentStudent, email: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="enrollmentNumber">Enrollment Number</Label>
              <Input id="enrollmentNumber" value={currentStudent.enrollmentNumber ?? ''} onChange={(e) => setCurrentStudent({ ...currentStudent, enrollmentNumber: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select value={currentStudent?.classId || ''} onValueChange={(value) => setCurrentStudent({ ...currentStudent, classId: value })} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!currentStudent.id && (
              <>
                <div className="space-y-2">
                   <Label>Password</Label>
                   <RadioGroup value={passwordOption} onValueChange={(v: 'auto' | 'manual') => setPasswordOption(v)} className="flex gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="auto" id="auto-student" />
                        <Label htmlFor="auto-student">Auto-generate</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manual" id="manual-student" />
                        <Label htmlFor="manual-student">Manual</Label>
                      </div>
                   </RadioGroup>
                </div>
                 {passwordOption === 'manual' && (
                    <div className="space-y-2">
                        <Label htmlFor="manual-password-student">Set Password</Label>
                        <div className="relative">
                            <Input 
                                id="manual-password-student" 
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={!!newStudentCredentials} onOpenChange={() => setNewStudentCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Student Created</DialogTitle>
            <DialogDescription>
              Share the following credentials with the new student so they can log in. The password is randomly generated for security if not specified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTitle>Login Credentials</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <div>
                    <Label>Email</Label>
                    <Input readOnly value={newStudentCredentials?.email ?? ''} />
                  </div>
                   {newStudentCredentials?.initialPassword && (
                    <div>
                        <Label>Initial Password</Label>
                        <div className="flex items-center gap-2">
                        <Input readOnly type="text" value={newStudentCredentials?.initialPassword ?? ''} />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(newStudentCredentials?.initialPassword || '')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                   )}
                  <p className="text-xs text-muted-foreground pt-2">The student will be required to change this password on their first login.</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewStudentCredentials(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
