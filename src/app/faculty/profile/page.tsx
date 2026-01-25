
'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Loader2, Eye, EyeOff, ArrowLeft, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFaculty, updateFaculty } from '@/lib/services/faculty';
import { getDepartments } from '@/lib/services/departments';
import type { Faculty, Department } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { addCredential } from '@/lib/services/auth';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function FacultyProfilePage() {
  const { user, setUser: setAuthUser } = useAuth();
  const { toast } = useToast();
  const [facultyMember, setFacultyMember] = useState<Faculty | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profileCompletion, setProfileCompletion] = useState(0);

  const calculateProfileCompletion = React.useCallback((currentFaculty: Faculty | null, requiresPasswordChange: boolean) => {
      if (!currentFaculty) return 0;
      let completion = 0;
      if (currentFaculty.name) completion += 20;
      if (currentFaculty.email) completion += 20;
      if (currentFaculty.departmentId) completion += 20;
      if (currentFaculty.avatar && !currentFaculty.avatar.includes('vercel.sh')) completion += 20;
      if (!requiresPasswordChange) completion += 20;
      setProfileCompletion(Math.min(completion, 100));
  }, []);
  
  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            const [allFaculty, departmentData] = await Promise.all([
                getFaculty(),
                getDepartments()
            ]);
            const member = allFaculty.find((f) => f.id === user.id);
            setFacultyMember(member || null);
            setDepartments(departmentData);
            setIsLoading(false);
        }
    }
    loadData();
  }, [user]);

  useEffect(() => {
    if (facultyMember) {
        calculateProfileCompletion(facultyMember, !!user?.requiresPasswordChange);
    }
  }, [facultyMember, user?.requiresPasswordChange, calculateProfileCompletion]);
  
  const handleFieldChange = (field: keyof Omit<Faculty, 'id' | 'avatar' | 'profileCompleted'>, value: any) => {
    if (facultyMember) {
        setFacultyMember({ ...facultyMember, [field]: value });
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (facultyMember) {
            setFacultyMember({ ...facultyMember, avatar: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (facultyMember && user) {
      if (newPassword && newPassword !== confirmPassword) {
        toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive'});
        return;
      }
      
      if (user.requiresPasswordChange && !newPassword) {
            toast({ title: 'Password Required', description: 'Please set a new password to continue.', variant: 'destructive'});
            return;
        }

      setIsSaving(true);
      try {
        const requiresPasswordChange = newPassword ? false : user.requiresPasswordChange;
        
        let completion = 0;
        if (facultyMember.name) completion += 20;
        if (facultyMember.email) completion += 20;
        if (facultyMember.departmentId) completion += 20;
        if (facultyMember.avatar && !facultyMember.avatar.includes('vercel.sh')) completion += 20;
        if (!requiresPasswordChange) completion += 20;

        const updatedFacultyData = { ...facultyMember, profileCompleted: Math.min(completion, 100) };
        const updatedFacultyResult = await updateFaculty(updatedFacultyData);
        setFacultyMember(updatedFacultyResult as any);

        if (newPassword || updatedFacultyResult.email !== user.email) {
            await addCredential({
                userId: user.id,
                email: updatedFacultyResult.email,
                password: newPassword || undefined,
                role: 'faculty',
                requiresPasswordChange,
            });
        }
        
        const updatedUser = { 
            ...user, 
            name: updatedFacultyResult.name, 
            email: updatedFacultyResult.email, 
            avatar: updatedFacultyResult.avatar || user.avatar,
            requiresPasswordChange
        };
        setAuthUser(updatedUser);
        
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully.',
        });
        setNewPassword('');
        setConfirmPassword('');
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'Failed to save changes.', variant: 'destructive'});
      } finally {
        setIsSaving(false);
      }
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout pageTitle="My Profile" role="faculty">
        <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
      </DashboardLayout>
    );
  }

  if (!facultyMember) {
    return (
      <DashboardLayout pageTitle="Profile Not Found" role="faculty">
        <Card>
            <CardHeader>
                <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Faculty member not found.</p>
            </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const departmentName = departments.find(d => d.id === facultyMember.departmentId)?.name || 'N/A';

  return (
    <DashboardLayout pageTitle="My Profile" role="faculty">
        <div className="space-y-6">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/faculty">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>

            {profileCompletion < 100 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Complete Your Profile</CardTitle>
                        <CardDescription>
                            Please fill out your profile details. Your profile is {profileCompletion}% complete.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Progress value={profileCompletion} className="w-full" />
                    </CardContent>
                </Card>
            )}

            {user?.requiresPasswordChange && (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                        For your security, please set a new password for your account.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                <CardTitle className="flex items-center">
                    <UserCheck className="w-6 h-6 mr-2" />
                    Faculty Profile
                </CardTitle>
                <CardDescription>View and update your profile information.</CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                    <div className="flex items-center space-x-4">
                    <Avatar className="w-20 h-20">
                        <AvatarImage src={facultyMember.avatar || user?.avatar} alt={facultyMember.name} />
                        <AvatarFallback>{facultyMember.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
                        value={facultyMember.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        disabled={isSaving}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                        id="email"
                        type="email"
                        value={facultyMember.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        disabled={isSaving}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                        id="department"
                        value={departmentName}
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
                        onChange={e => setNewPassword(e.target.value)}
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
                        onChange={e => setConfirmPassword(e.target.value)}
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
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                    </div>
                </form>
                </CardContent>
            </Card>
        </div>
    </DashboardLayout>
  );
}
