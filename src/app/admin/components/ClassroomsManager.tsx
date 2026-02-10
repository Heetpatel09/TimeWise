
'use client';
import { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getClassrooms, addClassroom, updateClassroom, deleteClassroom, bulkAddClassrooms, bulkDeleteClassrooms } from '@/lib/services/classrooms';
import type { Classroom } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Building, Wrench, Upload } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CsvImportDialog from './CsvImportDialog';
import { Checkbox } from '@/components/ui/checkbox';
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
} from "@/components/ui/alert-dialog";

const maintenanceStatusOptions: Classroom['maintenanceStatus'][] = ['available', 'in_maintenance', 'unavailable'];
const classroomHeaders = ['name', 'type', 'capacity', 'maintenanceStatus', 'building'];

export default function ClassroomsManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: classrooms = [], isLoading } = useQuery<Classroom[]>({
    queryKey: ['classrooms'],
    queryFn: getClassrooms,
  });

  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isImportOpen, setImportOpen] = useState(false);
  const [currentClassroom, setCurrentClassroom] = useState<Partial<Classroom>>({});
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([]);

  const classroomMutation = useMutation({
    mutationFn: async (classroom: Omit<Classroom, 'id'> & { id?: string }) => {
      if (classroom.id) {
        return updateClassroom(classroom as Classroom);
      } else {
        return addClassroom(classroom);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast({ title: currentClassroom.id ? 'Classroom Updated' : 'Classroom Added' });
      setDialogOpen(false);
      setCurrentClassroom({});
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteClassroom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      toast({ title: "Classroom Deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    },
  });
  
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteClassrooms,
    onSuccess: (result) => {
        if (result.success) {
            queryClient.invalidateQueries({ queryKey: ['classrooms'] });
            toast({ title: "Bulk Deletion Successful", description: result.message });
            setSelectedClassroomIds([]);
        } else {
            toast({ title: "Bulk Deletion Failed", description: result.message, variant: 'destructive' });
        }
    },
    onError: (error: any) => {
        toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    }
  });


  const handleSave = async () => {
    if (currentClassroom && currentClassroom.name && currentClassroom.type && currentClassroom.building && currentClassroom.capacity && currentClassroom.maintenanceStatus) {
      classroomMutation.mutate(currentClassroom as Omit<Classroom, 'id'> & { id?: string });
    } else {
        toast({ title: "Missing Information", description: "Please provide all the required details.", variant: "destructive" });
    }
  };

  const handleEdit = (cls: Classroom) => {
    setCurrentClassroom(cls);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    deleteMutation.mutate(id);
  };
  
  const openNewDialog = () => {
    setCurrentClassroom({type: 'classroom', maintenanceStatus: 'available', capacity: 30});
    setDialogOpen(true);
  };

  const handleImport = async (data: Omit<Classroom, 'id'>[]) => {
    const result = await bulkAddClassrooms(data);
    if(result.successCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    }
    toast({
        title: 'Import Complete',
        description: `${result.successCount} added, ${result.errorCount} failed.`
    });
    return result;
  };
  
  const getStatusVariant = (status: Classroom['maintenanceStatus']) => {
    switch (status) {
      case 'available': return 'default';
      case 'in_maintenance': return 'secondary';
      case 'unavailable': return 'destructive';
      default: return 'outline';
    }
  };
  
  const handleSelectAll = (checked: boolean | string) => {
    if (checked) {
        setSelectedClassroomIds(classrooms.map(c => c.id));
    } else {
        setSelectedClassroomIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
      if (checked) {
          setSelectedClassroomIds(prev => [...prev, id]);
      } else {
          setSelectedClassroomIds(prev => prev.filter(rowId => rowId !== id));
      }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          {selectedClassroomIds.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={bulkDeleteMutation.isPending}>
                  {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete Selected ({selectedClassroomIds.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will permanently delete {selectedClassroomIds.length} classroom(s). This action cannot be undone.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => bulkDeleteMutation.mutate(selectedClassroomIds)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import from CSV
          </Button>
          <Button onClick={openNewDialog}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Classroom
          </Button>
        </div>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedClassroomIds.length === classrooms.length && classrooms.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classrooms.map((cls) => (
              <TableRow key={cls.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedClassroomIds.includes(cls.id)}
                    onCheckedChange={(checked) => handleSelectRow(cls.id, !!checked)}
                  />
                </TableCell>
                <TableCell className="font-medium">{cls.name}</TableCell>
                 <TableCell className="capitalize">
                  <Badge variant={cls.type === 'lab' ? 'secondary' : 'outline'}>{cls.type}</Badge>
                </TableCell>
                <TableCell>{cls.building}</TableCell>
                <TableCell>{cls.capacity}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(cls.maintenanceStatus)} className="capitalize">
                    {(cls.maintenanceStatus || '').replace('_', ' ')}
                  </Badge>
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
                      <DropdownMenuItem onClick={() => handleEdit(cls)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(cls.id)} className="text-destructive focus:text-destructive-foreground focus:bg-destructive/10">
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

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setCurrentClassroom({});
        setDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{currentClassroom?.id ? 'Edit Classroom' : 'Add Classroom'}</DialogTitle>
            <DialogDescription>
               {currentClassroom?.id ? 'Update classroom details.' : 'Add a new classroom.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={currentClassroom.name || ''} onChange={(e) => setCurrentClassroom({ ...currentClassroom, name: e.target.value })} disabled={classroomMutation.isPending}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Input id="type" value={currentClassroom.type || ''} placeholder="e.g. Classroom, Lab" onChange={(e) => setCurrentClassroom({ ...currentClassroom, type: e.target.value })} disabled={classroomMutation.isPending}/>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input id="capacity" type="number" value={currentClassroom.capacity || ''} onChange={(e) => setCurrentClassroom({ ...currentClassroom, capacity: parseInt(e.target.value) || 0 })} disabled={classroomMutation.isPending}/>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input id="building" value={currentClassroom.building || ''} placeholder="e.g. Main Building, Tech Park" onChange={(e) => setCurrentClassroom({ ...currentClassroom, building: e.target.value })} disabled={classroomMutation.isPending}/>
            </div>
             <div className="space-y-2">
                <Label htmlFor="status">Maintenance Status</Label>
                 <Select value={currentClassroom?.maintenanceStatus} onValueChange={(v: Classroom['maintenanceStatus']) => setCurrentClassroom({ ...currentClassroom, maintenanceStatus: v })} disabled={classroomMutation.isPending}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        {maintenanceStatusOptions.map(opt => (
                            <SelectItem key={opt} value={opt} className="capitalize">{opt.replace('_', ' ')}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={classroomMutation.isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={classroomMutation.isPending}>
              {classroomMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CsvImportDialog
        isOpen={isImportOpen}
        onOpenChange={setImportOpen}
        requiredHeaders={classroomHeaders}
        onImport={handleImport}
        dataName="Classrooms"
      />
    </div>
  );
}
