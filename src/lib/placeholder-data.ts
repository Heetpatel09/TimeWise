import type { Subject, Class, Student, Faculty, Schedule, LeaveRequest, ScheduleChangeRequest, Notification, Classroom } from './types';

export const subjects: Subject[] = [
  { id: 'SUB001', name: 'Introduction to Computer Science', code: 'CS101' },
  { id: 'SUB002', name: 'Data Structures and Algorithms', code: 'CS201' },
  { id: 'SUB003', name: 'Database Management Systems', code: 'CS301' },
  { id: 'SUB004', name: 'Operating Systems', code: 'CS302' },
  { id: 'SUB005', name: 'Machine Learning', code: 'AI401' },
];

export const classes: Class[] = [
  { id: 'CLS001', name: 'FE COMP', year: 1, department: 'Computer Engineering' },
  { id: 'CLS002', name: 'SE COMP', year: 2, department: 'Computer Engineering' },
  { id: 'CLS003', name: 'TE COMP', year: 3, department: 'Computer Engineering' },
  { id: 'CLS004', name: 'BE COMP', year: 4, department: 'Computer Engineering' },
];

export const classrooms: Classroom[] = [
  { id: 'CR001', name: 'A-101' },
  { id: 'CR002', name: 'A-102' },
  { id: 'CR003', name: 'B-205 (Lab)' },
  { id: 'CR004', name: 'C-301 (Hall)' },
]

export const students: Student[] = [
  { id: 'STU001', name: 'Alice Johnson', email: 'alice@example.com', classId: 'CLS004', streak: 12 },
  { id: 'STU002', name: 'Bob Williams', email: 'bob@example.com', classId: 'CLS003', streak: 5 },
  { id: 'STU003', name: 'Charlie Brown', email: 'charlie@example.com', classId: 'CLS004', streak: 23 },
];

export const faculty: Faculty[] = [
  { id: 'FAC001', name: 'Dr. Alan Turing', email: 'turing@example.com', department: 'Computer Engineering', streak: 45 },
  { id: 'FAC002', name: 'Dr. Ada Lovelace', email: 'lovelace@example.com', department: 'Computer Engineering', streak: 8 },
  { id: 'FAC003', name: 'Dr. Grace Hopper', email: 'hopper@example.com', department: 'Computer Engineering', streak: 15 },
];

export const schedule: Schedule[] = [
  { id: 'SCH001', classId: 'CLS004', subjectId: 'SUB005', facultyId: 'FAC001', classroomId: 'CR001', day: 'Monday', time: '09:00 - 10:00' },
  { id: 'SCH002', classId: 'CLS004', subjectId: 'SUB003', facultyId: 'FAC002', classroomId: 'CR002', day: 'Monday', time: '10:00 - 11:00' },
  { id: 'SCH003', classId: 'CLS003', subjectId: 'SUB002', facultyId: 'FAC003', classroomId: 'CR003', day: 'Tuesday', time: '11:00 - 12:00' },
  { id: 'SCH004', classId: 'CLS004', subjectId: 'SUB004', facultyId: 'FAC003', classroomId: 'CR001', day: 'Wednesday', time: '14:00 - 15:00' },
  // Intentional conflict for demo purposes
  { id: 'SCH005', classId: 'CLS002', subjectId: 'SUB001', facultyId: 'FAC001', classroomId: 'CR002', day: 'Monday', time: '09:00 - 10:00' },
];

export const leaveRequests: LeaveRequest[] = [
  { id: 'LR001', requesterId: 'FAC002', requesterName: 'Dr. Ada Lovelace', requesterRole: 'faculty', startDate: '2024-08-01', endDate: '2024-08-05', reason: 'Family wedding.', status: 'pending' },
  { id: 'LR002', requesterId: 'FAC003', requesterName: 'Dr. Grace Hopper', requesterRole: 'faculty', startDate: '2024-08-10', endDate: '2024-08-12', reason: 'Attending a conference.', status: 'pending' },
  { id: 'LR003', requesterId: 'FAC001', requesterName: 'Dr. Alan Turing', requesterRole: 'faculty', startDate: '2024-07-20', endDate: '2024-07-21', reason: 'Personal reasons.', status: 'approved' },
  { id: 'LR004', requesterId: 'STU001', requesterName: 'Alice Johnson', requesterRole: 'student', startDate: '2024-08-02', endDate: '2024-08-03', reason: 'Medical appointment.', status: 'pending' },
];

export const scheduleChangeRequests: ScheduleChangeRequest[] = [
    { id: 'SCR001', scheduleId: 'SCH001', facultyId: 'FAC001', reason: 'Need to swap this class with my afternoon slot.', status: 'pending' },
    { id: 'SCR002', scheduleId: 'SCH002', facultyId: 'FAC002', reason: 'Lab equipment is unavailable.', status: 'pending', requestedClassroomId: 'CR001' },
];

export const notifications: Notification[] = [
    { id: 'NOT001', userId: 'FAC001', message: 'Your leave request from 2024-07-20 to 2024-07-21 has been approved.', isRead: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];
