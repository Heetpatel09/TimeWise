
'use client';
import { useState, useEffect } from 'react';
import { getStudents } from '@/lib/services/students';
import { getFaculty } from '@/lib/services/faculty';
import type { Student, Faculty } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Trophy } from 'lucide-react';

const TrophyIcon = ({ rank }: { rank: number }) => {
    let colorClass = '';
    if (rank === 1) colorClass = 'text-yellow-500';
    else if (rank === 2) colorClass = 'text-gray-400';
    else if (rank === 3) colorClass = 'text-yellow-700';
    if (rank > 3) return null;

    return <Trophy className={`h-5 w-5 ${colorClass}`} />;
};

export default function LeaderboardManager() {
    const [students, setStudents] = useState<Student[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const [studentData, facultyData] = await Promise.all([
                getStudents(),
                getFaculty(),
            ]);
            setStudents(studentData.sort((a, b) => b.streak - a.streak));
            setFaculty(facultyData.sort((a, b) => b.streak - a.streak));
            setIsLoading(false);
        }
        loadData();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="grid md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Faculty Teaching Streak</CardTitle>
                    <CardDescription>Top faculty members by consecutive teaching days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-12'>Rank</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Streak</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {faculty.slice(0, 10).map((fac, index) => (
                                <TableRow key={fac.id}>
                                    <TableCell className="font-bold text-lg text-center">
                                        <div className="flex items-center gap-2">
                                            <span>{index + 1}</span>
                                            <TrophyIcon rank={index + 1} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                         <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://avatar.vercel.sh/${fac.email}.png`} alt={fac.name} />
                                                <AvatarFallback>{fac.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-bold">{fac.name}</div>
                                                <div className="text-sm text-muted-foreground">{fac.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">{fac.streak}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Student Attendance Streak</CardTitle>
                    <CardDescription>Top students by consecutive class attendance.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='w-12'>Rank</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="text-right">Streak</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.slice(0, 10).map((student, index) => (
                                <TableRow key={student.id}>
                                    <TableCell className="font-bold text-lg text-center">
                                        <div className="flex items-center gap-2">
                                            <span>{index + 1}</span>
                                            <TrophyIcon rank={index + 1} />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={`https://avatar.vercel.sh/${student.email}.png`} alt={student.name} />
                                                <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-bold">{student.name}</div>
                                                <div className="text-sm text-muted-foreground">{student.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">{student.streak}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
