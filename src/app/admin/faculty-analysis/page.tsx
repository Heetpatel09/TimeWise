
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getSubjects } from '@/lib/services/subjects';
import { getDepartments } from '@/lib/services/departments';
import type { Faculty, Schedule, Subject, Department } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FacultyHeatmap from '@/app/faculty/components/FacultyHeatmap';
import FacultyLoadBalancer from '../components/FacultyLoadBalancer';

export default function FacultyAnalysisPage() {
    const { data: facultyList = [], isLoading: facultyLoading } = useQuery<Faculty[]>({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: schedule = [], isLoading: scheduleLoading } = useQuery<Schedule[]>({ queryKey: ['schedule'], queryFn: getSchedule });
    const { data: subjects = [], isLoading: subjectsLoading } = useQuery<Subject[]>({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: departments = [], isLoading: departmentsLoading } = useQuery<Department[]>({ queryKey: ['departments'], queryFn: getDepartments });

    const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

    const isLoading = facultyLoading || scheduleLoading || subjectsLoading || departmentsLoading;

    const selectedFaculty = facultyList.find(f => f.id === selectedFacultyId);
    const selectedFacultySchedule = schedule.filter(s => s.facultyId === selectedFacultyId);

    return (
        <DashboardLayout pageTitle="Admin / Faculty Analysis" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            
            {isLoading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
            ) : (
                <div className="space-y-8">
                    <FacultyLoadBalancer 
                        facultyList={facultyList}
                        schedule={schedule}
                        subjects={subjects}
                        departments={departments}
                    />

                    <div>
                         <h2 className="text-2xl font-bold tracking-tight mb-4">Individual Faculty Heatmap</h2>
                         <div className="mb-4">
                             <Select onValueChange={setSelectedFacultyId} value={selectedFacultyId || ''}>
                                <SelectTrigger className="w-full sm:w-[300px]">
                                    <SelectValue placeholder="Select a faculty member to view their heatmap..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {facultyList.map(f => (
                                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                         </div>
                         
                         {selectedFacultyId && selectedFaculty && (
                            <FacultyHeatmap 
                                schedule={selectedFacultySchedule} 
                                faculty={selectedFaculty}
                                isAdminView={true}
                            />
                         )}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
