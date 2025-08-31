'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStudents, updateStudent } from '@/lib/services/students';
import { getClasses } from '@/lib/services/classes';
import type { Student, Class } from '@/lib/types';

const LOGGED_IN_STUDENT_ID = 'STU001';

export default function StudentProfilePage() {
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
        setIsLoading(true);
        const [allStudents, classData] = await Promise.all([
            getStudents(),
            getClasses()
        ]);
        const currentStudent = allStudents.find((s) => s.id === LOGGED_IN_STUDENT_ID);
        setStudent(currentStudent || null);
        setClasses(classData);
        setIsLoading(false);
    }
    loadData();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && student) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        // This is a temporary solution for client-side preview.
        // In a real app, you would upload this to a server and get a URL.
        const updatedStudent = {...student, email: `updated.${Date.now()}@example.com`};
        setStudent(updatedStudent);
        toast({ title: "Avatar Preview Changed", description: "This is a preview. Save to apply changes." });
      };
      reader.readAsDataURL(file);
    }
  };

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      setIsSaving(true);
      try {
        await updateStudent(student);
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully.',
        });
      } catch(error) {
        toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
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
                <AvatarImage src={`https://avatar.vercel.sh/${student.email}.png`} alt={student.name} />
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
                onChange={(e) => setStudent({ ...student, name: e.target.value } as Student)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={student.email}
                onChange={(e) => setStudent({ ...student, email: e.target.value } as Student)}
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
              <Input
                id="password"
                type="password"
                placeholder="Enter a new password"
                disabled={isSaving}
              />
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
