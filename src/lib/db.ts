

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
  adminUser,
  hostels,
  rooms
} from './placeholder-data';
import type { Faculty, Student } from './types';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

// This will be our singleton database instance
let db: Database.Database;
const dbFilePath = './timewise.db';

// A flag to indicate if the schema has been checked in the current run.
let schemaChecked = false;
const schemaVersion = 40; // Increment this to force re-initialization
const versionFilePath = path.join(process.cwd(), 'db-version.txt');


function getDbVersion() {
  if (fs.existsSync(versionFilePath)) {
    return parseInt(fs.readFileSync(versionFilePath, 'utf-8'), 10);
  }
  return 0;
}

function setDbVersion(version: number) {
  fs.writeFileSync(versionFilePath, version.toString(), 'utf-8');
}


function initializeDb() {
  const currentVersion = getDbVersion();
  const dbExists = fs.existsSync(dbFilePath);

  if (dbExists && currentVersion < schemaVersion) {
    fs.unlinkSync(dbFilePath);
    console.log('Database file deleted due to schema update.');
  }

  db = new Database(dbFilePath);
  
  if (!dbExists || currentVersion < schemaVersion) {
    console.log('Database does not exist or is outdated, creating and seeding...');
    createSchemaAndSeed();
    setDbVersion(schemaVersion);
  } else {
    console.log('Database exists and schema is up to date. Persistence is enabled.');
  }


  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  return db;
}


function createSchemaAndSeed() {
   // Use "IF NOT EXISTS" for every table to make initialization idempotent
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        isSpecial BOOLEAN NOT NULL DEFAULT 0,
        type TEXT NOT NULL CHECK(type IN ('theory', 'lab')) DEFAULT 'theory',
        semester INTEGER NOT NULL,
        syllabus TEXT,
        department TEXT
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
    CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        avatar TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        permissions TEXT
    );
    CREATE TABLE IF NOT EXISTS faculty (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        department TEXT NOT NULL,
        streak INTEGER NOT NULL,
        avatar TEXT,
        profileCompleted INTEGER NOT NULL DEFAULT 0
    );
     CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        classId TEXT NOT NULL,
        streak INTEGER NOT NULL,
        avatar TEXT,
        profileCompleted INTEGER NOT NULL DEFAULT 0,
        sgpa REAL NOT NULL DEFAULT 0,
        cgpa REAL NOT NULL DEFAULT 0,
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
        category TEXT NOT NULL DEFAULT 'general',
        isRead BOOLEAN NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_credentials (
      email TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'faculty', 'student')),
      password TEXT,
      requiresPasswordChange BOOLEAN NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        date TEXT NOT NULL,
        title TEXT NOT NULL,
        reminder BOOLEAN NOT NULL DEFAULT 1,
        reminderTime TEXT,
        createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS fees (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      amount REAL NOT NULL,
      dueDate TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('paid', 'unpaid')),
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS hostels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      blocks TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      hostelId TEXT NOT NULL,
      roomNumber TEXT NOT NULL,
      block TEXT,
      studentId TEXT,
      FOREIGN KEY (hostelId) REFERENCES hostels(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      subjectId TEXT NOT NULL,
      classId TEXT NOT NULL,
      classroomId TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (classroomId) REFERENCES classrooms(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS attendance (
        id TEXT PRIMARY KEY,
        scheduleId TEXT NOT NULL,
        studentId TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        status TEXT NOT NULL CHECK(status IN ('present', 'absent', 'disputed')),
        isLocked BOOLEAN NOT NULL DEFAULT 0,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (scheduleId) REFERENCES schedule(id) ON DELETE CASCADE,
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE (scheduleId, studentId, date)
    );
    CREATE TABLE IF NOT EXISTS results (
        id TEXT PRIMARY KEY,
        studentId TEXT NOT NULL,
        subjectId TEXT NOT NULL,
        semester INTEGER NOT NULL,
        marks INTEGER,
        totalMarks INTEGER,
        grade TEXT,
        examType TEXT NOT NULL DEFAULT 'internal' CHECK(examType IN ('internal', 'external')),
        FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
        UNIQUE(studentId, subjectId, semester, examType)
    );
  `);
  
  // Seed the database
    const insertSubject = db.prepare('INSERT OR IGNORE INTO subjects (id, name, code, isSpecial, type, semester, syllabus, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertClass = db.prepare('INSERT OR IGNORE INTO classes (id, name, semester, department) VALUES (?, ?, ?, ?)');
    const insertStudent = db.prepare('INSERT OR IGNORE INTO students (id, name, email, classId, streak, avatar, profileCompleted, sgpa, cgpa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertFaculty = db.prepare('INSERT OR IGNORE INTO faculty (id, name, email, department, streak, avatar, profileCompleted) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertClassroom = db.prepare('INSERT OR IGNORE INTO classrooms (id, name, type) VALUES (?, ?, ?)');
    const insertSchedule = db.prepare('INSERT OR IGNORE INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertLeaveRequest = db.prepare('INSERT OR IGNORE INTO leave_requests (id, requesterId, requesterName, requesterRole, startDate, endDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertScheduleChangeRequest = db.prepare('INSERT OR IGNORE INTO schedule_change_requests (id, scheduleId, facultyId, reason, status, requestedClassroomId) VALUES (?, ?, ?, ?, ?, ?)');
    const insertNotification = db.prepare('INSERT OR IGNORE INTO notifications (id, userId, message, isRead, createdAt, category) VALUES (?, ?, ?, ?, ?, ?)');
    const insertUser = db.prepare('INSERT OR REPLACE INTO user_credentials (email, userId, password, role, requiresPasswordChange) VALUES (?, ?, ?, ?, ?)');
    const insertAdmin = db.prepare('INSERT OR IGNORE INTO admins (id, name, email, avatar, role, permissions) VALUES (?, ?, ?, ?, ?, ?)');
    const insertHostel = db.prepare('INSERT OR IGNORE INTO hostels (id, name, blocks) VALUES (?, ?, ?)');
    const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (id, hostelId, roomNumber, block, studentId) VALUES (?, ?, ?, ?, ?)');

    db.transaction(() => {
        subjects.forEach(s => insertSubject.run(s.id, s.name, s.code, s.isSpecial ? 1 : 0, s.type, s.semester, s.syllabus || null, (s as any).department || 'Computer Engineering'));
        classes.forEach(c => insertClass.run(c.id, c.name, c.semester, c.department));
        classrooms.forEach(cr => insertClassroom.run(cr.id, cr.name, cr.type));
        
        insertAdmin.run(adminUser.id, adminUser.name, adminUser.email, adminUser.avatar, 'admin', '["*"]');
        insertUser.run(adminUser.email, adminUser.id, adminUser.password, 'admin', 0);
        
        faculty.forEach(f => {
            insertFaculty.run(f.id, f.name, f.email, f.department, f.streak, f.avatar || null, f.profileCompleted || 0);
            insertUser.run(f.email, f.id, 'faculty123', 'faculty', 1);
        });
        
        students.forEach(s => {
            insertStudent.run(s.id, s.name, s.email, s.classId, s.streak, s.avatar || null, s.profileCompleted || 0, s.sgpa, s.cgpa);
            let password = randomBytes(8).toString('hex');
            let requiresChange = 1;
            
            const predefinedPasswords: Record<string, string> = {
                'bob.williams@example.com': 'student123',
                'alice.johnson@example.com': 'student123',
                'charlie.brown@example.com': 'student123',
            };

            if (predefinedPasswords[s.email]) {
                password = predefinedPasswords[s.email];
                requiresChange = 0;
            }

            insertUser.run(s.email, s.id, password, 'student', requiresChange);
        });

        schedule.forEach(s => insertSchedule.run(s.id, s.classId, s.subjectId, s.facultyId, s.classroomId, s.day, s.time));
        leaveRequests.forEach(lr => insertLeaveRequest.run(lr.id, lr.requesterId, lr.requesterName, lr.requesterRole, lr.startDate, lr.endDate, lr.reason, lr.status));
        scheduleChangeRequests.forEach(scr => insertScheduleChangeRequest.run(scr.id, scr.scheduleId, scr.facultyId, scr.reason, scr.status, scr.requestedClassroomId || null));
        notifications.forEach(n => insertNotification.run(n.id, n.userId, n.message, n.isRead ? 1 : 0, n.createdAt, n.category || 'general'));
        
        hostels.forEach(h => insertHostel.run(h.id, h.name, h.blocks));
        rooms.forEach(r => insertRoom.run(r.id, r.hostelId, r.roomNumber, r.block, r.studentId));
        
    })();
    console.log('Database initialized and seeded successfully.');
}


// Initialize and export the database connection
const getDb = () => {
    if (!db) {
        db = initializeDb();
    }
    return db;
}

export { getDb as db };
