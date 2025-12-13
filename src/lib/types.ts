

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: string;
  semester: number;
  syllabus?: string;
  department?: string;
  isSpecial?: boolean;
}

export interface Class {
  id: string;
  name: string;
  semester: number;
  department: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  enrollmentNumber: string;
  rollNumber: number;
  section: string;
  batch: number;
  phone: string;
  category: string;
  classId: string;
  avatar?: string;
  className?: string; // Optional: can be added when joining with classes table
  profileCompleted: number;
  sgpa: number;
  cgpa: number;
  streak: number;
}

export interface Faculty {
  id:string;
  name: string;
  email: string;
  code: string;
  department: string;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  roles: string[];
  streak: number;
  avatar?: string;
  profileCompleted: number;
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
  permissions: Permission[];
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
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
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
    

    

