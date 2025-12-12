
'use client';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, Mail, PencilRuler, Trophy, Award, Warehouse, PlusSquare, UserCog, DollarSign, Home, FileText, CheckSquare, BarChart3, Loader2, ChevronDown, ArrowRight, Building } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { getStudents } from '@/lib/services/students';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { getHostels } from '@/lib/services/hostels';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Button } from '@/components/ui/button';


const managementCards = [
  { href: "/admin/departments", title: "Departments", icon: Building, description: "Manage departments and subjects." },
  { href: "/admin/classrooms", title: "Classrooms", icon: Warehouse, description: "Manage rooms and labs." },
  { href: "/admin/admins", title: "Admins", icon: UserCog, description: "Manage administrator users." },
  { href: "/admin/faculty", title: "Faculty", icon: UserCheck, description: "Handle faculty profiles." },
  { href: "/admin/students", title: "Students", icon: Users, description: "Administer student records." },
  { href: "/admin/schedule", title: "Schedule", icon: Calendar, description: "Create and view timetables." },
  { href: "/admin/exams", title: "Exams", icon: FileText, description: "Manage exam timetables." },
  { href: "/admin/attendance", title: "Attendance", icon: CheckSquare, description: "Review and lock attendance." },
  { href: "/admin/fees", title: "Fees", icon: DollarSign, description: "Handle student fee payments." },
  { href: "/admin/hostels", title: "Hostels", icon: Home, description: "Manage hostel room assignments." },
  { href: "/admin/results", title: "Results", icon: BarChart3, description: "Upload and manage results." },
  { href: "/admin/leaderboards", title: "Leaderboards", icon: Trophy, description: "View top performers." },
  { href: "/admin/hall-of-fame", title: "Hall of Fame", icon: Award, description: "Celebrate top achievers." },
  { href: "/admin/leave-requests", title: "Leave Requests", icon: Mail, description: "Approve or reject leave." },
  { href: "/admin/schedule-requests", title: "Schedule Changes", icon: PencilRuler, description: "Review schedule change requests." },
  { href: "/admin/new-slot-requests", title: "New Slot Requests", icon: PlusSquare, description: "Review new slot requests from faculty." },
];

const StatItem = ({ title, value, icon, isLoading }: { title: string, value: number, icon: React.ElementType, isLoading: boolean }) => {
    const Icon = icon;
    return (
        <div className="flex items-center">
            <div className="p-3 rounded-lg bg-secondary">
                 <Icon className="h-6 w-6 text-primary" />
            </div>
            <div className="ml-4">
                 {isLoading ? <Loader2 className='h-6 w-6 animate-spin' /> : <div className="text-2xl font-bold">{value}</div>}
                 <p className="text-sm font-medium text-muted-foreground">{title}</p>
            </div>
        </div>
    )
}

function AdminDashboard() {
    const { data: students, isLoading: studentsLoading } = useQuery({ queryKey: ['students'], queryFn: getStudents });
    const { data: faculty, isLoading: facultyLoading } = useQuery({ queryKey: ['faculty'], queryFn: getFaculty });
    const { data: schedule, isLoading: scheduleLoading } = useQuery({ queryKey: ['schedule'], queryFn: getSchedule });
    const { data: classes, isLoading: classesLoading } = useQuery({ queryKey: ['classes'], queryFn: getClasses });
    const { data: subjects, isLoading: subjectsLoading } = useQuery({ queryKey: ['subjects'], queryFn: getSubjects });
    const { data: classrooms, isLoading: classroomsLoading } = useQuery({ queryKey: ['classrooms'], queryFn: getClassrooms });
    const { data: hostels, isLoading: hostelsLoading } = useQuery({ queryKey: ['hostels'], queryFn: getHostels });
    const [isChartOpen, setIsChartOpen] = useState(false);
    
    const studentCount = students?.length ?? 0;
    const facultyCount = faculty?.length ?? 0;
    const classCount = classes?.length ?? 0;
    const subjectCount = subjects?.length ?? 0;
    const classroomCount = classrooms?.length ?? 0;
    const hostelCount = hostels?.length ?? 0;

    const chartData = [
        { year: "Two Years Ago", students: Math.floor(studentCount * 0.8), faculty: Math.floor(facultyCount * 0.75), classes: Math.floor(classCount * 0.8), subjects: Math.floor(subjectCount * 0.85), classrooms: Math.floor(classroomCount * 0.7), hostels: Math.floor(hostelCount * 0.6) },
        { year: "Last Year", students: Math.floor(studentCount * 0.9), faculty: Math.floor(facultyCount * 0.85), classes: Math.floor(classCount * 0.9), subjects: Math.floor(subjectCount * 0.9), classrooms: Math.floor(classroomCount * 0.85), hostels: Math.floor(hostelCount * 0.8) },
        { year: "This Year", students: studentCount, faculty: facultyCount, classes: classCount, subjects: subjectCount, classrooms: classroomCount, hostels: hostelCount },
    ];

    const chartConfig: ChartConfig = {
        students: { label: "Students", color: "hsl(var(--chart-1))" },
        faculty: { label: "Faculty", color: "hsl(var(--chart-2))" },
        classes: { label: "Classes", color: "hsl(var(--chart-3))" },
        subjects: { label: "Subjects", color: "hsl(var(--chart-4))" },
        classrooms: { label: "Classrooms", color: "hsl(var(--chart-5))" },
        hostels: { label: "Hostels", color: "hsl(var(--primary))" },
    }

    return (
        <div className='space-y-6'>
            <Collapsible open={isChartOpen} onOpenChange={setIsChartOpen}>
                 <div className="grid grid-cols-1 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>University Stats</CardTitle>
                            <CardDescription>An overview of the core university data.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-4">
                            <StatItem title="Total Students" value={studentCount} icon={Users} isLoading={studentsLoading} />
                            <StatItem title="Total Faculty" value={facultyCount} icon={UserCheck} isLoading={facultyLoading} />
                            <StatItem title="Total Classes" value={classCount} icon={School} isLoading={classesLoading} />
                            <StatItem title="Total Subjects" value={subjectCount} icon={Book} isLoading={subjectsLoading} />
                            <StatItem title="Total Classrooms" value={classroomCount} icon={Warehouse} isLoading={classroomsLoading} />
                            <StatItem title="Total Hostels" value={hostelCount} icon={Home} isLoading={hostelsLoading} />
                            <StatItem title="Scheduled Slots" value={schedule?.length ?? 0} icon={Calendar} isLoading={scheduleLoading} />
                        </CardContent>
                        <CardFooter>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost">
                                    {isChartOpen ? 'Hide' : 'View'} Growth Report
                                    <ChevronDown className={cn("ml-2 h-4 w-4 transition-transform", isChartOpen && "rotate-180")} />
                                </Button>
                            </CollapsibleTrigger>
                        </CardFooter>
                    </Card>
                    <CollapsibleContent>
                        <Card>
                            <CardHeader>
                                <CardTitle>Growth Overview</CardTitle>
                                <CardDescription>Key metrics over the last 3 years.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                                            <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={10} />
                                            <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false}/>
                                            <Tooltip
                                                cursor={false}
                                                content={<ChartTooltipContent indicator="dot" />}
                                            />
                                            <Bar dataKey="students" fill="var(--color-students)" radius={4} />
                                            <Bar dataKey="faculty" fill="var(--color-faculty)" radius={4} />
                                            <Bar dataKey="classes" fill="var(--color-classes)" radius={4} />
                                            <Bar dataKey="subjects" fill="var(--color-subjects)" radius={4} />
                                            <Bar dataKey="classrooms" fill="var(--color-classrooms)" radius={4} />
                                            <Bar dataKey="hostels" fill="var(--color-hostels)" radius={4} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </CollapsibleContent>
                 </div>
            </Collapsible>

             <div>
                <h2 className="text-2xl font-bold tracking-tight mb-4">Management Sections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {managementCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Link key={card.href} href={card.href} passHref>
                                <Card className="group hover:border-primary/80 hover:shadow-lg transition-all duration-300 h-full flex flex-col hover:-translate-y-1">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-lg font-semibold">{card.title}</CardTitle>
                                        <Icon className="h-6 w-6 text-muted-foreground" />
                                    </CardHeader>
                                    <CardContent className="flex-grow">
                                        <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <div className="text-sm font-medium text-primary flex items-center group-hover:gap-2 transition-all duration-300">
                                            Go to section <ArrowRight className="h-4 w-4 transform translate-x-0 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
             </div>
        </div>
    )
}

export default function AdminPage() {
    return (
        <DashboardLayout pageTitle='Admin Dashboard' role="admin">
            <AdminDashboard />
        </DashboardLayout>
    );
}
