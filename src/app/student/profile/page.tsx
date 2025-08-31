
'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2, Eye, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStudents, updateStudent } from '@/lib/services/students';
import { getClasses } from '@/lib/services/classes';
import type { Student, Class } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/lib/services/auth';


export default function StudentProfilePage() {
  const { user, setUser: setAuthUser } = useAuth();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            const [allStudents, classData] = await Promise.all([
                getStudents(),
                getClasses()
            ]);
            const currentStudent = allStudents.find((s) => s.id === user.id);
            setStudent(currentStudent || null);
            setClasses(classData);
            setIsLoading(false);
        }
    }
    loadData();
  }, [user]);
  
  const handleFieldChange = (field: keyof Omit<Student, 'id' | 'avatar' | 'classId'>, value: any) => {
    if (student) {
        setStudent({ ...student, [field]: value });
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (student) {
            setStudent({ ...student, avatar: reader.result as string });
        }
        toast({ title: "Avatar Preview Changed", description: "This is a preview. Save to apply changes." });
      };
      reader.readAsDataURL(file);
    }
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (student && user) {
        if (newPassword && newPassword !== confirmPassword) {
            toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive'});
            return;
        }

      setIsSaving(true);
      try {
        const updatedStudent = await updateStudent(student);
        if (newPassword) {
            // Use the updated email from `updatedStudent` to ensure correctness
            await authService.updatePassword(updatedStudent.email, newPassword);
        }
        
        const updatedUser = { 
            ...user, 
            name: updatedStudent.name, 
            email: updatedStudent.email, 
            avatar: updatedStudent.avatar || user.avatar 
        };
        setAuthUser(updatedUser);
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully.',
        });
        setNewPassword('');
        setConfirmPassword('');
      } catch(error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to save changes', variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
      return (
          <DashboardLayout pageTitle="My Profile" role="student">
                <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
          </DashboardLayout>
      )
  }

  if (!student) {
    return (
      <DashboardLayout pageTitle="Profile Not Found" role="student">
        <Card>
          <CardHeader><CardTitle>Error</CardTitle></CardHeader>
          <CardContent>
            <p>Student not found.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="My Profile" role="student">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="w-6 h-6 mr-2" />
            Student Profile
          </CardTitle>
          <CardDescription>View and update your profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6 max-w-lg">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={student.avatar || user?.avatar} alt={student.name} />
                <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={isSaving}>
                  Change Photo
              </Button>
               <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={student.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={student.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Input
                id="class"
                value={getClassName(student.classId)}
                disabled
              />
            </div>
             <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
               <div className="relative">
                <Input
                  id="password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Enter a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isSaving}
                  className="pr-10"
                />
                 <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute inset-y-0 right-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
             <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isSaving}
                  className="pr-10"
                />
                 <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
