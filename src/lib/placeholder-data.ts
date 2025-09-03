import type { Subject, Class, Student, Faculty, Schedule, LeaveRequest, ScheduleChangeRequest, Notification, Classroom } from './types';

export const subjects: Subject[] = [
  { id: 'SUB001', name: 'Introduction to Computer Science', code: 'CS101', isSpecial: true, type: 'theory', semester: 1 },
  { id: 'SUB002', name: 'Data Structures and Algorithms', code: 'CS201', isSpecial: false, type: 'lab', semester: 3 },
  { id: 'SUB003', name: 'Database Management Systems', code: 'CS301', isSpecial: false, type: 'theory', semester: 5 },
  { id: 'SUB004', name: 'Operating Systems', code: 'CS302', isSpecial: false, type: 'lab', semester: 5 },
  { id: 'SUB005', name: 'Machine Learning', code: 'AI401', isSpecial: true, type: 'lab', semester: 7 },
];

export const classes: Class[] = [
  { id: 'CLS001', name: 'FE COMP', semester: 1, department: 'Computer Engineering' },
  { id: 'CLS002', name: 'SE COMP', semester: 3, department: 'Computer Engineering' },
  { id: 'CLS003', name: 'TE COMP', semester: 5, department: 'Computer Engineering' },
  { id: 'CLS004', name: 'BE COMP', semester: 7, department: 'Computer Engineering' },
];

export const students: Student[] = [
  { id: 'STU001', name: 'Alice Johnson', email: 'alice@example.com', classId: 'CLS004', streak: 12 },
  { id: 'STU002', name: 'Bob Williams', email: 'bob@example.com', classId: 'CLS003', streak: 5 },
  { id: 'STU003', name: 'Charlie Brown', email: 'charlie@example.com', classId: 'CLS004', streak: 23 },
];

export const faculty: Faculty[] = [
  { id: 'FAC001', name: 'Dr. Alan Turing', email: 'turing@example.com', department: 'Computer Engineering', streak: 45 },
  { id: 'FAC002', name: 'Dr. Ada Lovelace', email: 'lovelace@example.com', department: 'Computer Engineering', streak: 8 },
  { id: 'FAC003', name: 'Dr. Grace Hopper', email: 'hopper@example.com', department: 'Computer Engineering', streak: 15 },
  { id: 'FAC004', name: 'Dr. John von Neumann', email: 'neumann@example.com', department: 'Computer Engineering', streak: 0 },
  { id: 'FAC005', name: 'Dr. Donald Knuth', email: 'knuth@example.com', department: 'Computer Engineering', streak: 0 },
  { id: 'FAC006', name: 'Dr. Abhinav', email: 'abhinav@example.com', department: 'Computer Engineering', streak: 25 },
];

export const classrooms: Classroom[] = [
    { id: 'CR001', name: 'Room 101', type: 'classroom' },
    { id: 'CR002', name: 'Room 102', type: 'classroom' },
    { id: 'CR003', name: 'Lab A', type: 'lab' },
    { id: 'CR004', name: 'Lab B', type: 'lab' },
]

export const schedule: Schedule[] = [
  { id: 'SCH001', classId: 'CLS004', subjectId: 'SUB003', facultyId: 'FAC001', classroomId: 'CR001', day: 'Monday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH002', classId: 'CLS004', subjectId: 'SUB002', facultyId: 'FAC002', classroomId: 'CR003', day: 'Monday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH003', classId: 'CLS003', subjectId: 'SUB002', facultyId: 'FAC003', classroomId: 'CR003', day: 'Tuesday', time: '10:00 AM - 11:00 AM' },
  { id: 'SCH004', classId: 'CLS004', subjectId: 'SUB004', facultyId: 'FAC003', classroomId: 'CR004', day: 'Wednesday', time: '01:00 PM - 02:00 PM' },
  // Intentional conflict for demo purposes: Same faculty, same time, different class/classroom
  { id: 'SCH005', classId: 'CLS002', subjectId: 'SUB001', facultyId: 'FAC001', classroomId: 'CR002', day: 'Monday', time: '07:30 AM - 08:30 AM' },
];

export const leaveRequests: LeaveRequest[] = [
  { id: 'LR001', requesterId: 'FAC002', requesterName: 'Dr. Ada Lovelace', requesterRole: 'faculty', startDate: '2024-08-01', endDate: '2024-08-05', reason: 'Family wedding.', status: 'pending' },
  { id: 'LR002', requesterId: 'FAC003', requesterName: 'Dr. Grace Hopper', requesterRole: 'faculty', startDate: '2024-08-10', endDate: '2024-08-12', reason: 'Attending a conference.', status: 'pending' },
  { id: 'LR003', requesterId: 'FAC001', requesterName: 'Dr. Alan Turing', requesterRole: 'faculty', startDate: '2024-07-20', endDate: '2024-07-21', reason: 'Personal reasons.', status: 'approved' },
  { id: 'LR004', requesterId: 'STU001', requesterName: 'Alice Johnson', requesterRole: 'student', startDate: '2024-08-02', endDate: '2024-08-03', reason: 'Medical appointment.', status: 'pending' },
];

export const scheduleChangeRequests: ScheduleChangeRequest[] = [
    { id: 'SCR001', scheduleId: 'SCH001', facultyId: 'FAC001', reason: 'Need to swap this class with my afternoon slot.', status: 'pending' },
    { id: 'SCR002', scheduleId: 'SCH002', facultyId: 'FAC002', reason: 'Lab equipment is unavailable.', status: 'pending' },
    { id: 'SCR003', scheduleId: 'SCH003', facultyId: 'FAC003', reason: 'Requesting to move to Room 102.', status: 'pending', requestedClassroomId: 'CR001' },
];

export const notifications: Notification[] = [
    { id: 'NOT001', userId: 'FAC001', message: 'Your leave request from 2024-07-20 to 2024-07-21 has been approved.', isRead: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
];
