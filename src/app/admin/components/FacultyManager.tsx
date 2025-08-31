'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getFaculty, addFaculty, updateFaculty, deleteFaculty } from '@/lib/services/faculty';
import type { Faculty } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

export default function FacultyManager() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFaculty, setCurrentFaculty] = useState<Partial<Faculty> | null>(null);
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await getFaculty();
      setFaculty(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load faculty.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (currentFaculty) {
      setIsSubmitting(true);
      try {
        if (currentFaculty.id) {
          await updateFaculty(currentFaculty as Faculty);
          toast({ title: "Faculty Updated", description: "The faculty member's details have been saved." });
        } else {
          await addFaculty(currentFaculty as Omit<Faculty, 'id'>);
          toast({ title: "Faculty Added", description: "The new faculty member has been added." });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentFaculty(null);
      } catch (error) {
        toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleEdit = (fac: Faculty) => {
    setCurrentFaculty(fac);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteFaculty(id);
      await loadData();
      toast({ title: "Faculty Deleted", description: "The faculty member has been removed." });
    } catch (error) {
       toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentFaculty({});
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
          Add Faculty
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Streak</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {faculty.map((fac) => (
              <TableRow key={fac.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={`https://avatar.vercel.sh/${fac.email}.png`} alt={fac.name} />
                        <AvatarFallback>{fac.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-bold">{fac.name}</div>
                        <div className="text-sm text-muted-foreground">{fac.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{fac.department}</TableCell>
                <TableCell>{fac.streak}</TableCell>
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
                      <DropdownMenuItem onClick={() => handleDelete(fac.id)} className="text-destructive">
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
            <DialogTitle>{currentFaculty?.id ? 'Edit Faculty' : 'Add Faculty'}</DialogTitle>
            <DialogDescription>
              {currentFaculty?.id ? 'Update faculty details.' : 'Add a new faculty member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={currentFaculty?.name || ''} onChange={(e) => setCurrentFaculty({ ...currentFaculty, name: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={currentFaculty?.email || ''} onChange={(e) => setCurrentFaculty({ ...currentFaculty, email: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">Department</Label>
              <Input id="department" value={currentFaculty?.department || ''} onChange={(e) => setCurrentFaculty({ ...currentFaculty, department: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="streak" className="text-right">Streak</Label>
              <Input id="streak" type="number" value={currentFaculty?.streak || 0} onChange={(e) => setCurrentFaculty({ ...currentFaculty, streak: parseInt(e.target.value) || 0 })} className="col-span-3" disabled={isSubmitting}/>
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
