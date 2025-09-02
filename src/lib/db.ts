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
} from './placeholder-data';
import type { Faculty, Student } from './types';

// This will be our singleton database instance
let db: Database.Database;

function initializeDb() {
    if (db) {
        return db;
    }

    console.log('Initializing database connection...');
    db = new Database('local.db');
    db.pragma('journal_mode = WAL');

    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = 'subjects'").get();
    if (tableExists) {
        console.log('Database already set up.');
        return db;
    }

    console.log('Running initial database setup...');

    db.exec(`
      CREATE TABLE subjects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          code TEXT NOT NULL
      );
      CREATE TABLE classes (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          year INTEGER NOT NULL,
          department TEXT NOT NULL
      );
      CREATE TABLE students (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          classId TEXT NOT NULL,
          streak INTEGER NOT NULL,
          avatar TEXT,
          FOREIGN KEY (classId) REFERENCES classes(id)
      );
      CREATE TABLE faculty (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          department TEXT NOT NULL,
          streak INTEGER NOT NULL,
          avatar TEXT
      );
      CREATE TABLE schedule (
          id TEXT PRIMARY KEY,
          classId TEXT NOT NULL,
          subjectId TEXT NOT NULL,
          facultyId TEXT NOT NULL,
          day TEXT NOT NULL,
          time TEXT NOT NULL,
          FOREIGN KEY (classId) REFERENCES classes(id),
          FOREIGN KEY (subjectId) REFERENCES subjects(id),
          FOREIGN KEY (facultyId) REFERENCES faculty(id)
      );
      CREATE TABLE leave_requests (
          id TEXT PRIMARY KEY,
          requesterId TEXT NOT NULL,
          requesterName TEXT NOT NULL,
          requesterRole TEXT NOT NULL,
          startDate TEXT NOT NULL,
          endDate TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL
      );
      CREATE TABLE schedule_change_requests (
          id TEXT PRIMARY KEY,
          scheduleId TEXT NOT NULL,
          facultyId TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL,
          FOREIGN KEY (scheduleId) REFERENCES schedule(id),
          FOREIGN KEY (facultyId) REFERENCES faculty(id)
      );
      CREATE TABLE notifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          message TEXT NOT NULL,
          isRead BOOLEAN NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL
      );
      CREATE TABLE users (
          email TEXT PRIMARY KEY,
          id TEXT NOT NULL,
          password TEXT,
          role TEXT NOT NULL
      );
    `);

    const insertSubject = db.prepare('INSERT INTO subjects (id, name, code) VALUES (?, ?, ?)');
    const insertClass = db.prepare('INSERT INTO classes (id, name, year, department) VALUES (?, ?, ?, ?)');
    const insertStudent = db.prepare('INSERT INTO students (id, name, email, classId, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    const insertFaculty = db.prepare('INSERT INTO faculty (id, name, email, department, streak, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    const insertSchedule = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, day, time) VALUES (?, ?, ?, ?, ?, ?)');
    const insertLeaveRequest = db.prepare('INSERT INTO leave_requests (id, requesterId, requesterName, requesterRole, startDate, endDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertScheduleChangeRequest = db.prepare('INSERT INTO schedule_change_requests (id, scheduleId, facultyId, reason, status) VALUES (?, ?, ?, ?, ?)');
    const insertNotification = db.prepare('INSERT INTO notifications (id, userId, message, isRead, createdAt) VALUES (?, ?, ?, ?, ?)');
    const insertUser = db.prepare('INSERT INTO users (email, id, password, role) VALUES (?, ?, ?, ?)');

    db.transaction(() => {
        subjects.forEach(s => insertSubject.run(s.id, s.name, s.code));
        classes.forEach(c => insertClass.run(c.id, c.name, c.year, c.department));
        students.forEach(s => insertStudent.run(s.id, s.name, s.email, s.classId, s.streak, s.avatar || null));
        faculty.forEach(f => insertFaculty.run(f.id, f.name, f.email, f.department, f.streak, f.avatar || null));
        schedule.forEach(s => insertSchedule.run(s.id, s.classId, s.subjectId, s.facultyId, s.day, s.time));
        leaveRequests.forEach(lr => insertLeaveRequest.run(lr.id, lr.requesterId, lr.requesterName, lr.requesterRole, lr.startDate, lr.endDate, lr.reason, lr.status));
        scheduleChangeRequests.forEach(scr => insertScheduleChangeRequest.run(scr.id, scr.scheduleId, scr.facultyId, scr.reason, scr.status));
        notifications.forEach(n => insertNotification.run(n.id, n.userId, n.message, n.isRead ? 1 : 0, n.createdAt));
        
        // Auth users
        insertUser.run('admin@timewise.app', 'admin', 'admin123', 'admin');
        faculty.forEach(f => insertUser.run(f.email, f.id, 'faculty123', 'faculty'));
        students.forEach(s => insertUser.run(s.email, s.id, 'student123', 'student'));

    })();
    console.log('Database initialized successfully.');
    return db;
}

// Initialize and export the database connection
const dbInstance = initializeDb();

export { dbInstance as db };
