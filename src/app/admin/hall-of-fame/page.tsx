
'use client';
import { useState, useEffect } from 'react';
import { getStudents } from '@/lib/services/students';
import { getFaculty } from '@/lib/services/faculty';
import type { Student, Faculty } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Crown } from 'lucide-react';

const ChampionCard = ({ user, role, achievement }: {
    user: Student | Faculty,
    role: 'student' | 'faculty',
    achievement: string,
}) => {
    return (
        <Card className="flex flex-col items-center text-center p-6 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <CardHeader className="p-0">
                <Crown className="w-12 h-12 text-yellow-500 mx-auto" />
                <CardTitle className="text-2xl mt-4">{user.name}</CardTitle>
                <CardDescription className="capitalize">{role} - {achievement}</CardDescription>
            </CardHeader>
            <CardContent className="mt-4 flex-grow flex flex-col items-center justify-center">
                 <Avatar className="w-24 h-24 mb-4 border-4 border-yellow-400">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <p className="text-4xl font-bold text-primary">{user.streak}</p>
                <p className="text-muted-foreground">Day Streak</p>
            </CardContent>
        </Card>
    );
};


export default function HallOfFamePage() {
    const [topStudent, setTopStudent] = useState<Student | null>(null);
    const [topFaculty, setTopFaculty] = useState<Faculty | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const [studentData, facultyData] = await Promise.all([
                getStudents(),
                getFaculty(),
            ]);
            setTopStudent([...studentData].sort((a, b) => b.streak - a.streak)[0] || null);
            setTopFaculty([...facultyData].sort((a, b) => b.streak - a.streak)[0] || null);
            setIsLoading(false);
        }
        loadData();
    }, []);

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div>
            <div className="text-center mb-12 animate-in fade-in slide-in-from-top-12 duration-500">
                 <h1 className="text-4xl font-bold font-headline tracking-tight">Hall of Fame</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    Celebrating the most dedicated members of our university community. Here are our current champions.
                </p>
            </div>
           
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-12 duration-500">
                {topFaculty ? (
                    <ChampionCard 
                        user={topFaculty} 
                        role="faculty" 
                        achievement="Top Teaching Streak"
                    />
                ) : <p>No faculty data available.</p>}
                
                {topStudent ? (
                     <ChampionCard 
                        user={topStudent} 
                        role="student" 
                        achievement="Top Attendance Streak"
                    />
                ) : <p>No student data available.</p>}
            </div>
        </div>
    );
}
