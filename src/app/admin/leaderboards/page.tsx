
'use client';
import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { getLeaderboardData } from '@/lib/services/streaks';
import { getClasses } from '@/lib/services/classes';
import type { Student, Faculty, Class } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TrophyIcon = ({ rank }: { rank: number }) => {
    let colorClass = '';
    if (rank === 1) colorClass = 'text-yellow-500';
    else if (rank === 2) colorClass = 'text-gray-400';
    else if (rank === 3) colorClass = 'text-yellow-700';
    if (rank > 3) return null;

    return <Trophy className={`h-5 w-5 ${colorClass}`} />;
};

type UserData = (Student | Faculty) & { points: number };

function LeaderboardTable({ users }: { users: UserData[] }) {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className='w-12'>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user, index) => (
                    <TableRow key={user.id}>
                        <TableCell className="font-bold text-lg text-center">
                            <div className="flex items-center gap-2">
                                <span>{index + 1}</span>
                                <TrophyIcon rank={index + 1} />
                            </div>
                        </TableCell>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={user.avatar || `https://avatar.vercel.sh/${user.email}.png`} alt={user.name} />
                                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <div className="font-bold">{user.name}</div>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>{(user as any).department || 'N/A'}</TableCell>
                        <TableCell className="text-right font-bold text-lg">{user.points}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}


export default function LeaderboardsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [faculty, setFaculty] = useState<Faculty[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [department, setDepartment] = useState('all');
    const [batch, setBatch] = useState('all');
    
    const departments = ['all', ...new Set(classes.map(c => c.department))];
    const batches = ['all', ...new Set(students.map(s => String(s.batch)))];

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const [studentData, facultyData, classData] = await Promise.all([
                getLeaderboardData('student', department === 'all' ? undefined : department, batch === 'all' ? undefined : batch),
                getLeaderboardData('faculty', department === 'all' ? undefined : department),
                getClasses(),
            ]);
            setStudents(studentData as Student[]);
            setFaculty(facultyData as Faculty[]);
            setClasses(classData);
            setIsLoading(false);
        }
        loadData();
    }, [department, batch]);

    if (isLoading) {
        return (
             <DashboardLayout pageTitle="Admin / Leaderboards" role="admin">
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
             </DashboardLayout>
        )
    }

    return (
        <DashboardLayout pageTitle="Admin / Leaderboards" role="admin">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <Card>
                <CardHeader>
                    <CardTitle>University Leaderboards</CardTitle>
                    <CardDescription>Top rankings based on points earned from achievements and activities.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="students">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                            <TabsList>
                                <TabsTrigger value="students">Students</TabsTrigger>
                                <TabsTrigger value="faculty">Faculty</TabsTrigger>
                            </TabsList>
                            <div className="flex gap-2">
                                <Select value={department} onValueChange={setDepartment}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                 <Select value={batch} onValueChange={setBatch}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Batch" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {batches.map(b => <SelectItem key={b} value={b} className="capitalize">{b}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <TabsContent value="students">
                           <LeaderboardTable users={students} />
                        </TabsContent>
                        <TabsContent value="faculty">
                           <LeaderboardTable users={faculty} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

        </DashboardLayout>
    );
}

