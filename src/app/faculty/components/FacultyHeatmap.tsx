
'use client';

import { useMemo } from 'react';
import type { Faculty, Schedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TIME_SLOTS = [
    '07:30 AM - 08:25 AM', '08:25 AM - 09:20 AM', '09:30 AM - 10:25 AM', '10:25 AM - 11:20 AM',
    '12:20 PM - 01:15 PM', '01:15 PM - 02:10 PM'
];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface HeatmapCell {
    status: 'free' | 'normal' | 'overload';
    details: string[];
}

export default function FacultyHeatmap({ schedule, faculty, isAdminView = false }: { schedule: Schedule[], faculty: Faculty, isAdminView?: boolean }) {
    
    const { heatmapData, summary } = useMemo(() => {
        const data: Record<string, Record<string, HeatmapCell>> = {};
        let totalHours = 0;
        const dailyHours: Record<string, number> = {};

        // Initialize grid and daily hours
        DAYS.forEach(day => {
            data[day] = {};
            dailyHours[day] = 0;
            TIME_SLOTS.forEach(time => {
                data[day][time] = { status: 'free', details: [] };
            });
        });
        
        // Populate grid
        schedule.forEach(slot => {
            if (data[slot.day] && data[slot.day][slot.time]) {
                data[slot.day][slot.time] = { status: 'normal', details: [`Class ID: ${slot.classId}`, `Subject ID: ${slot.subjectId}`]};
                totalHours++;
                dailyHours[slot.day]++;
            }
        });
        
        // Detect overloads
        let maxConsecutive = 0;
        DAYS.forEach(day => {
            let currentConsecutive = 0;
            TIME_SLOTS.forEach(time => {
                if (data[day][time].status === 'normal') {
                    currentConsecutive++;
                } else {
                    if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
                    currentConsecutive = 0;
                }
            });
             if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;

            // Mark overloads
            if (dailyHours[day] > 4) {
                 TIME_SLOTS.forEach(time => {
                    if (data[day][time].status === 'normal') data[day][time].status = 'overload';
                 });
            }
            if (currentConsecutive > 2) {
                 TIME_SLOTS.forEach(time => {
                    if (data[day][time].status === 'normal') data[day][time].status = 'overload';
                 });
            }
        });

        const dailySummary = DAYS.map(day => `${day}: ${dailyHours[day]}h`).join(', ');

        return {
            heatmapData: data,
            summary: {
                totalHours,
                dailyDistribution: dailySummary,
                maxConsecutive,
            }
        };

    }, [schedule]);

    const getStatusColor = (status: 'free' | 'normal' | 'overload') => {
        switch (status) {
            case 'free': return 'bg-green-100 dark:bg-green-900/40';
            case 'normal': return 'bg-yellow-100 dark:bg-yellow-800/40';
            case 'overload': return 'bg-red-200 dark:bg-red-900/40';
        }
    };

    return (
         <Card>
            <CardHeader>
                <CardTitle>{isAdminView ? `${faculty.name}'s Heatmap` : 'My Weekly Heatmap'}</CardTitle>
                <CardDescription>
                    A visual representation of your teaching load throughout the week.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold mb-2">
                    <div></div> {/* Empty corner */}
                    {DAYS.map(day => <div key={day}>{day.substring(0,3)}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                     <div className="flex flex-col gap-1 text-xs text-muted-foreground text-right">
                        {TIME_SLOTS.map(time => <div key={time} className="h-10 flex items-center justify-end pr-2">{time.split(' - ')[0]}</div>)}
                     </div>
                     {DAYS.map(day => (
                         <div key={day} className="flex flex-col gap-1">
                             {TIME_SLOTS.map(time => (
                                <TooltipProvider key={time}>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={cn("h-10 w-full rounded-md", getStatusColor(heatmapData[day][time].status))} />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="capitalize">{heatmapData[day][time].status}</p>
                                            {heatmapData[day][time].details.map((d,i) => <p key={i} className="text-xs">{d}</p>)}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                             ))}
                         </div>
                     ))}
                </div>
                 <div className="flex gap-4 mt-4 text-sm justify-center">
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-green-100 border"></div>Free</div>
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-yellow-100 border"></div>Normal</div>
                    <div className="flex items-center gap-2"><div className="h-4 w-4 rounded bg-red-200 border"></div>Overload</div>
                </div>

                {isAdminView && (
                    <Card className="mt-6">
                        <CardHeader><CardTitle className="text-lg">Load Summary</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <p><strong>Total Weekly Hours:</strong> {summary.totalHours}</p>
                            <p><strong>Daily Distribution:</strong> {summary.dailyDistribution}</p>
                            <p><strong>Longest Consecutive Session:</strong> {summary.maxConsecutive} hours</p>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    )
}
