
'use client';

import React, { useMemo } from 'react';
import type { Faculty, Schedule, Subject, Department } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface FacultyLoad {
    facultyId: string;
    facultyName: string;
    weeklyHours: number;
    weightedHours: number;
    departmentId: string;
    departmentName: string;
    loadStatus: 'Low' | 'Balanced' | 'High';
    loadPercentage: number;
    consecutiveSessions: number;
}

interface RedistributionSuggestion {
    overloadedFaculty: { id: string; name: string };
    underloadedFaculty: { id: string; name: string };
    subject: { id: string; name: string };
}

const getLoadStatus = (percentage: number): 'Low' | 'Balanced' | 'High' => {
    if (percentage > 120) return 'High';
    if (percentage < 80) return 'Low';
    return 'Balanced';
};

const getLoadBadgeVariant = (status: 'Low' | 'Balanced' | 'High') => {
    switch (status) {
        case 'High': return 'destructive';
        case 'Low': return 'secondary';
        case 'Balanced': return 'default';
    }
};

export default function FacultyLoadBalancer({
    facultyList,
    schedule,
    subjects,
    departments,
}: {
    facultyList: Faculty[];
    schedule: Schedule[];
    subjects: Subject[];
    departments: Department[];
}) {

    const analysis: { facultyLoadData: FacultyLoad[], suggestions: RedistributionSuggestion[] } = useMemo(() => {
        if (!facultyList.length || !schedule.length) return { facultyLoadData: [], suggestions: [] };

        const subjectCreditsMap = new Map(subjects.map(s => [s.id, s.credits || 1]));

        const facultyLoadMap: Map<string, { weeklyHours: number, weightedHours: number, schedule: Schedule[] }> = new Map();

        facultyList.forEach(f => {
            facultyLoadMap.set(f.id, { weeklyHours: 0, weightedHours: 0, schedule: [] });
        });

        schedule.forEach(slot => {
            if (facultyLoadMap.has(slot.facultyId)) {
                const data = facultyLoadMap.get(slot.facultyId)!;
                const credits = subjectCreditsMap.get(slot.subjectId) || 1;
                data.weeklyHours += 1;
                data.weightedHours += credits;
                data.schedule.push(slot);
            }
        });

        const departmentAverages = departments.reduce((acc, dept) => {
            const deptFaculty = facultyList.filter(f => f.departmentId === dept.id);
            if (deptFaculty.length > 0) {
                const totalHours = deptFaculty.reduce((sum, f) => sum + (facultyLoadMap.get(f.id)?.weeklyHours || 0), 0);
                acc[dept.id] = totalHours / deptFaculty.length;
            } else {
                acc[dept.id] = 0;
            }
            return acc;
        }, {} as Record<string, number>);

        const facultyLoadData: FacultyLoad[] = facultyList.map(f => {
            const data = facultyLoadMap.get(f.id)!;
            const department = departments.find(d => d.id === f.departmentId);
            const deptAverage = departmentAverages[f.departmentId] || 1; // Avoid division by zero
            const loadPercentage = deptAverage > 0 ? (data.weeklyHours / deptAverage) * 100 : 0;
            
            // Consecutive session detection
            let maxConsecutive = 0;
            if (data.schedule.length > 1) {
                const sortedSchedule = data.schedule.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time));
                let currentConsecutive = 1;
                for (let i = 1; i < sortedSchedule.length; i++) {
                    // This is a simplified check. A robust implementation would parse time strings.
                    if (sortedSchedule[i].day === sortedSchedule[i - 1].day) {
                         currentConsecutive++;
                    } else {
                        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
                        currentConsecutive = 1;
                    }
                }
                maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
            }

            return {
                facultyId: f.id,
                facultyName: f.name,
                weeklyHours: data.weeklyHours,
                weightedHours: data.weightedHours,
                departmentId: f.departmentId,
                departmentName: department?.name || 'N/A',
                loadStatus: getLoadStatus(loadPercentage),
                loadPercentage,
                consecutiveSessions: maxConsecutive > 1 ? maxConsecutive : 0
            };
        }).sort((a,b) => b.weeklyHours - a.weeklyHours);

        // --- Suggestion Logic ---
        const overloaded = facultyLoadData.filter(f => f.loadStatus === 'High').sort((a,b) => b.loadPercentage - a.loadPercentage);
        const underloaded = facultyLoadData.filter(f => f.loadStatus === 'Low').sort((a,b) => a.loadPercentage - b.loadPercentage);
        const suggestions: RedistributionSuggestion[] = [];

        overloaded.forEach(over => {
            const overFaculty = facultyList.find(f => f.id === over.facultyId)!;
            const overSubjects = overFaculty.allottedSubjects || [];

            for (const under of underloaded) {
                if(over.departmentId !== under.departmentId) continue; // Only suggest within department

                const underFaculty = facultyList.find(f => f.id === under.facultyId)!;
                const underSubjects = underFaculty.allottedSubjects || [];

                const commonSubjectId = overSubjects.find(subId => underSubjects.includes(subId));
                if (commonSubjectId) {
                    // Found a potential swap
                    const subject = subjects.find(s => s.id === commonSubjectId);
                    if(subject && !suggestions.some(s => s.subject.id === subject.id)) {
                        suggestions.push({
                            overloadedFaculty: { id: over.facultyId, name: over.facultyName },
                            underloadedFaculty: { id: under.facultyId, name: under.facultyName },
                            subject: { id: subject.id, name: subject.name },
                        });
                        // Limit to one suggestion per overloaded faculty for simplicity
                        break; 
                    }
                }
            }
        });


        return { facultyLoadData, suggestions };
    }, [facultyList, schedule, subjects, departments]);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Faculty Workload Analysis</CardTitle>
                    <CardDescription>
                        An overview of teaching hours across all faculty, compared to their department average.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Faculty</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Weekly Hours</TableHead>
                                <TableHead>Load Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.facultyLoadData.map(f => (
                                <TableRow key={f.facultyId}>
                                    <TableCell className="font-medium">{f.facultyName}</TableCell>
                                    <TableCell>{f.departmentName}</TableCell>
                                    <TableCell>{f.weeklyHours}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={getLoadBadgeVariant(f.loadStatus)}>{f.loadStatus}</Badge>
                                            <Progress value={f.loadPercentage > 150 ? 150 : f.loadPercentage} className="w-24 h-2" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {analysis.suggestions.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Redistribution Suggestions</CardTitle>
                        <CardDescription>
                            Based on workload analysis, consider reassigning these subjects to balance the load.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                           {analysis.suggestions.map((s, index) => (
                                <AccordionItem value={`item-${index}`} key={index}>
                                    <AccordionTrigger>
                                        Consider moving <strong>{s.subject.name}</strong> from {s.overloadedFaculty.name} to {s.underloadedFaculty.name}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                       <p><strong>Reasoning:</strong> {s.overloadedFaculty.name} is currently overloaded, while {s.underloadedFaculty.name} is underutilized. Both are qualified to teach this subject. Reassigning a section of this subject could help balance the workload within the department.</p>
                                    </AccordionContent>
                                </AccordionItem>
                           ))}
                        </Accordion>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
