
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAdmins, addAdmin, updateAdmin, deleteAdmin } from '@/lib/services/admins';
import type { Admin } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Copy } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useAuth } from '@/context/AuthContext';

export default function AdminsManager() {
  const { user: authUser } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Partial<Admin>>({});
  const [newAdminCredentials, setNewAdminCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);
  const { toast } = useToast();

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await getAdmins();
      setAdmins(data);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load admins.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (currentAdmin && currentAdmin.name && currentAdmin.email) {
      setIsSubmitting(true);
      try {
        if (currentAdmin.id) {
          await updateAdmin(currentAdmin as Admin);
          toast({ title: "Admin Updated", description: "The admin's details have been saved." });
        } else {
          const result = await addAdmin(currentAdmin as Omit<Admin, 'id'>);
          toast({ title: "Admin Added", description: "The new admin has been created." });
          setNewAdminCredentials({ email: result.email, initialPassword: result.initialPassword });
        }
        await loadData();
        setDialogOpen(false);
        setCurrentAdmin({});
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Password copied to clipboard.' });
  }

  const handleEdit = (admin: Admin) => {
    setCurrentAdmin(admin);
    setDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    try {
      await deleteAdmin(id);
      await loadData();
      toast({ title: "Admin Deleted", description: "The admin has been removed." });
    } catch (error: any) {
       toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentAdmin({});
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
          Add Admin
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => (
              <TableRow key={admin.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={admin.avatar} alt={admin.name} />
                        <AvatarFallback>{admin.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-bold">{admin.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(admin)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <DropdownMenuItem 
                                onSelect={(e) => e.preventDefault()} 
                                className="text-destructive focus:text-destructive-foreground focus:bg-destructive/10"
                                disabled={admin.id === authUser?.id}
                                >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the admin user.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(admin.id)}>Continue</AlertDialogAction>
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

      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) setCurrentAdmin({});
        setDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentAdmin?.id ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
            <DialogDescription>
              {currentAdmin?.id ? 'Update admin details.' : 'Add a new admin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" value={currentAdmin.name ?? ''} onChange={(e) => setCurrentAdmin({ ...currentAdmin, name: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={currentAdmin.email ?? ''} onChange={(e) => setCurrentAdmin({ ...currentAdmin, email: e.target.value })} className="col-span-3" disabled={isSubmitting}/>
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
      
      <Dialog open={!!newAdminCredentials} onOpenChange={() => setNewAdminCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Created</DialogTitle>
            <DialogDescription>
              Share the following credentials with the new admin so they can log in. The password is randomly generated for security.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTitle>Login Credentials</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <div>
                    <Label>Email</Label>
                    <Input readOnly value={newAdminCredentials?.email} />
                  </div>
                   <div>
                    <Label>Initial Password</Label>
                    <div className="flex items-center gap-2">
                      <Input readOnly type="text" value={newAdminCredentials?.initialPassword} />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(newAdminCredentials?.initialPassword || '')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">The admin will be required to change this password on their first login.</p>
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewAdminCredentials(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
