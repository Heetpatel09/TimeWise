
'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserCog, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/context/AuthContext';
import { updateAdmin, addCredential } from '@/lib/services/auth';
import Link from 'next/link';

export default function AdminProfilePage() {
  const { toast } = useToast();
  const { user, setUser: setAuthUser } = useAuth();
  const [name, setName] = React.useState(user?.name || '');
  const [email, setEmail] = React.useState(user?.email || '');
  const [avatar, setAvatar] = React.useState(user?.avatar || '');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
        setName(user.name);
        setEmail(user.email);
        setAvatar(user.avatar);
    }
  }, [user]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
        if (newPassword && newPassword !== confirmPassword) {
            toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive'});
            return;
        }

        setIsSaving(true);
        try {
            const updatedDetails = { id: user.id, name, email, avatar };
            const updatedUser = await updateAdmin(updatedDetails);
            
            if (newPassword) {
                await addCredential({
                    userId: user.id,
                    email: updatedDetails.email,
                    password: newPassword,
                    role: 'admin',
                });
            }

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

  if (!user) return null;

  return (
    <DashboardLayout pageTitle="My Profile" role="admin">
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCog className="w-6 h-6 mr-2" />
            Admin Profile
          </CardTitle>
          <CardDescription>Manage your profile information and settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6 max-w-lg">
            <div className="flex items-center space-x-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={avatar} />
                <AvatarFallback>A</AvatarFallback>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSaving}
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
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
