
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getFees, addFee, updateFee, deleteFee } from '@/lib/services/fees';
import { getStudents } from '@/lib/services/students';
import type { EnrichedFee, Fee, Student } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';

const feeTypes: Fee['feeType'][] = ['tuition', 'hostel', 'transport', 'exams', 'fine', 'misc'];
const feeStatuses: Fee['status'][] = ['paid', 'unpaid', 'scholarship'];

export default function FeesManager() {
  const [fees, setFees] = useState<EnrichedFee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFee, setCurrentFee] = useState<Partial<Fee>>({ status: 'unpaid', feeType: 'tuition' });
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const [feeData, studentData] = await Promise.all([getFees(), getStudents()]);
      setFees(feeData);
      setStudents(studentData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (currentFee && currentFee.studentId && currentFee.amount && currentFee.dueDate && currentFee.status && currentFee.feeType && currentFee.semester) {
      setIsSubmitting(true);
      try {
        if (currentFee.id) {
          await updateFee(currentFee as Fee);
          toast({ title: "Fee Record Updated", description: "The fee details have been saved." });
        } else {
          await addFee(currentFee as Omit<Fee, 'id'>);
          toast({ title: "Fee Record Added", description: "The new fee record has been created." });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentFee({ status: 'unpaid', feeType: 'tuition' });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      toast({ title: "Missing Information", description: "Please fill out all fields.", variant: "destructive" });
    }
  };

  const handleEdit = (fee: EnrichedFee) => {
    setCurrentFee({
      ...fee,
      dueDate: format(parseISO(fee.dueDate), 'yyyy-MM-dd')
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFee(id);
      await loadData();
      toast({ title: "Fee Record Deleted", description: "The fee record has been removed." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };

  const openNewDialog = () => {
    setCurrentFee({ status: 'unpaid', feeType: 'tuition' });
    setDialogOpen(true);
  };

  const getStatusVariant = (status: Fee['status']) => {
    switch (status) {
      case 'paid': return 'default';
      case 'unpaid': return 'destructive';
      case 'scholarship': return 'secondary';
      default: return 'outline';
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={openNewDialog}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Fee Record
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Enrollment No.</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Fee Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fees.map((fee) => (
              <TableRow key={fee.id}>
                <TableCell className="font-medium">{fee.studentName}</TableCell>
                <TableCell>{fee.studentEnrollmentNumber}</TableCell>
                <TableCell>{fee.semester}</TableCell>
                <TableCell className='capitalize'>{fee.feeType}</TableCell>
                <TableCell>${fee.amount.toFixed(2)}</TableCell>
                <TableCell>{format(parseISO(fee.dueDate), 'PPP')}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(fee.status)} className="capitalize">{fee.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(fee)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the fee record.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(fee.id)}>Continue</AlertDialogAction></AlertDialogFooter>
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

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentFee?.id ? 'Edit Fee Record' : 'Add Fee Record'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={currentFee.studentId} onValueChange={(v) => setCurrentFee({ ...currentFee, studentId: v })} disabled={isSubmitting}>
                <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.enrollmentNumber})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input id="semester" type="number" value={currentFee.semester ?? ''} onChange={(e) => setCurrentFee({ ...currentFee, semester: parseInt(e.target.value) || undefined })} disabled={isSubmitting} />
                </div>
                <div className="space-y-2">
                  <Label>Fee Type</Label>
                  <Select value={currentFee.feeType} onValueChange={(v: Fee['feeType']) => setCurrentFee({ ...currentFee, feeType: v })} disabled={isSubmitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {feeTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" value={currentFee.amount ?? ''} onChange={(e) => setCurrentFee({ ...currentFee, amount: parseFloat(e.target.value) || 0 })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={currentFee.dueDate ?? ''} onChange={(e) => setCurrentFee({ ...currentFee, dueDate: e.target.value })} disabled={isSubmitting} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={currentFee.status} onValueChange={(v: Fee['status']) => setCurrentFee({ ...currentFee, status: v })} disabled={isSubmitting}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {feeStatuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
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
