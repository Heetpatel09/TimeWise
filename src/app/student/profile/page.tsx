
'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { students as allStudents, classes } from '@/lib/placeholder-data';
import type { Student } from '@/lib/types';

const LOGGED_IN_STUDENT_ID = 'STU001';

export default function StudentProfilePage() {
  const { toast } = useToast();
  const [student, setStudent] = React.useState<Student | undefined>(
    allStudents.find((s) => s.id === LOGGED_IN_STUDENT_ID)
  );

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      console.log('Saving student data:', student);
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    }
  };

  if (!student) {
    return (
      <DashboardLayout pageTitle="Profile Not Found" role="student">
        <Card>
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
              <Button variant="outline">Change Photo</Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={student.name}
                onChange={(e) => setStudent({ ...student, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={student.email}
                onChange={(e) => setStudent({ ...student, email: e.target.value })}
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
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
