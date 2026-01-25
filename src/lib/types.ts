
import { z } from 'zod';

export const WelcomeNotificationInputSchema = z.object({
  name: z.string(),
  role: z.enum(['student', 'faculty']),
  context: z.string().describe('The class or department the user is joining.'),
});

export type WelcomeNotificationInput = z.infer<
  typeof WelcomeNotificationInputSchema
>;

export const TestPaperQuestionSchema = z.object({
  questionText: z.string(),
  answer: z.string(),
  options: z.array(z.string()).optional(),
});

export const GenerateTestPaperInputSchema = z.object({
  subjectName: z.string().describe('The name of the subject.'),
  className: z.string().describe('The name of the class.'),
  topics: z.array(z.string()).describe('A list of topics to be covered.'),
  paperStyle: z
    .enum(['multiple_choice', 'short_answer', 'mixed'])
    .describe('The style of the test paper.'),
});
export type GenerateTestPaperInput = z.infer<
  typeof GenerateTestPaperInputSchema
>;

export const GenerateTestPaperOutputSchema = z.object({
  questions: z.array(TestPaperQuestionSchema),
});
export type GenerateTestPaperOutput = z.infer<
  typeof GenerateTestPaperOutputSchema
>;

const ScheduleConflictSchema = z.object({
    type: z.enum(['faculty', 'classroom', 'class']),
    message: z.string(),
});

const ScheduleSlotSchema = z.object({
  id: z.string(),
  classId: z.string(),
  className: z.string(),
  subjectId: z.string(),
  subjectName: z.string(),
  facultyId: z.string(),
  facultyName: z.string(),
  classroomId: z.string(),
  classroomName: z.string(),
  day: z.string(),
  time: z.string(),
});

export const ResolveConflictsInputSchema = z.object({
  schedule: z.array(ScheduleSlotSchema),
  conflicts: z.record(z.array(ScheduleConflictSchema)),
  faculty: z.array(z.object({ id: z.string(), name: z.string(), allottedSubjects: z.array(z.string()).optional() })),
  classrooms: z.array(z.object({ id: z.string(), name: z.string(), type: z.string(), capacity: z.number() })),
  students: z.array(z.object({ id: z.string(), name: z.string(), classId: z.string() })),
});
export type ResolveConflictsInput = z.infer<typeof ResolveConflictsInputSchema>;

const NotificationSchema = z.object({
    userId: z.string().optional(),
    classId: z.string().optional(),
    message: z.string(),
    category: z.enum(['requests', 'exam_schedule', 'general', 'feedback_forms']),
});

export const ResolveConflictsOutputSchema = z.object({
  summary: z.string().describe("A brief summary of the changes made to resolve the conflicts."),
  resolvedSchedule: z.array(ScheduleSlotSchema),
  notifications: z.array(NotificationSchema).describe("Notifications to be sent to affected faculty or students."),
});
export type ResolveConflictsOutput = z.infer<typeof ResolveConflictsOutputSchema>;

export const GenerateExamScheduleInputSchema = z.object({
  subjects: z.array(z.any()),
  classes: z.array(z.any()),
  classrooms: z.array(z.any()),
  examTimeSlots: z.array(z.string()),
});
export type GenerateExamScheduleInput = z.infer<typeof GenerateExamScheduleInputSchema>;

export const GenerateExamScheduleOutputSchema = z.object({
  summary: z.string(),
  generatedSchedule: z.array(z.object({
    subjectId: z.string(),
    classId: z.string(),
    date: z.string(),
    time: z.string(),
    classroomId: z.string(),
  })),
});
export type GenerateExamScheduleOutput = z.infer<typeof GenerateExamScheduleOutputSchema>;

export const GenerateSeatingArrangementInputSchema = z.object({
  classroom: z.any(),
  students: z.array(z.any()),
});
export type GenerateSeatingArrangementInput = z.infer<typeof GenerateSeatingArrangementInputSchema>;

export const GenerateSeatingArrangementOutputSchema = z.object({
  seatingArrangement: z.array(z.object({
    seatNumber: z.number(),
    studentId: z.string(),
    studentName: z.string(),
  })),
});
export type GenerateSeatingArrangementOutput = z.infer<typeof GenerateSeatingArrangementOutputSchema>;


const DepartmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string()
});

const ClassSchema = z.object({
    id: z.string(),
    name: z.string(),
    semester: z.number(),
    departmentId: z.string(),
    section: z.string(),
});

const SubjectSchema = z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    type: z.enum(['theory', 'lab']),
    semester: z.number(),
    syllabus: z.string().optional().nullable(),
    departmentId: z.string(),
    isSpecial: z.boolean().optional(),
    priority: z.enum(['Non Negotiable', 'High', 'Medium', 'Low']).nullable().optional(),
    weeklyHours: z.number().optional(),
});

const FacultySchema = z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    code: z.string(),
    departmentId: z.string(),
    designation: z.string(),
    employmentType: z.enum(['full-time', 'part-time', 'contract']),
    roles: z.array(z.string()),
    streak: z.number(),
    avatar: z.string().optional(),
    profileCompleted: z.number(),
    points: z.number(),
    allottedSubjects: z.array(z.string()).optional(),
    maxWeeklyHours: z.number().optional().nullable(),
    designatedYear: z.number().optional().nullable(),
    dateOfJoining: z.string().optional().nullable(),
});

export const GenerateTimetableInputSchema = z.object({
  days: z.array(z.string()),
  timeSlots: z.array(z.string()),
  classes: z.array(ClassSchema),
  subjects: z.array(SubjectSchema),
  faculty: z.array(FacultySchema),
  classrooms: z.array(z.any()),
  departments: z.array(DepartmentSchema),
  existingSchedule: z.array(z.any()).describe("The existing schedule for all other classes to avoid conflicts."),
});
export type GenerateTimetableInput = z.infer<typeof GenerateTimetableInputSchema>;

export const GenerateTimetableOutputSchema = z.object({
  summary: z.string(),
  facultyWorkload: z.array(z.object({
    facultyId: z.string(),
    facultyName: z.string(),
    experience: z.number(),
    level: z.string(),
    maxHours: z.number(),
    assignedHours: z.number(),
  })),
  semesterTimetables: z.array(z.object({
    semester: z.number(),
    timetable: z.array(z.object({
        day: z.string(),
        time: z.string(),
        classId: z.string(),
        subjectId: z.string(),
        facultyId: z.string(),
        classroomId: z.string(),
    }))
  })),
  codeChefDay: z.string(),
  error: z.string().optional(),
  optimizationExplanation: z.string().optional(),
});
export type GenerateTimetableOutput = z.infer<typeof GenerateTimetableOutputSchema>;

export type SubjectPriority = 'Non Negotiable' | 'High' | 'Medium' | 'Low';

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: 'theory' | 'lab';
  semester: number;
  syllabus?: string;
  departmentId: string;
  isSpecial?: boolean;
  priority?: SubjectPriority;
  weeklyHours?: number;
}

export interface Class {
  id: string;
  name: string;
  semester: number;
  departmentId: string;
  section: string;
}

export interface EnrichedClass extends Class {
    departmentName: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  rollNumber: number;
  batch?: number;
  phone?: string;
  category?: string;
  classId: string;
  avatar?: string;
  className?: string; // Optional: can be added when joining with classes table
  profileCompleted: number;
  sgpa: number;
  cgpa: number;
  streak: number;
  points: number;
}

export interface Faculty {
  id:string;
  name: string;
  email: string;
  code: string; // Used as Staff ID
  departmentId: string;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  roles: string[];
  streak: number;
  avatar?: string;
  profileCompleted: number;
  points: number;
  allottedSubjects?: string[];
  maxWeeklyHours?: number;
  designatedYear?: number;
  dateOfJoining?: string;
}

export type Permission = 
  | 'manage_subjects' 
  | 'manage_classes' 
  | 'manage_classrooms'
  | 'manage_faculty' 
  | 'manage_students' 
  | 'manage_schedule'
  | 'manage_requests'
  | 'manage_exams'
  | 'manage_attendance'
  | 'manage_fees'
  | 'manage_hostels'
  | 'manage_results';

export interface Admin {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'manager';
  permissions: (Permission | '*')[];
}

export interface Classroom {
  id: string;
  name: string;
  type: string;
  capacity: number;
  maintenanceStatus: 'available' | 'in_maintenance' | 'unavailable';
  building: string;
}

export interface Schedule {
  id: string;
  classId: string;
  subjectId: string;
  facultyId: string;
  classroomId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
  time: string; // e.g., "09:00 - 10:00"
}

export interface EnrichedSchedule extends Schedule {
    subjectName: string;
    facultyName: string;
    className: string;
    classroomName: string;
    classroomType: 'classroom' | 'lab';
    subjectIsSpecial: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'admin' | 'faculty' | 'student';
    requiresPasswordChange?: boolean;
    // For admins/managers, the 'permissions' and specific 'role' are nested
    permissions?: (Permission | '*')[];
}

export interface LeaveRequest {
  id: string;
  requesterId: string; // Can be facultyId or studentId
  requesterName: string;
  requesterRole: 'faculty' | 'student';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  type: 'academic' | 'hostel';
}

export interface ScheduleChangeRequest {
  id:string;
  scheduleId: string;
  facultyId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  requestedClassroomId?: string;
}

export interface NewSlotRequest {
    id: string;
    facultyId: string;
    classId: string;
    subjectId: string;
    classroomId: string;
    day: string;
    time: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface Notification {
  id: string;
  userId: string; // admin, FAC001, STU001, etc.
  message: string;
  category: 'requests' | 'exam_schedule' | 'general' | 'feedback_forms';
  isRead: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  userId: string;
  date: string;
  title: string;
  reminder: boolean;
  reminderTime?: string;
  createdAt: string;
}

export interface Fee {
    id: string;
    studentId: string;
    semester: number;
    feeType: 'tuition' | 'hostel' | 'transport' | 'exams' | 'fine' | 'misc';
    amount: number;
    dueDate: string;
    status: 'paid' | 'unpaid' | 'scholarship';
    transactionId?: string;
    paymentDate?: string;
}

export interface Hostel {
    id: string;
    name: string;
    blocks: string; // "A,B,C"
}

export interface Room {
    id: string;
    hostelId: string;
    roomNumber: string;
    block: string | null;
    floor: number;
    studentId: string | null;
}

export interface GatePass {
    id: string;
    studentId: string;
    requestDate: string;
    departureDate: string;
    arrivalDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface Exam {
    id: string;
    subjectId: string;
    classId: string;
    classroomId?: string;
    date: string;
    time: string;
    testId?: string;
}

export interface Attendance {
    id: string;
    scheduleId: string;
    studentId: string;
    date: string; // YYYY-MM-DD
    status: 'present' | 'absent' | 'disputed';
    isLocked: boolean;
    timestamp: string;
}

export interface EnrichedAttendance extends Attendance {
    studentName: string;
    className: string;
    subjectName: string;
    facultyName: string;
    day: string;
    time: string;
}

export interface EnrichedFee extends Fee {
    studentName: string;
    studentEnrollmentNumber: string;
}

export interface EnrichedRoom extends Room {
    studentName: string | null;
    hostelName: string;
}

export interface EnrichedExam extends Exam {
    subjectName: string;
    className: string;
    classroomName?: string;
}

export interface Result {
    id: string;
    studentId: string;
    subjectId: string;
    semester: number;
    marks: number | null;
    totalMarks: number | null;
    grade: string | null;
    examType: 'internal' | 'external';
}

export interface EnrichedResult extends Result {
    studentName: string;
    subjectName: string;
    subjectCode: string;
}

export interface SyllabusModule {
    name: string;
    topics: string[];
    weightage: string;
}

export interface Assignment {
  id: string;
  facultyId: string;
  classId: string;
  subjectId: string;
  title: string;
  description?: string;
  fileUrl?: string; // URL to the assignment file
  dueDate: string;
  type: 'assignment' | 'lab_manual';
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl: string; // URL to the submission file
  submittedAt: string;
  grade?: string; // e.g., 'A+', 'B', 'C' or marks '85/100'
  remarks?: string;
}

export interface EnrichedAssignment extends Assignment {
  subjectName: string;
  className: string;
  facultyName: string;
  submissionCount: number;
}

export interface EnrichedSubmission extends Submission {
  studentName: string;
  studentEnrollmentNumber: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  category: 'Academic' | 'Attendance' | 'Engagement';
  points: number;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeId: string;
  earnedAt: string;
}

export interface EnrichedUserBadge extends UserBadge {
  badge: Badge;
}
