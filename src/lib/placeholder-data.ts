import type { Subject, Class, Student, Faculty, Schedule } from './types';

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

export const students: Student[] = [
  { id: 'STU001', name: 'Alice Johnson', email: 'alice@example.com', classId: 'CLS004' },
  { id: 'STU002', name: 'Bob Williams', email: 'bob@example.com', classId: 'CLS003' },
  { id: 'STU003', name: 'Charlie Brown', email: 'charlie@example.com', classId: 'CLS004' },
];

export const faculty: Faculty[] = [
  { id: 'FAC001', name: 'Dr. Alan Turing', email: 'turing@example.com', department: 'Computer Engineering' },
  { id: 'FAC002', name: 'Dr. Ada Lovelace', email: 'lovelace@example.com', department: 'Computer Engineering' },
  { id: 'FAC003', name: 'Dr. Grace Hopper', email: 'hopper@example.com', department: 'Computer Engineering' },
];

export const schedule: Schedule[] = [
  { id: 'SCH001', classId: 'CLS004', subjectId: 'SUB005', facultyId: 'FAC001', day: 'Monday', time: '09:00 - 10:00' },
  { id: 'SCH002', classId: 'CLS004', subjectId: 'SUB003', facultyId: 'FAC002', day: 'Monday', time: '10:00 - 11:00' },
  { id: 'SCH003', classId: 'CLS003', subjectId: 'SUB002', facultyId: 'FAC003', day: 'Tuesday', time: '11:00 - 12:00' },
  { id: 'SCH004', classId: 'CLS004', subjectId: 'SUB004', facultyId: 'FAC003', day: 'Wednesday', time: '14:00 - 15:00' },
  // Intentional conflict for demo purposes
  { id: 'SCH005', classId: 'CLS002', subjectId: 'SUB001', facultyId: 'FAC001', day: 'Monday', time: '09:00 - 10:00' },
];
