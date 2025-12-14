
'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAdmins, addAdmin, updateAdmin, deleteAdmin } from '@/lib/services/admins';
import type { Admin, Permission } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Copy, Eye, EyeOff, UserCog, UserCheck, ShieldCheck } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ALL_PERMISSIONS: { id: Permission, label: string }[] = [
    { id: 'manage_subjects', label: 'Manage Subjects' },
    { id: 'manage_classes', label: 'Manage Classes' },
    { id: 'manage_classrooms', label: 'Manage Classrooms' },
    { id: 'manage_faculty', label: 'Manage Faculty' },
    { id: 'manage_students', label: 'Manage Students' },
    { id: 'manage_schedule', label: 'Manage Schedule' },
    { id: 'manage_requests', label: 'Manage Requests' },
    { id: 'manage_exams', label: 'Manage Exams' },
    { id: 'manage_attendance', label: 'Manage Attendance' },
    { id: 'manage_fees', label: 'Manage Fees' },
    { id: 'manage_hostels', label: 'Manage Hostels' },
    { id: 'manage_results', label: 'Manage Results' },
];

export default function AdminsManager() {
  const { user: authUser } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<Partial<Admin>>({});
  const [newAdminCredentials, setNewAdminCredentials] = useState<{ email: string, initialPassword?: string } | null>(null);
  const [passwordOption, setPasswordOption] = useState<'auto' | 'manual'>('auto');
  const [manualPassword, setManualPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const handlePermissionChange = (permission: Permission, checked: boolean) => {
    setCurrentAdmin(prev => {
        const newPermissions = prev?.permissions ? [...prev.permissions] : [];
        if (checked) {
            if (!newPermissions.includes(permission)) {
                newPermissions.push(permission);
            }
        } else {
            const index = newPermissions.indexOf(permission);
            if (index > -1) {
                newPermissions.splice(index, 1);
            }
        }
        return { ...prev, permissions: newPermissions };
    });
  }

  const handleSave = async () => {
    if (currentAdmin && currentAdmin.name && currentAdmin.email) {
      if (!currentAdmin.id && passwordOption === 'manual' && !manualPassword) {
        toast({ title: "Password Required", description: "Please enter a password for the new user.", variant: "destructive" });
        return;
      }
      
      const adminToSave: Omit<Admin, 'id'> = {
        name: currentAdmin.name!,
        email: currentAdmin.email!,
        avatar: currentAdmin.avatar,
        role: currentAdmin.role || 'manager',
        permissions: currentAdmin.role === 'admin' ? ['*'] : currentAdmin.permissions || [],
      }

      setIsSubmitting(true);
      try {
        if (currentAdmin.id) {
          await updateAdmin({ ...adminToSave, id: currentAdmin.id });
          toast({ title: "User Updated", description: "The user's details have been saved." });
        } else {
          // const result = await addAdmin(
          //   adminToSave, 
          //   passwordOption === 'manual' ? manualPassword : undefined
          // );
          // toast({ title: "User Added", description: "The new user has been created." });
          // if (result.initialPassword) {
          //   setNewAdminCredentials({ email: result.email, initialPassword: result.initialPassword });
          // }
          toast({ title: "AI Feature Disabled", description: "Adding users with AI-generated notifications is currently disabled.", variant: "destructive" });

        }
        await loadData();
        setDialogOpen(false);
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
      toast({ title: "User Deleted", description: "The user has been removed." });
    } catch (error: any) {
       toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    }
  };
  
  const openNewDialog = () => {
    setCurrentAdmin({ role: 'manager', permissions: [] });
    setPasswordOption('auto');
    setManualPassword('');
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
          Add User
        </Button>
      </div>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
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
                        <AvatarFallback>{admin.name ? admin.name.split(' ').map(n => n[0]).join('') : 'A'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="font-bold">{admin.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{admin.email}</TableCell>
                <TableCell>
                  <Badge variant={admin.role === 'admin' ? 'default' : 'secondary'} className='capitalize'>
                    {admin.role === 'admin' ? <UserCog className='h-3 w-3 mr-1'/> : <UserCheck className='h-3 w-3 mr-1'/>}
                    {admin.role}
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
                                This action cannot be undone. This will permanently delete the user account.
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
        if (!isOpen) {
            setCurrentAdmin({});
            setManualPassword('');
            setPasswordOption('auto');
        }
        setDialogOpen(isOpen);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentAdmin?.id ? 'Edit User' : 'Add User'}</DialogTitle>
            <DialogDescription>
              {currentAdmin?.id ? 'Update user details and permissions.' : 'Add a new admin or manager.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-8 py-4">
            <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={currentAdmin.name ?? ''} onChange={(e) => setCurrentAdmin({ ...currentAdmin, name: e.target.value })} disabled={isSubmitting}/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={currentAdmin.email ?? ''} onChange={(e) => setCurrentAdmin({ ...currentAdmin, email: e.target.value })} disabled={isSubmitting}/>
                </div>
                 <div className="space-y-2">
                   <Label>Role</Label>
                   <RadioGroup value={currentAdmin.role} onValueChange={(v: 'admin' | 'manager') => setCurrentAdmin({...currentAdmin, role: v})} className="flex gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="admin" id="role-admin" />
                        <Label htmlFor="role-admin">Admin (Full Access)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="manager" id="role-manager" />
                        <Label htmlFor="role-manager">Manager (Limited Access)</Label>
                      </div>
                   </RadioGroup>
                </div>
                {!currentAdmin.id && (
                  <>
                    <div className="space-y-2">
                       <Label>Password</Label>
                       <RadioGroup value={passwordOption} onValueChange={(v: 'auto' | 'manual') => setPasswordOption(v)} className="flex gap-4 pt-2">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="auto" id="auto" />
                            <Label htmlFor="auto">Auto-generate</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="manual" id="manual" />
                            <Label htmlFor="manual">Manual</Label>
                          </div>
                       </RadioGroup>
                    </div>
                     {passwordOption === 'manual' && (
                        <div className="space-y-2">
                            <Label htmlFor="manual-password">Set Password</Label>
                            <div className="relative">
                                <Input 
                                    id="manual-password" 
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
            <Card className={currentAdmin.role === 'admin' ? 'bg-muted' : ''}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShieldCheck/> Permissions</CardTitle>
                </CardHeader>
                <CardContent>
                    {currentAdmin.role === 'admin' ? (
                        <div className="flex flex-col items-center justify-center text-center h-full">
                            <p className="text-muted-foreground">Admins have full access to all features.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {ALL_PERMISSIONS.map(p => (
                                <div key={p.id} className="flex flex-row items-center space-x-3 space-y-0">
                                    <Checkbox 
                                        id={`perm-${p.id}`} 
                                        checked={currentAdmin.permissions?.includes(p.id)}
                                        onCheckedChange={(checked) => handlePermissionChange(p.id, !!checked)}
                                    />
                                    <Label htmlFor={`perm-${p.id}`} className="font-normal">{p.label}</Label>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
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
            <DialogTitle>User Created</DialogTitle>
            <DialogDescription>
              Share the following credentials with the new user so they can log in. The password is randomly generated for security.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <AlertTitle>Login Credentials</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <div>
                    <Label>Email</Label>
                    <Input readOnly value={newAdminCredentials?.email ?? ''} />
                  </div>
                  {newAdminCredentials?.initialPassword && (
                    <div>
                        <Label>Initial Password</Label>
                        <div className="flex items-center gap-2">
                        <Input readOnly type="text" value={newAdminCredentials?.initialPassword ?? ''} />
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(newAdminCredentials?.initialPassword || '')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                        </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground pt-2">The user will be required to change this password on their first login.</p>
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
