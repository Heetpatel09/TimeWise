

export interface Subject {
  id: string;
  name: string;
  code: string;
}

export interface Class {
  id: string;
  name: string;
  year: number;
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
}

export interface Faculty {
  id:string;
  name: string;
  email: string;
  department: string;
  streak: number;
  avatar?: string;
  isSubstitute?: boolean;
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
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'admin' | 'faculty' | 'student';
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

export interface Notification {
  id: string;
  userId: string; // admin, FAC001, STU001, etc.
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SubstituteAssignment {
    id: string;
    scheduleId: string;
    originalFacultyId: string;
    substituteFacultyId: string;
    date: string; // YYYY-MM-DD
    status: 'pending' | 'approved' | 'rejected';
}
