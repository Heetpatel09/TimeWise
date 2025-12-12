
import type { Subject, Class, Student, Faculty, Schedule, LeaveRequest, ScheduleChangeRequest, Notification, Classroom } from './types';

export const subjects: Subject[] = [
  { 
    id: 'SUB001', 
    name: 'Introduction to Computer Science', 
    code: 'CS101', 
    isSpecial: true, 
    type: 'theory', 
    semester: 1,
    syllabus: '{"modules":[{"name":"Intro to Programming","topics":["Variables","Data Types","Control Flow"],"weightage":"30%"},{"name":"Intro to Web","topics":["HTML","CSS"],"weightage":"30%"},{"name":"Computer Architecture","topics":["CPU","Memory","Storage"],"weightage":"40%"}]}'
  },
  { 
    id: 'SUB002', 
    name: 'Data Structures and Algorithms', 
    code: 'CS201', 
    isSpecial: false, 
    type: 'lab', 
    semester: 3,
    syllabus: '{"modules":[{"name":"Arrays and Strings","topics":["Sorting","Searching"],"weightage":"25%"},{"name":"Linked Lists","topics":["Singly","Doubly"],"weightage":"25%"},{"name":"Trees","topics":["BST","AVL"],"weightage":"25%"},{"name":"Graphs","topics":["BFS","DFS"],"weightage":"25%"}]}'
  },
  { 
    id: 'SUB003', 
    name: 'Database Management Systems', 
    code: 'CS301', 
    isSpecial: false, 
    type: 'theory', 
    semester: 5,
    syllabus: '{"modules":[{"name":"SQL Basics","topics":["SELECT","UPDATE","DELETE"],"weightage":"40%"},{"name":"Normalization","topics":["1NF","2NF","3NF"],"weightage":"60%"}]}'
  },
  { 
    id: 'SUB004', 
    name: 'Operating Systems', 
    code: 'CS302', 
    isSpecial: false, 
    type: 'lab', 
    semester: 5,
    syllabus: '{"modules":[{"name":"Process Management","topics":["Scheduling","Deadlocks"],"weightage":"50%"},{"name":"Memory Management","topics":["Paging","Segmentation"],"weightage":"50%"}]}'
  },
  { 
    id: 'SUB005', 
    name: 'Machine Learning', 
    code: 'AI401', 
    isSpecial: true, 
    type: 'lab', 
    semester: 7,
    syllabus: '{"modules":[{"name":"Supervised Learning","topics":["Regression","Classification"],"weightage":"50%"},{"name":"Unsupervised Learning","topics":["Clustering","Dimensionality Reduction"],"weightage":"50%"}]}'
  },
  { 
    id: 'SUB006', 
    name: 'Software Engineering', 
    code: 'SE202', 
    isSpecial: false, 
    type: 'theory', 
    semester: 3,
    syllabus: '{"modules":[{"name":"SDLC","topics":["Agile","Waterfall"],"weightage":"50%"},{"name":"Testing","topics":["Unit","Integration"],"weightage":"50%"}]}'
  },
  { 
    id: 'SUB007', 
    name: 'Computer Networks', 
    code: 'CN402', 
    isSpecial: false, 
    type: 'theory', 
    semester: 7,
    syllabus: '{"modules":[{"name":"OSI Model","topics":["Layers"],"weightage":"50%"},{"name":"TCP/IP","topics":["Sockets","Ports"],"weightage":"50%"}]}'
  },
   { 
    id: 'SUB008', 
    name: 'Advanced Algorithms', 
    code: 'CS403', 
    isSpecial: false, 
    type: 'theory', 
    semester: 7,
    syllabus: '{"modules":[{"name":"Dynamic Programming","topics":["Knapsack","LCS"],"weightage":"50%"},{"name":"Greedy Algorithms","topics":["Huffman Coding"],"weightage":"50%"}]}'
  },
];

export const classes: Class[] = [
  { id: 'CLS001', name: 'FE COMP A', semester: 1, department: 'Computer Engineering' },
  { id: 'CLS005', name: 'FE COMP B', semester: 1, department: 'Computer Engineering' },
  { id: 'CLS002', name: 'SE COMP A', semester: 3, department: 'Computer Engineering' },
  { id: 'CLS006', name: 'SE COMP B', semester: 3, department: 'Computer Engineering' },
  { id: 'CLS003', name: 'TE COMP', semester: 5, department: 'Computer Engineering' },
  { id: 'CLS004', name: 'BE COMP', semester: 7, department: 'Computer Engineering' },
];

export const students: Student[] = [
  { id: 'STU001', name: 'Alice Johnson', email: 'alice@example.com', classId: 'CLS004', streak: 12, profileCompleted: 80, sgpa: 9.1, cgpa: 8.8 },
  { id: 'STU002', name: 'Bob Williams', email: 'bob@example.com', classId: 'CLS003', streak: 5, profileCompleted: 75, sgpa: 7.9, cgpa: 7.5 },
  { id: 'STU003', name: 'Charlie Brown', email: 'charlie@example.com', classId: 'CLS004', streak: 23, profileCompleted: 90, sgpa: 8.5, cgpa: 8.2 },
  { id: 'STU004', name: 'Diana Prince', email: 'diana@example.com', classId: 'CLS001', streak: 18, profileCompleted: 100, sgpa: 9.5, cgpa: 9.2 },
  { id: 'STU005', name: 'Ethan Hunt', email: 'ethan@example.com', classId: 'CLS002', streak: 9, profileCompleted: 60, sgpa: 8.1, cgpa: 7.8 },
  { id: 'STU006', name: 'Fiona Glenanne', email: 'fiona@example.com', classId: 'CLS003', streak: 3, profileCompleted: 40, sgpa: 7.2, cgpa: 7.0 },
  { id: 'STU007', name: 'George Costanza', email: 'george@example.com', classId: 'CLS001', streak: 11, profileCompleted: 95, sgpa: 8.9, cgpa: 8.5 },
  { id: 'STU008', name: 'Hannah Abbott', email: 'hannah@example.com', classId: 'CLS002', streak: 7, profileCompleted: 85, sgpa: 8.3, cgpa: 8.0 },
  { id: 'STU009', name: 'Ian Malcolm', email: 'ian@example.com', classId: 'CLS004', streak: 2, profileCompleted: 50, sgpa: 6.9, cgpa: 6.5 },
  { id: 'STU010', name: 'Jane Smith', email: 'jane@example.com', classId: 'CLS003', streak: 15, profileCompleted: 100, sgpa: 9.2, cgpa: 8.9 },
  { id: 'STU011', name: 'Kevin McCallister', email: 'kevin@example.com', classId: 'CLS001', streak: 4, profileCompleted: 30, sgpa: 6.5, cgpa: 6.2 },
  { id: 'STU012', name: 'Laura Palmer', email: 'laura@example.com', classId: 'CLS002', streak: 19, profileCompleted: 100, sgpa: 9.8, cgpa: 9.5 },
  { id: 'STU013', name: 'Michael Scott', email: 'michael@example.com', classId: 'CLS005', streak: 0, profileCompleted: 20, sgpa: 5.0, cgpa: 5.5 },
  { id: 'STU014', name: 'Nancy Drew', email: 'nancy@example.com', classId: 'CLS006', streak: 25, profileCompleted: 100, sgpa: 9.9, cgpa: 9.6 },
  { id: 'STU015', name: 'Oscar Martinez', email: 'oscar@example.com', classId: 'CLS003', streak: 8, profileCompleted: 70, sgpa: 8.0, cgpa: 7.7 },
  { id: 'STU016', name: 'Pam Beesly', email: 'pam@example.com', classId: 'CLS005', streak: 14, profileCompleted: 88, sgpa: 8.7, cgpa: 8.4 },
  { id: 'STU017', name: 'Quentin Coldwater', email: 'quentin@example.com', classId: 'CLS006', streak: 6, profileCompleted: 65, sgpa: 7.8, cgpa: 7.4 },
  { id: 'STU018', name: 'Rachel Green', email: 'rachel@example.com', classId: 'CLS005', streak: 1, profileCompleted: 45, sgpa: 6.8, cgpa: 6.6 },
  { id: 'STU019', name: 'Samwise Gamgee', email: 'sam@example.com', classId: 'CLS006', streak: 30, profileCompleted: 100, sgpa: 10.0, cgpa: 9.9 },
  { id: 'STU020', name: 'Tony Stark', email: 'tony@example.com', classId: 'CLS004', streak: 22, profileCompleted: 100, sgpa: 9.7, cgpa: 9.4 },
];

export const faculty: Faculty[] = [
  { id: 'FAC001', name: 'Dr. Alan Turing', email: 'turing@example.com', department: 'Computer Engineering', streak: 45, profileCompleted: 90 },
  { id: 'FAC002', name: 'Dr. Ada Lovelace', email: 'lovelace@example.com', department: 'Computer Engineering', streak: 8, profileCompleted: 80 },
  { id: 'FAC003', name: 'Dr. Grace Hopper', email: 'hopper@example.com', department: 'Computer Engineering', streak: 15, profileCompleted: 85 },
  { id: 'FAC004', name: 'Dr. John von Neumann', email: 'neumann@example.com', department: 'Computer Engineering', streak: 0, profileCompleted: 50 },
  { id: 'FAC005', name: 'Dr. Donald Knuth', email: 'knuth@example.com', department: 'Computer Engineering', streak: 0, profileCompleted: 60 },
  { id: 'FAC006', name: 'Dr. Abhinav Gupta', email: 'abhinav@example.com', department: 'Computer Engineering', streak: 25, profileCompleted: 95 },
  { id: 'FAC007', name: 'Prof. Sheldon Cooper', email: 'cooper@example.com', department: 'Physics', streak: 3, profileCompleted: 70 },
  { id: 'FAC008', name: 'Prof. Minerva McGonagall', email: 'mcgonagall@example.com', department: 'Transfiguration', streak: 50, profileCompleted: 100 },
  { id: 'FAC009', name: 'Prof. Walter White', email: 'white@example.com', department: 'Chemistry', streak: 1, profileCompleted: 40 },
  { id: 'FAC010', name: 'Prof. Indiana Jones', email: 'jones@example.com', department: 'Archaeology', streak: 12, profileCompleted: 75 },
];

export const classrooms: Classroom[] = [
    { id: 'CR001', name: 'Room 101', type: 'classroom' },
    { id: 'CR002', name: 'Room 102', type: 'classroom' },
    { id: 'CR003', name: 'Lab A', type: 'lab' },
    { id: 'CR004', name: 'Lab B', type: 'lab' },
    { id: 'CR005', name: 'Seminar Hall', type: 'classroom' },
    { id: 'CR006', name: 'Room 201', type: 'classroom' },
    { id: 'CR007', name: 'Room 202', type: 'classroom' },
]

export const schedule: Schedule[] = [
  { id: 'SCH001', classId: 'CLS004', subjectId: 'SUB003', facultyId: 'FAC001', classroomId: 'CR001', day: 'Monday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH002', classId: 'CLS004', subjectId: 'SUB005', facultyId: 'FAC002', classroomId: 'CR003', day: 'Monday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH003', classId: 'CLS003', subjectId: 'SUB002', facultyId: 'FAC003', classroomId: 'CR003', day: 'Tuesday', time: '10:00 AM - 11:00 AM' },
  { id: 'SCH004', classId: 'CLS004', subjectId: 'SUB004', facultyId: 'FAC003', classroomId: 'CR004', day: 'Wednesday', time: '01:00 PM - 02:00 PM' },
  { id: 'SCH005', classId: 'CLS002', subjectId: 'SUB001', facultyId: 'FAC001', classroomId: 'CR002', day: 'Monday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH006', classId: 'CLS001', subjectId: 'SUB001', facultyId: 'FAC004', classroomId: 'CR001', day: 'Tuesday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH007', classId: 'CLS003', subjectId: 'SUB003', facultyId: 'FAC005', classroomId: 'CR002', day: 'Wednesday', time: '11:00 AM - 12:00 PM' },
  { id: 'SCH008', classId: 'CLS006', subjectId: 'SUB006', facultyId: 'FAC006', classroomId: 'CR005', day: 'Thursday', time: '02:00 PM - 03:00 PM' },
  { id: 'SCH009', classId: 'CLS004', subjectId: 'SUB007', facultyId: 'FAC007', classroomId: 'CR006', day: 'Friday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH010', classId: 'CLS003', subjectId: 'SUB004', facultyId: 'FAC008', classroomId: 'CR004', day: 'Friday', time: '10:00 AM - 11:00 AM' },
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
    { id: 'NOT001', userId: 'FAC001', message: 'Your leave request from 2024-07-20 to 2024-07-21 has been approved.', isRead: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), category: 'requests' },
];
export const adminUser = {
  id: 'admin-user',
  name: 'Admin',
  email: 'admin@timewise.app',
  password: 'admin123',
  role: 'admin',
  avatar: 'https://avatar.vercel.sh/admin.png'
};

    

    


