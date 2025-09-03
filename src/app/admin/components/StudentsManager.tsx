
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStudents, addStudent, updateStudent, deleteStudent } from '@/lib/services/students';
import { getClasses } from '@/lib/services/classes';
import type { Student, Class } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Copy, Eye, EyeOff } from 'lucide-react';
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

export default function StudentsManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<Partial<Student>>({});
  const [newStudentCredentials, setNewStudentCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);
  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const [studentData, classData] = await Promise.all([getStudents(), getClasses()]);
      setStudents(studentData);
      setClasses(classData);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    loadData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
  }

  const handleSave = async () => {
    if (currentStudent && currentStudent.classId) {
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
          setNewStudentCredentials({ email: result.email, initialPassword: result.initialPassword });
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
        toast({ title: "Missing Information", description: "Please select a class for the student.", variant: "destructive" });
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

  const getStudentClassInfo = (classId: string) => {
    return classes.find(c => c.id === classId) || null;
  }
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
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
              <TableHead>Class</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Streak</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const classInfo = getStudentClassInfo(student.classId);
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
                <TableCell>{classInfo?.name || 'N/A'}</TableCell>
                <TableCell>{classInfo?.semester || 'N/A'}</TableCell>
                <TableCell>{student.streak}</TableCell>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentStudent?.id ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {currentStudent?.id ? 'Update student details.' : 'Add a new student.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={currentStudent.name ?? ''} onChange={(e) => setCurrentStudent({ ...currentStudent, name: e.target.value })} className="col-span-3" disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={currentStudent.email ?? ''} onChange={(e) => setCurrentStudent({ ...currentStudent, email: e.target.value })} className="col-span-3" disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">Class</Label>
              <Select value={currentStudent?.classId || ''} onValueChange={(value) => setCurrentStudent({ ...currentStudent, classId: value })} disabled={isSubmitting}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {!currentStudent.id && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                   <Label className="text-right">Password</Label>
                   <RadioGroup value={passwordOption} onValueChange={(v: 'auto' | 'manual') => setPasswordOption(v)} className="col-span-3 flex gap-4">
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="manual-password-student" className="text-right">Set Password</Label>
                        <div className="col-span-3 relative">
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
                    <Input readOnly value={newStudentCredentials?.email} />
                  </div>
                   {newStudentCredentials?.initialPassword && (
                    <div>
                        <Label>Initial Password</Label>
                        <div className="flex items-center gap-2">
                        <Input readOnly type="text" value={newStudentCredentials?.initialPassword} />
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
