

export interface Subject {
  id: string;
  name: string;
  code: string;
  isSpecial?: boolean;
  type: 'theory' | 'lab';
  semester: number;
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
  classId: string;
  streak: number;
  avatar?: string;
  className?: string; // Optional: can be added when joining with classes table
  profileCompleted: number;
  sgpa: number;
  cgpa: number;
}

export interface Faculty {
  id:string;
  name: string;
  email: string;
  department: string;
  streak: number;
  avatar?: string;
  profileCompleted: number;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Classroom {
  id: string;
  name: string;
  type: 'classroom' | 'lab';
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
    amount: number;
    dueDate: string;
    status: 'paid' | 'unpaid';
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
    studentId: string | null;
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
    className: string;
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
    marks: number;
    totalMarks: number;
    grade: string;
}

export interface EnrichedResult extends Result {
    studentName: string;
    subjectName: string;
    subjectCode: string;
}

    