
'use client';
import { useState, useEffect } from 'react';
import { getStudents } from '@/lib/services/students';
import { getFaculty } from '@/lib/services/faculty';
import type { Student, Faculty } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleGenerateCrest } from './actions';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

const ChampionCard = ({ user, role, achievement, onGenerate, crest, isGenerating }: {
    user: Student | Faculty,
    role: 'student' | 'faculty',
    achievement: string,
    onGenerate: () => void,
    crest: string | null,
    isGenerating: boolean
}) => {
    return (
        <Card className="flex flex-col items-center text-center p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
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

                <div className="mt-6 h-40 w-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                    {isGenerating ? (
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : crest && crest !== 'error' ? (
                        <Image src={crest} alt={`${user.name}'s Crest`} width={150} height={150} className="object-contain" />
                    ) : (
                         <p className="text-xs text-muted-foreground p-2">Click below to generate a unique crest!</p>
                    )}
                </div>

            </CardContent>
            <CardFooter>
                 <Button onClick={onGenerate} disabled={isGenerating}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {isGenerating ? 'Generating...' : 'Generate Crest'}
                 </Button>
            </CardFooter>
        </Card>
    );
};


export default function HallOfFamePage() {
    const [topStudent, setTopStudent] = useState<Student | null>(null);
    const [topFaculty, setTopFaculty] = useState<Faculty | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [studentCrest, setStudentCrest] = useState<string | null>(null);
    const [facultyCrest, setFacultyCrest] = useState<string | null>(null);
    const [isGeneratingStudentCrest, setIsGeneratingStudentCrest] = useState(false);
    const [isGeneratingFacultyCrest, setIsGeneratingFacultyCrest] = useState(false);
    const { toast } = useToast();

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

    const handleGenerationResult = (result: { crestDataUri: string }, role: 'student' | 'faculty') => {
        if (result.crestDataUri === 'error' || !result.crestDataUri) {
            toast({
                title: 'Crest Generation Failed',
                description: 'The AI could not generate a crest at this time. Please try again later.',
                variant: 'destructive',
            });
            if (role === 'student') setStudentCrest(null);
            else setFacultyCrest(null);
        } else {
            if (role === 'student') setStudentCrest(result.crestDataUri);
            else setFacultyCrest(result.crestDataUri);
        }
    }

    const generateStudentCrest = async () => {
        if (!topStudent) return;
        setIsGeneratingStudentCrest(true);
        setStudentCrest(null);
        try {
            const result = await handleGenerateCrest({
                name: topStudent.name,
                role: 'student',
                achievement: 'Top Attendance Streak'
            });
            handleGenerationResult(result, 'student');
        } catch (e) {
            handleGenerationResult({crestDataUri: 'error'}, 'student');
        } finally {
            setIsGeneratingStudentCrest(false);
        }
    };

    const generateFacultyCrest = async () => {
        if (!topFaculty) return;
        setIsGeneratingFacultyCrest(true);
        setFacultyCrest(null);
         try {
            const result = await handleGenerateCrest({
                name: topFaculty.name,
                role: 'faculty',
                achievement: 'Top Teaching Streak'
            });
            handleGenerationResult(result, 'faculty');
        } catch (e) {
            handleGenerationResult({crestDataUri: 'error'}, 'faculty');
        } finally {
            setIsGeneratingFacultyCrest(false);
        }
    };


    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div>
            <div className="text-center mb-12">
                 <h1 className="text-4xl font-bold font-headline tracking-tight">Hall of Fame</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto mt-2">
                    Celebrating the most dedicated members of our university community. Here are our current champions.
                </p>
            </div>
           
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {topFaculty ? (
                    <ChampionCard 
                        user={topFaculty} 
                        role="faculty" 
                        achievement="Top Teaching Streak"
                        onGenerate={generateFacultyCrest}
                        crest={facultyCrest}
                        isGenerating={isGeneratingFacultyCrest}
                    />
                ) : <p>No faculty data available.</p>}
                
                {topStudent ? (
                     <ChampionCard 
                        user={topStudent} 
                        role="student" 
                        achievement="Top Attendance Streak"
                        onGenerate={generateStudentCrest}
                        crest={studentCrest}
                        isGenerating={isGeneratingStudentCrest}
                    />
                ) : <p>No student data available.</p>}
            </div>
        </div>
    );
}
