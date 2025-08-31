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
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function SubjectsManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<Partial<Subject> | null>(null);
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
        setCurrentSubject(null);
      } catch (error) {
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
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
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentSubject({});
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.name}</TableCell>
                <TableCell>{subject.code}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleDelete(subject.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentSubject?.id ? 'Edit Subject' : 'Add Subject'}</DialogTitle>
            <DialogDescription>
              {currentSubject?.id ? 'Update the details of the subject.' : 'Add a new subject to the system.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={currentSubject?.name || ''}
                onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                className="col-span-3"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Code
              </Label>
              <Input
                id="code"
                value={currentSubject?.code || ''}
                onChange={(e) => setCurrentSubject({ ...currentSubject, code: e.target.value })}
                className="col-span-3"
                disabled={isSubmitting}
              />
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
