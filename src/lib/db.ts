
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
  substituteAssignments
} from './placeholder-data';
import type { Faculty, Student } from './types';

// This will be our singleton database instance
let db: Database.Database;

function initializeDb() {
    console.log('Initializing database connection...');
    db = new Database(':memory:');
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON'); // Enforce foreign key constraints

    console.log('Running initial database setup...');

    // Drop tables in reverse order of dependency to avoid foreign key errors
    db.exec(`
      DROP TABLE IF EXISTS substitute_assignments;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS schedule_change_requests;
      DROP TABLE IF EXISTS leave_requests;
      DROP TABLE IF EXISTS schedule;
      DROP TABLE IF EXISTS students;
      DROP TABLE IF EXISTS faculty;
      DROP TABLE IF EXISTS classrooms;
      DROP TABLE IF EXISTS classes;
      DROP TABLE IF EXISTS subjects;
      DROP TABLE IF EXISTS users;
    `);

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
       CREATE TABLE classrooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('classroom', 'lab'))
      );
      CREATE TABLE faculty (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          department TEXT NOT NULL,
          streak INTEGER NOT NULL,
          avatar TEXT,
          isSubstitute BOOLEAN NOT NULL DEFAULT 0
      );
       CREATE TABLE students (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          classId TEXT NOT NULL,
          streak INTEGER NOT NULL,
          avatar TEXT,
          FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE
      );
      CREATE TABLE schedule (
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
          requestedClassroomId TEXT,
          FOREIGN KEY (scheduleId) REFERENCES schedule(id) ON DELETE CASCADE,
          FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE,
          FOREIGN KEY (requestedClassroomId) REFERENCES classrooms(id) ON DELETE SET NULL
      );
      CREATE TABLE notifications (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          message TEXT NOT NULL,
          isRead BOOLEAN NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL
      );
       CREATE TABLE substitute_assignments (
          id TEXT PRIMARY KEY,
          scheduleId TEXT NOT NULL,
          originalFacultyId TEXT NOT NULL,
          substituteFacultyId TEXT NOT NULL,
          date TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')),
          FOREIGN KEY (scheduleId) REFERENCES schedule(id) ON DELETE CASCADE,
          FOREIGN KEY (originalFacultyId) REFERENCES faculty(id) ON DELETE CASCADE,
          FOREIGN KEY (substituteFacultyId) REFERENCES faculty(id) ON DELETE CASCADE
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
    const insertFaculty = db.prepare('INSERT INTO faculty (id, name, email, department, streak, avatar, isSubstitute) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertClassroom = db.prepare('INSERT INTO classrooms (id, name, type) VALUES (?, ?, ?)');
    const insertSchedule = db.prepare('INSERT INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertLeaveRequest = db.prepare('INSERT INTO leave_requests (id, requesterId, requesterName, requesterRole, startDate, endDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertScheduleChangeRequest = db.prepare('INSERT INTO schedule_change_requests (id, scheduleId, facultyId, reason, status, requestedClassroomId) VALUES (?, ?, ?, ?, ?, ?)');
    const insertNotification = db.prepare('INSERT INTO notifications (id, userId, message, isRead, createdAt) VALUES (?, ?, ?, ?, ?)');
    const insertUser = db.prepare('INSERT INTO users (email, id, password, role) VALUES (?, ?, ?, ?)');
    const insertSubstituteAssignment = db.prepare('INSERT INTO substitute_assignments (id, scheduleId, originalFacultyId, substituteFacultyId, date, status) VALUES (?, ?, ?, ?, ?, ?)');

    db.transaction(() => {
        subjects.forEach(s => insertSubject.run(s.id, s.name, s.code));
        classes.forEach(c => insertClass.run(c.id, c.name, c.year, c.department));
        classrooms.forEach(cr => insertClassroom.run(cr.id, cr.name, cr.type));
        faculty.forEach(f => insertFaculty.run(f.id, f.name, f.email, f.department, f.streak, f.avatar || null, f.isSubstitute ? 1: 0));
        students.forEach(s => insertStudent.run(s.id, s.name, s.email, s.classId, s.streak, s.avatar || null));
        schedule.forEach(s => insertSchedule.run(s.id, s.classId, s.subjectId, s.facultyId, s.classroomId, s.day, s.time));
        leaveRequests.forEach(lr => insertLeaveRequest.run(lr.id, lr.requesterId, lr.requesterName, lr.requesterRole, lr.startDate, lr.endDate, lr.reason, lr.status));
        scheduleChangeRequests.forEach(scr => insertScheduleChangeRequest.run(scr.id, scr.scheduleId, scr.facultyId, scr.reason, scr.status, scr.requestedClassroomId || null));
        notifications.forEach(n => insertNotification.run(n.id, n.userId, n.message, n.isRead ? 1 : 0, n.createdAt));
        substituteAssignments.forEach(sa => insertSubstituteAssignment.run(sa.id, sa.scheduleId, sa.originalFacultyId, sa.substituteFacultyId, sa.date, sa.status));
        
        // Auth users
        insertUser.run('admin@timewise.app', 'admin', 'admin123', 'admin');
        faculty.forEach(f => insertUser.run(f.email, f.id, 'faculty123', 'faculty'));
        students.forEach(s => insertUser.run(s.email, s.id, 'student123', 'student'));

    })();
    console.log('Database initialized successfully.');
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
