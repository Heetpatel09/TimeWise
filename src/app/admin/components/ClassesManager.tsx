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
import { getClasses, addClass, updateClass, deleteClass } from '@/lib/services/classes';
import type { Class } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

export default function ClassesManager() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentClass, setCurrentClass] = useState<Partial<Class> | null>(null);
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await getClasses();
      setClasses(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load classes.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (currentClass) {
      setIsSubmitting(true);
      try {
        if (currentClass.id) {
          await updateClass(currentClass as Class);
          toast({ title: "Class Updated", description: "The class details have been saved." });
        } else {
          await addClass(currentClass as Omit<Class, 'id'>);
          toast({ title: "Class Added", description: "The new class has been added." });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentClass(null);
      } catch (error) {
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = (cls: Class) => {
    setCurrentClass(cls);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteClass(id);
      await loadData();
      toast({ title: "Class Deleted", description: "The class has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentClass({});
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
          Add Class
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((cls) => (
              <TableRow key={cls.id}>
                <TableCell className="font-medium">{cls.name}</TableCell>
                <TableCell>{cls.year}</TableCell>
                <TableCell>{cls.department}</TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(cls)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(cls.id)} className="text-destructive focus:text-destructive-foreground">
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
            <DialogTitle>{currentClass?.id ? 'Edit Class' : 'Add Class'}</DialogTitle>
            <DialogDescription>
               {currentClass?.id ? 'Update class details.' : 'Add a new class.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={currentClass?.name || ''} onChange={(e) => setCurrentClass({ ...currentClass, name: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">Year</Label>
              <Input id="year" type="number" value={currentClass?.year || ''} onChange={(e) => setCurrentClass({ ...currentClass, year: parseInt(e.target.value) || 0 })} className="col-span-3" disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">Department</Label>
              <Input id="department" value={currentClass?.department || ''} onChange={(e) => setCurrentClass({ ...currentClass, department: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
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
