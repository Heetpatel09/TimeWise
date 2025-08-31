
'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { faculty as allFaculty } from '@/lib/placeholder-data';
import type { Faculty } from '@/lib/types';

const LOGGED_IN_FACULTY_ID = 'FAC001';

export default function FacultyProfilePage() {
  const { toast } = useToast();
  const [facultyMember, setFacultyMember] = React.useState<Faculty | undefined>(
    allFaculty.find((f) => f.id === LOGGED_IN_FACULTY_ID)
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && facultyMember) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        // This is a temporary solution for client-side preview.
        // In a real app, you would upload this to a server and get a URL.
        const avatarUrl = reader.result as string;
        // The avatar property is not part of the Faculty type, so we need to be creative
        // For the demo, we will update the vercel avatar URL to a fake one to show change.
        // A proper implementation would extend the faculty type or handle image state differently.
        const updatedFaculty = {...facultyMember, email: `updated.${Date.now()}`};
        setFacultyMember(updatedFaculty);
        toast({ title: "Avatar Preview Changed", description: "This is a preview. Save to apply changes." });
      };
      reader.readAsDataURL(file);
    }
  };


  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (facultyMember) {
      // Here you would typically call an API to save the data
      console.log('Saving faculty data:', facultyMember);
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
    }
  };

  if (!facultyMember) {
    return (
      <DashboardLayout pageTitle="Profile Not Found" role="faculty">
        <Card>
          <CardContent>
            <p>Faculty member not found.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="My Profile" role="faculty">
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
                <AvatarImage src={`https://avatar.vercel.sh/${facultyMember.email}.png`} alt={facultyMember.name} />
                <AvatarFallback>{facultyMember.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
              </Avatar>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}>
                  Change Photo
              </Button>
               <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={facultyMember.name}
                onChange={(e) => setFacultyMember({ ...facultyMember, name: e.target.value } as Faculty)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={facultyMember.email}
                onChange={(e) => setFacultyMember({ ...facultyMember, email: e.target.value } as Faculty)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={facultyMember.department}
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
