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
}

export interface Faculty {
  id: string;
  name: string;
  email: string;
  department: string;
  streak: number;
}

export interface Schedule {
  id: string;
  classId: string;
  subjectId: string;
  facultyId: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  time: string; // e.g., "09:00 - 10:00"
}

export interface User {
    name: string;
    email: string;
    avatar: string;
}
