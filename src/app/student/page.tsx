

'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, ClipboardList, Bus, BookCheck, BarChart3, Wallet, MessageSquare, Bell, Home, Loader2 } from "lucide-react";
import type { Student, Class, EnrichedSchedule } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TimetableView from './components/TimetableView';
import { useToast } from '@/hooks/use-toast';
import { getStudents } from '@/lib/services/students';
import { getClasses } from '@/lib/services/classes';
import { getSchedule } from '@/lib/services/schedule';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const InfoItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="font-semibold text-sm">{value}</span>
    </div>
);

const FeatureCard = ({ title, icon: Icon, onClick, comingSoon }: { title: string, icon: React.ElementType, onClick?: () => void, comingSoon?: boolean }) => (
    <Card 
        className="group relative flex flex-col items-center justify-center p-4 text-center transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
        onClick={onClick}
    >
        <Icon className="w-10 h-10 mb-2 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
        {comingSoon && <div className="absolute top-1 right-1 bg-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">SOON</div>}
    </Card>
);

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [student, setStudent] = useState<Student | null>(null);
  const [studentClass, setStudentClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimetableModalOpen, setTimetableModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
        if (user) {
            setIsLoading(true);
            try {
                const [allStudents, allClasses] = await Promise.all([
                    getStudents(),
                    getClasses()
                ]);

                const currentStudent = allStudents.find(s => s.id === user.id);
                if (currentStudent) {
                    setStudent(currentStudent);
                    const currentClass = allClasses.find(c => c.id === currentStudent.classId);
                    setStudentClass(currentClass || null);
                }
            } catch (error) {
                toast({ title: 'Error', description: 'Failed to load dashboard data.', variant: 'destructive' });
            } finally {
                setIsLoading(false);
            }
        }
    }
    loadData();
  }, [user, toast]);

  const handleComingSoon = () => {
    toast({
        title: 'Coming Soon!',
        description: 'This feature is under development.',
    });
  }

  if (isLoading || !student) {
    return (
        <DashboardLayout pageTitle="Student Dashboard" role="student">
            <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>
        </DashboardLayout>
    );
  }

  const features = [
      { title: "Time Table", icon: Calendar, onClick: () => setTimetableModalOpen(true) },
      { title: "Attendance", icon: ClipboardList, onClick: handleComingSoon, comingSoon: true },
      { title: "Transport", icon: Bus, onClick: handleComingSoon, comingSoon: true },
      { title: "Exam Schedule", icon: BookCheck, onClick: handleComingSoon, comingSoon: true },
      { title: "Results", icon: BarChart3, onClick: handleComingSoon, comingSoon: true },
      { title: "Fees", icon: Wallet, onClick: handleComingSoon, comingSoon: true },
      { title: "Feedback", icon: MessageSquare, onClick: handleComingSoon, comingSoon: true },
      { title: "Notifications", icon: Bell, onClick: handleComingSoon, comingSoon: true },
      { title: "Hostel Leave / Gate Pass", icon: Home, onClick: handleComingSoon, comingSoon: true },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-slate-900 text-white shadow-md">
            <div className="container mx-auto px-4 py-6">
                 <div className="flex items-center justify-between">
                    <h1 className="text-xl font-bold">PIET-1</h1>
                     <Avatar>
                        <AvatarImage src={student.avatar} alt={student.name} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                <div className="mt-4">
                    <h2 className="text-2xl font-bold">{student.name}</h2>
                    <p className="text-sm text-gray-300">{student.phone} | {student.email}</p>
                </div>
                <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-4 text-center">
                    <InfoItem label="Branch" value={studentClass?.department || 'N/A'} />
                    <InfoItem label="Sem" value={studentClass?.semester || 'N/A'} />
                    <InfoItem label="Division" value={studentClass?.name || 'N/A'} />
                    <InfoItem label="Roll No." value={student.rollNumber} />
                    <InfoItem label="Batch" value={student.batch} />
                </div>
            </div>
            <div className="h-10 bg-gray-50 dark:bg-gray-900 rounded-t-3xl -mb-1"></div>
        </header>

        <main className="flex-grow container mx-auto px-4 py-6">
            <div className="grid grid-cols-3 gap-4">
                {features.map((feature, index) => (
                    <FeatureCard key={index} {...feature} />
                ))}
            </div>
        </main>
        
        <footer className="py-4 text-center text-sm text-muted-foreground">
            App Version: 1.0.2
        </footer>

        <Dialog open={isTimetableModalOpen} onOpenChange={setTimetableModalOpen}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>My Weekly Timetable</DialogTitle>
                    <DialogDescription>
                        Here are your scheduled classes for the week.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[70vh] overflow-y-auto p-1">
                    <TimetableView />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setTimetableModalOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
