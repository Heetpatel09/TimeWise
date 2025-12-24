
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
  managerUser,
  hostels,
  rooms,
  fees,
  attendance,
  results,
  gatePasses,
  badges,
  userBadges,
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
const schemaVersion = 61; // Increment this to force re-initialization
const versionFilePath = path.join(process.cwd(), 'workspace/db-version.txt');


function getDbVersion() {
  if (fs.existsSync(versionFilePath)) {
    return parseInt(fs.readFileSync(versionFilePath, 'utf-8'), 10);
  }
  return 0;
}

function setDbVersion(version: number) {
  const dir = path.dirname(versionFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
        type TEXT NOT NULL,
        semester INTEGER NOT NULL,
        syllabus TEXT,
        isSpecial BOOLEAN,
        department TEXT,
        priority TEXT
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
        type TEXT NOT NULL,
        capacity INTEGER,
        maintenanceStatus TEXT,
        building TEXT
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
        email TEXT NOT NULL UNIQUE,
        code TEXT,
        department TEXT NOT NULL,
        designation TEXT,
        employmentType TEXT,
        roles TEXT,
        streak INTEGER NOT NULL,
        avatar TEXT,
        profileCompleted INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
        allottedSubjects TEXT,
        maxWeeklyHours INTEGER,
        designatedYear INTEGER
    );
     CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        enrollmentNumber TEXT NOT NULL,
        rollNumber INTEGER,
        section TEXT NOT NULL,
        batch INTEGER,
        phone TEXT,
        category TEXT NOT NULL,
        classId TEXT NOT NULL,
        avatar TEXT,
        profileCompleted INTEGER NOT NULL DEFAULT 0,
        sgpa REAL NOT NULL DEFAULT 0,
        cgpa REAL NOT NULL DEFAULT 0,
        streak INTEGER NOT NULL DEFAULT 0,
        points INTEGER NOT NULL DEFAULT 0,
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
        status TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'academic'
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
      userId TEXT NOT NULL UNIQUE,
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
      semester INTEGER NOT NULL,
      feeType TEXT NOT NULL CHECK(feeType IN ('tuition', 'hostel', 'transport', 'exams', 'fine', 'misc')),
      amount REAL NOT NULL,
      dueDate TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('paid', 'unpaid', 'scholarship')),
      transactionId TEXT,
      paymentDate TEXT,
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
      floor INTEGER,
      roomNumber TEXT NOT NULL,
      block TEXT,
      studentId TEXT UNIQUE,
      FOREIGN KEY (hostelId) REFERENCES hostels(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS gate_passes (
      id TEXT PRIMARY KEY,
      studentId TEXT NOT NULL,
      requestDate TEXT NOT NULL,
      departureDate TEXT NOT NULL,
      arrivalDate TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE
    );
     CREATE TABLE IF NOT EXISTS generated_tests (
        id TEXT PRIMARY KEY,
        subjectId TEXT NOT NULL,
        classId TEXT NOT NULL,
        facultyId TEXT NOT NULL,
        questions TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (subjectId) REFERENCES subjects(id),
        FOREIGN KEY (classId) REFERENCES classes(id),
        FOREIGN KEY (facultyId) REFERENCES faculty(id)
    );
    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      subjectId TEXT NOT NULL,
      classId TEXT NOT NULL,
      classroomId TEXT,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      testId TEXT,
      FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE,
      FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (classroomId) REFERENCES classrooms(id) ON DELETE SET NULL,
      FOREIGN KEY (testId) REFERENCES generated_tests(id) ON DELETE SET NULL
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
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      facultyId TEXT NOT NULL,
      classId TEXT NOT NULL,
      subjectId TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      fileUrl TEXT,
      dueDate TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('assignment', 'lab_manual')),
      createdAt TEXT NOT NULL,
      FOREIGN KEY (facultyId) REFERENCES faculty(id) ON DELETE CASCADE,
      FOREIGN KEY (classId) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      assignmentId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      fileUrl TEXT NOT NULL, -- URL to the submission file
      submittedAt TEXT NOT NULL,
      grade TEXT,
      remarks TEXT,
      FOREIGN KEY (assignmentId) REFERENCES assignments(id) ON DELETE CASCADE,
      FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE SET NULL,
      UNIQUE(assignmentId, studentId)
    );
    CREATE TABLE IF NOT EXISTS badges (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      rarity TEXT NOT NULL CHECK(rarity IN ('Common', 'Rare', 'Epic')),
      category TEXT NOT NULL,
      points INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_badges (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      badgeId TEXT NOT NULL,
      earnedAt TEXT NOT NULL,
      FOREIGN KEY (badgeId) REFERENCES badges(id) ON DELETE CASCADE
    );
  `);
  
  // Seed the database
    const insertSubject = db.prepare('INSERT OR IGNORE INTO subjects (id, name, code, isSpecial, type, semester, syllabus, department, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertClass = db.prepare('INSERT OR IGNORE INTO classes (id, name, semester, department) VALUES (?, ?, ?, ?)');
    const insertStudent = db.prepare('INSERT OR IGNORE INTO students (id, name, email, enrollmentNumber, rollNumber, section, batch, phone, category, classId, avatar, profileCompleted, sgpa, cgpa, streak, points) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertFaculty = db.prepare('INSERT OR IGNORE INTO faculty (id, name, email, code, department, designation, employmentType, roles, streak, avatar, profileCompleted, points, allottedSubjects, maxWeeklyHours, designatedYear) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertClassroom = db.prepare('INSERT OR IGNORE INTO classrooms (id, name, type, capacity, maintenanceStatus, building) VALUES (?, ?, ?, ?, ?, ?)');
    const insertSchedule = db.prepare('INSERT OR IGNORE INTO schedule (id, classId, subjectId, facultyId, classroomId, day, time) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertLeaveRequest = db.prepare('INSERT OR IGNORE INTO leave_requests (id, requesterId, requesterName, requesterRole, startDate, endDate, reason, status, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertScheduleChangeRequest = db.prepare('INSERT OR IGNORE INTO schedule_change_requests (id, scheduleId, facultyId, reason, status, requestedClassroomId) VALUES (?, ?, ?, ?, ?, ?)');
    const insertNotification = db.prepare('INSERT OR IGNORE INTO notifications (id, userId, message, isRead, createdAt, category) VALUES (?, ?, ?, ?, ?, ?)');
    const insertUser = db.prepare('INSERT OR REPLACE INTO user_credentials (email, userId, password, role, requiresPasswordChange) VALUES (?, ?, ?, ?, ?)');
    const insertAdmin = db.prepare('INSERT OR IGNORE INTO admins (id, name, email, avatar, role, permissions) VALUES (?, ?, ?, ?, ?, ?)');
    const insertHostel = db.prepare('INSERT OR IGNORE INTO hostels (id, name, blocks) VALUES (?, ?, ?)');
    const insertRoom = db.prepare('INSERT OR IGNORE INTO rooms (id, hostelId, roomNumber, block, studentId, floor) VALUES (?, ?, ?, ?, ?, ?)');
    const insertFee = db.prepare('INSERT OR IGNORE INTO fees (id, studentId, semester, feeType, amount, dueDate, status, transactionId, paymentDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const insertAttendance = db.prepare('INSERT OR IGNORE INTO attendance (id, scheduleId, studentId, date, status, isLocked, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertResult = db.prepare('INSERT OR IGNORE INTO results (id, studentId, subjectId, semester, marks, totalMarks, grade, examType) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertGatePass = db.prepare('INSERT OR IGNORE INTO gate_passes (id, studentId, requestDate, departureDate, arrivalDate, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertBadge = db.prepare('INSERT OR IGNORE INTO badges (id, name, description, icon, rarity, category, points) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const insertUserBadge = db.prepare('INSERT OR IGNORE INTO user_badges (id, userId, badgeId, earnedAt) VALUES (?, ?, ?, ?)');

    db.transaction(() => {
        // Step 1: Insert base data for users and other entities
        insertAdmin.run(adminUser.id, adminUser.name, adminUser.email, adminUser.avatar, 'admin', '["*"]');
        insertAdmin.run(managerUser.id, managerUser.name, managerUser.email, managerUser.avatar, 'manager', JSON.stringify(managerUser.permissions));
        faculty.forEach(f => insertFaculty.run(f.id, f.name, f.email, f.code, f.department, f.designation, f.employmentType, JSON.stringify(f.roles), f.streak, f.avatar || null, f.profileCompleted || 0, f.points || 0, JSON.stringify(f.allottedSubjects || []), f.maxWeeklyHours, f.designatedYear));
        classes.forEach(c => insertClass.run(c.id, c.name, c.semester, c.department));
        students.forEach(s => {
            const scheduledClasses = classes.filter(c => schedule.some(sch => sch.classId === c.id));
            const assignedClass = scheduledClasses.length > 0 ? scheduledClasses[s.rollNumber % scheduledClasses.length] : classes[0];
            insertStudent.run(s.id, s.name, s.email, s.enrollmentNumber, s.rollNumber, s.section, s.batch, s.phone, s.category, assignedClass.id, s.avatar || null, s.profileCompleted || 0, s.sgpa, s.cgpa, s.streak || 0, s.points || 0);
        });
        
        subjects.forEach(s => insertSubject.run(s.id, s.name, s.code, (s as any).isSpecial ? 1: 0, s.type, s.semester, s.syllabus || null, (s as any).department || 'Computer Engineering', s.priority || null));
        classrooms.forEach(cr => insertClassroom.run(cr.id, cr.name, cr.type, cr.capacity, cr.maintenanceStatus, cr.building));

        // Step 2: Insert credentials for all users
        insertUser.run(adminUser.email, adminUser.id, adminUser.password, 'admin', 0);
        insertUser.run(managerUser.email, managerUser.id, managerUser.password, 'admin', 0);
        
        faculty.forEach(f => {
            insertUser.run(f.email, f.id, 'faculty123', 'faculty', 1);
        });
        
        const staticStudentEmails = ['aarav.sharma@example.com', 'vihaan.gupta@example.com', 'saanvi.sharma@example.com'];
        
        students.forEach(s => {
            if (staticStudentEmails.includes(s.email)) {
              insertUser.run(s.email, s.id, 'student123', 'student', 0);
            } else {
              const randomPassword = randomBytes(8).toString('hex');
              insertUser.run(s.email, s.id, randomPassword, 'student', 1);
            }
        });


        // Step 3: Insert all other relational data
        schedule.forEach(s => insertSchedule.run(s.id, s.classId, s.subjectId, s.facultyId, s.classroomId, s.day, s.time));
        leaveRequests.forEach(lr => insertLeaveRequest.run(lr.id, lr.requesterId, lr.requesterName, lr.requesterRole, lr.startDate, lr.endDate, lr.reason, lr.status, lr.type || 'academic'));
        scheduleChangeRequests.forEach(scr => insertScheduleChangeRequest.run(scr.id, scr.scheduleId, scr.facultyId, scr.reason, scr.status, scr.requestedClassroomId || null));
        notifications.forEach(n => insertNotification.run(n.id, n.userId, n.message, n.isRead ? 1 : 0, n.createdAt, n.category || 'general'));
        hostels.forEach(h => insertHostel.run(h.id, h.name, h.blocks));
        rooms.forEach(r => insertRoom.run(r.id, r.hostelId, r.roomNumber, r.block, r.studentId, r.floor));
        fees.forEach(f => insertFee.run(f.id, f.studentId, f.semester, f.feeType, f.amount, f.dueDate, f.status, f.transactionId, f.paymentDate));
        attendance.forEach(a => insertAttendance.run(a.id, a.scheduleId, a.studentId, a.date, a.status, a.isLocked ? 1 : 0, a.timestamp));
        results.forEach(r => insertResult.run(r.id, r.studentId, r.subjectId, r.semester, r.marks, r.totalMarks, r.grade, r.examType));
        gatePasses.forEach(gp => insertGatePass.run(gp.id, gp.studentId, gp.requestDate, gp.departureDate, gp.arrivalDate, gp.reason, gp.status));
        badges.forEach(b => insertBadge.run(b.id, b.name, b.description, b.icon, b.rarity, b.category, b.points));
        userBadges.forEach(ub => insertUserBadge.run(ub.id, ub.userId, ub.badgeId, ub.earnedAt));
        
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
