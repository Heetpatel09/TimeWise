

'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Calendar, School, UserCheck, Users, LayoutGrid, Mail, PencilRuler, Trophy, Award, Warehouse, ArrowLeft, PlusSquare, Sparkles, UserCog, DollarSign, Home, FileText, CheckSquare, BarChart3 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SubjectsManager from './components/SubjectsManager';
import ClassesManager from './components/ClassesManager';
import ClassroomsManager from './components/ClassroomsManager';
import FacultyManager from './components/FacultyManager';
import StudentsManager from './components/StudentsManager';
import ScheduleManager from './components/ScheduleManager';
import LeaderboardManager from './components/LeaderboardManager';
import HallOfFamePage from './hall-of-fame/page';
import LeaveRequestsPage from './leave-requests/page';
import ScheduleRequestsPage from './schedule-requests/page';
import NewSlotRequestsPage from './components/NewSlotRequestsPage';
import AdminsManager from './components/AdminsManager';
import FeesManager from './components/FeesManager';
import HostelsManager from './components/HostelsManager';
import ExamsManager from './components/ExamsManager';
import AttendanceManager from './components/AttendanceManager';
import ResultsManager from './components/ResultsManager';
import { getStudents } from '@/lib/services/students';
import { getFaculty } from '@/lib/services/faculty';
import { getSchedule } from '@/lib/services/schedule';
import { getClasses } from '@/lib/services/classes';
import { getSubjects } from '@/lib/services/subjects';
import { getClassrooms } from '@/lib/services/classrooms';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';


const managementCards = [
  { tab: "subjects", title: "Subjects", icon: Book, description: "Manage all course subjects." },
  { tab: "classes", title: "Classes", icon: School, description: "Organize classes and semesters." },
  { tab: "classrooms", title: "Classrooms", icon: Warehouse, description: "Manage rooms and labs." },
  { tab: "admins", title: "Admins", icon: UserCog, description: "Manage administrator users." },
  { tab: "faculty", title: "Faculty", icon: UserCheck, description: "Handle faculty profiles." },
  { tab: "students", title: "Students", icon: Users, description: "Administer student records." },
  { tab: "schedule", title: "Schedule", icon: Calendar, description: "Create and view timetables." },
  { tab: "exams", title: "Exams", icon: FileText, description: "Manage exam timetables." },
  { tab: "attendance", title: "Attendance", icon: CheckSquare, description: "Review and lock attendance." },
  { tab: "fees", title: "Fees", icon: DollarSign, description: "Handle student fee payments." },
  { tab: "hostels", title: "Hostels", icon: Home, description: "Manage hostel room assignments." },
  { tab: "results", title: "Results", icon: BarChart3, description: "Upload and manage results." },
  { tab: "leaderboards", title: "Leaderboards", icon: Trophy, description: "View top performers." },
  { tab..." />
  <change>
    <file>src/lib/services/students.ts</file>
    <content><![CDATA[

'use server';

import { revalidatePath } from 'next/cache';
import { db as getDb } from '@/lib/db';
import type { Student } from '@/lib/types';
import { addCredential } from './auth';
import { generateWelcomeNotification } from '@/ai/flows/generate-welcome-notification-flow';
import { addNotification } from './notifications';
import { getClasses } from './classes';
import { randomBytes } from 'crypto';

function revalidateAll() {
    revalidatePath('/admin', 'layout');
    revalidatePath('/student', 'layout');
    revalidatePath('/faculty', 'layout');
}

export async function getStudents(): Promise<Student[]> {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM students');
  const results = stmt.all() as any[];
  // Ensure plain objects are returned
  return JSON.parse(JSON.stringify(results.map(s => ({ ...s, avatar: s.avatar || `https://avatar.vercel.sh/${s.email}.png` }))));
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM students WHERE classId = ?');
    const results = stmt.all(classId) as any[];
    return JSON.parse(JSON.stringify(results.map(s => ({ ...s, avatar: s.avatar || `https://avatar.vercel.sh/${s.email}.png` }))));
}

export async function addStudent(
    item: Omit<Student, 'id' | 'streak' | 'profileCompleted' | 'sgpa' | 'cgpa'> & { streak?: number, profileCompleted?: number, sgpa?: number, cgpa?: number },
    password?: string
) {
    const db = getDb();
    const id = `STU${Date.now()}`;
    const newItem: Student = {
        ...item,
        id,
        streak: item.streak || 0,
        avatar: item.avatar || `https://avatar.vercel.sh/${item.email}.png`,
        profileCompleted: item.profileCompleted || 0,
        sgpa: item.sgpa || 0,
        cgpa: item.cgpa || 0,
    };

    const stmt = db.prepare('INSERT INTO students (id, name, email, classId, streak, avatar, profileCompleted, sgpa, cgpa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    stmt.run(id, newItem.name, newItem.email, newItem.classId, newItem.streak, newItem.avatar, newItem.profileCompleted, newItem.sgpa, newItem.cgpa);

    // When adding a student via the admin UI, an initial password is required.
    const initialPassword = password || randomBytes(8).toString('hex');
    await addCredential({
      userId: newItem.id,
      email: newItem.email,
      password: initialPassword,
      role: 'student',
      requiresPasswordChange: true
    });
    
    // Generate welcome notification
    try {
        const classes = await getClasses();
        const className = classes.find(c => c.id === newItem.classId)?.name || 'their new class';
        const notificationResult = await generateWelcomeNotification({
            name: newItem.name,
            role: 'student',
            context: className
        });
        await addNotification({
            userId: newItem.id,
            message: notificationResult.message,
            category: 'general'
        });
    } catch (e: any) {
        console.error("Failed to generate welcome notification for student:", e.message);
    }

    revalidateAll();
    return Promise.resolve({ ...newItem, initialPassword: password ? undefined : initialPassword });
}

export async function updateStudent(updatedItem: Student): Promise<Student> {
    const db = getDb();
    const oldStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(updatedItem.id) as Student | undefined;

    if (!oldStudent) {
        throw new Error("Student not found.");
    }
    
    const stmt = db.prepare('UPDATE students SET name = ?, email = ?, classId = ?, streak = ?, avatar = ?, profileCompleted = ?, sgpa = ?, cgpa = ? WHERE id = ?');
    stmt.run(updatedItem.name, updatedItem.email, updatedItem.classId, updatedItem.streak, updatedItem.avatar, updatedItem.profileCompleted, updatedItem.sgpa, updatedItem.cgpa, updatedItem.id);
    
    if (oldStudent.email !== updatedItem.email) {
         await addCredential({
            userId: updatedItem.id,
            email: updatedItem.email,
            role: 'student',
        });
    }

    revalidateAll();
    const finalStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(updatedItem.id) as Student;
    return Promise.resolve(finalStudent);
}

export async function deleteStudent(id: string) {
    const db = getDb();
    
    const credStmt = db.prepare('DELETE FROM user_credentials WHERE userId = ?');
    credStmt.run(id);

    const stmt = db.prepare('DELETE FROM students WHERE id = ?');
    stmt.run(id);

    revalidateAll();
    return Promise.resolve(id);
}

    