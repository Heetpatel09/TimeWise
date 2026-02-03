
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Trophy } from 'lucide-react';
import { getClassLeaderboard } from '../actions';
import type { Student } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface LeaderboardDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    student: Student;
}

const TrophyIcon = ({ rank }: { rank: number }) => {
    let colorClass = '';
    if (rank === 1) colorClass = 'text-yellow-400';
    else if (rank === 2) colorClass = 'text-gray-400';
    else if (rank === 3) colorClass = 'text-amber-600';
    if (rank > 3) return null;

    return <Trophy className={`h-4 w-4 ${colorClass}`} />;
};

export default function LeaderboardDialog({ isOpen, onOpenChange, student }: LeaderboardDialogProps) {
    const { data: leaderboardData, isLoading } = useQuery({
        queryKey: ['classLeaderboard', student.classId],
        queryFn: () => getClassLeaderboard(student.classId),
        enabled: !!student.classId,
    });

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Class Leaderboards</DialogTitle>
                    <DialogDescription>See how you rank against your classmates.</DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <Tabs defaultValue="cgpa">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="cgpa">CGPA</TabsTrigger>
                            <TabsTrigger value="attendance">Attendance</TabsTrigger>
                        </TabsList>
                        <TabsContent value="cgpa">
                            <div className="max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16 text-center">Rank</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead className="text-right">CGPA</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboardData?.cgpaLeaderboard.map((s, index) => (
                                            <TableRow key={s.id} className={cn(s.id === student.id && "bg-primary/10")}>
                                                <TableCell className="font-bold text-lg text-center">
                                                     <div className="flex items-center justify-center gap-2">
                                                        <span>{index + 1}</span>
                                                        <TrophyIcon rank={index + 1} />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={s.avatar} alt={s.name} />
                                                            <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{s.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">{s.cgpa.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                         <TabsContent value="attendance">
                            <div className="max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-16 text-center">Rank</TableHead>
                                            <TableHead>Student</TableHead>
                                            <TableHead className="text-right">Attendance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leaderboardData?.attendanceLeaderboard.map((s, index) => (
                                            <TableRow key={s.id} className={cn(s.id === student.id && "bg-primary/10")}>
                                                <TableCell className="font-bold text-lg text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span>{index + 1}</span>
                                                        <TrophyIcon rank={index + 1} />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                     <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={s.avatar} alt={s.name} />
                                                            <AvatarFallback>{s.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span>{s.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">{s.attendancePercentage.toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}


                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
