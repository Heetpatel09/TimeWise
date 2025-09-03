
'use server';

import Database from 'better-sqlite3';
import {
  subjects,
  classes,
  students,
  faculty,
  schedule,
  leaveRequests,
  scheduleChangeRequests,
  notifications,
  classrooms,
  adminUser
} from './placeholder-data';
import type { Faculty, Student } from './types';
import fs from 'fs';

// This will be our singleton database instance
let db: Database.Database;
const dbFilePath = './timewise.db';

function initializeDb() {
  console.log('Initializing database connection...');
  // Delete the old database file to ensure a clean slate on startup.
  // This is the key to fixing the persistent login issues.
  if (fs.existsSync(dbFilePath)) {
    fs.unlinkSync(dbFilePath);
    console.log('Deleted existing database file to ensure a fresh start.');
  }
  
  db = new Database(dbFilePath);

  // Use "IF NOT EXISTS" for every table to make initialization idempotent
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        isSpecial BOOLEAN NOT NULL DEFAULT 0,
        type TEXT NOT NULL CHECK(type IN ('theory', 'lab')) DEFAULT 'theory',
        semester INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        semester INTEGER NOT NULL,
        department TEXT NOT NULL
    );
     CREATE TABLE IF NOT EXISTS classrooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('classroom', 'lab'))
    );
    CREATE TABLE IF NOT EXISTS faculty (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        department TEXT NOT NULL,
        streak INTEGER NOT NULL,
        avatar TEXT
    );
     CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        classId TEXT NOT NULL,
        streak INTEGER NOT NULL,
        avatar TEXT,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS schedule (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        subjectId TEXT NOT NULL,
        facultyId TEXT NOT NULL,
        classroomId TEXT NOT NULL,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (classroomId) REFERENCES classrooms(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        requesterId TEXT NOT NULL,
        requesterName TEXT NOT NULL,
        requesterRole TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS schedule_change_requests (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        facultyId TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        requestedClassroomId TEXT,
        FOREIGN KEY (scheduleId) REFERENCES schedule(id) ON DELETE CASCADE,
        FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (requestedClassroomId) REFERENCES classrooms(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS new_slot_requests (
        id TEXT PRIMARY KEY,
        facultyId TEXT NOT NULL,
        classId TEXT NOT NULL,
        subjectId TEXT NOT NULL,
        classroomId TEXT NOT NULL,
        day TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE,
        FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
        FOREIGN KEY (classroomId) REFERENCES classrooms(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        message TEXT NOT NULL,
        isRead BOOLEAN NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_credentials (
      email TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
      password TEXT
    );
  `);
  
  // Check if seeding is needed by looking for any faculty member.
  // This is a proxy to see if the initial data has been inserted.
  const seedCheck = db.prepare(`SELECT id FROM faculty LIMIT 1`).get();

  if (!seedCheck) {
    console.log('Database appears empty, running initial data seeding...');

    const insertSubject = db.prepare('INSERT INTO subjects (id, name, code, isSpecial, type, semester) VALUES (?, ?, ?, ?, ?, ?)');
    const insertClass = db.prepare('INSERT INTO classes (id, name, semester, department) VALUES (?, ?, ?, ?)');
    const insertStudent = db.prepare('INSERT INTO students (id, name, email, classId, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    const insertFaculty = db.prepare('INSERT INTO faculty (id, name, email, department, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    const insertClassroom = db.prepare('INSERT INTO classrooms (id, name, type) VALUES (?, ?, ?)');
    const insertSchedule = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertLeaveRequest = db.prepare('INSERT INTO leave_requests (id, requesterId, requesterName, requesterRole, startDate, endDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertScheduleChangeRequest = db.prepare('INSERT INTO schedule_change_requests (id, scheduleId, facultyId, reason, status, requestedClassroomId) VALUES (?, ?, ?, ?, ?, ?)');
    const insertNotification = db.prepare('INSERT INTO notifications (id, userId, message, isRead, createdAt) VALUES (?, ?, ?, ?, ?)');
    const insertUser = db.prepare('INSERT OR IGNORE INTO user_credentials (email, userId, password, role) VALUES (?, ?, ?, ?)');

    db.transaction(() => {
        subjects.forEach(s => insertSubject.run(s.id, s.name, s.code, s.isSpecial ? 1 : 0, s.type, s.semester));
        classes.forEach(c => insertClass.run(c.id, c.name, c.semester, c.department));
        classrooms.forEach(cr => insertClassroom.run(cr.id, cr.name, cr.type));
        faculty.forEach(f => insertFaculty.run(f.id, f.name, f.email, f.department, f.streak, f.avatar || null));
        students.forEach(s => insertStudent.run(s.id, s.name, s.email, s.classId, s.streak, s.avatar || null));
        schedule.forEach(s => insertSchedule.run(s.id, s.classId, s.subjectId, s.facultyId, s.classroomId, s.day, s.time));
        leaveRequests.forEach(lr => insertLeaveRequest.run(lr.id, lr.requesterId, lr.requesterName, lr.requesterRole, lr.startDate, lr.endDate, lr.reason, lr.status));
        scheduleChangeRequests.forEach(scr => insertScheduleChangeRequest.run(scr.id, scr.scheduleId, scr.facultyId, scr.reason, scr.status, scr.requestedClassroomId || null));
        notifications.forEach(n => insertNotification.run(n.id, n.userId, n.message, n.isRead ? 1 : 0, n.createdAt));
        
        // Seed credentials directly and reliably.
        insertUser.run(adminUser.email, adminUser.id, adminUser.password, 'admin');
        
        faculty.forEach(f => {
          insertUser.run(f.email, f.id, 'faculty123', 'faculty');
        });

        students.forEach(s => {
          const password = s.email === 'abc@example.com' ? '123' : 'student123';
          insertUser.run(s.email, s.id, password, 'student');
        });
    })();
    console.log('Database initialized and seeded successfully.');
  } 

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}


// Initialize and export the database connection
const getDb = () => {
    if (!db) {
        db = initializeDb();
    }
    return db;
}

export { getDb as db };
