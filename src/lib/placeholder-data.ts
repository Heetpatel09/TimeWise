
import type { Subject, Class, Student, Faculty, Schedule, LeaveRequest, ScheduleChangeRequest, Notification, Classroom, Hostel, Room, Fee, Attendance, Result, GatePass, Badge, UserBadge, Department } from './types';
import { format, subDays, addDays } from 'date-fns';
import { randomBytes } from 'crypto';

// --- DEPARTMENTS ---
export const departments: Department[] = [
  { id: 'DEPT_CSE', name: 'Computer Engineering', code: '001' },
  { id: 'DEPT_AIML', name: 'Artificial Intelligence & ML', code: '002' },
  { id: 'DEPT_ECE', name: 'Electronics Engineering', code: '003' },
  { id: 'DEPT_MECH', name: 'Mechanical Engineering', code: '004' },
];

// --- SUBJECTS ---
export const subjects: (Omit<Subject, 'departmentId'> & { department: string })[] = [
  // CSE Semester 1
  { id: 'SUB001', name: 'Intro to Programming', code: 'CS101', type: 'theory', semester: 1, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB002', name: 'Programming Lab I', code: 'CS102', type: 'lab', semester: 1, department: 'Computer Engineering' },
  { id: 'SUB003', name: 'Digital Logic Design', code: 'EC101', type: 'theory', semester: 1, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB300', name: 'Digital Logic Design Lab', code: 'EC102', type: 'lab', semester: 1, department: 'Computer Engineering' },
  { id: 'SUB004', name: 'Applied Mathematics I', code: 'AM101', type: 'theory', semester: 1, department: 'Computer Engineering', priority: 'Non Negotiable' },
  { id: 'SUB005', name: 'Communication Skills', code: 'HU101', type: 'theory', semester: 1, department: 'Computer Engineering', priority: 'Medium' },

  // CSE Semester 3
  { id: 'SUB006', name: 'Data Structures', code: 'CS201', type: 'theory', semester: 3, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB007', name: 'Data Structures Lab', code: 'CS202', type: 'lab', semester: 3, department: 'Computer Engineering' },
  { id: 'SUB008', name: 'Object Oriented Programming', code: 'CS203', type: 'theory', semester: 3, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB009', name: 'Applied Mathematics III', code: 'AM201', type: 'theory', semester: 3, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB010', name: 'Computer Architecture', code: 'CS204', type: 'theory', semester: 3, department: 'Computer Engineering', priority: 'Medium' },

  // CSE Semester 5
  { id: 'SUB011', name: 'Database Management Systems', code: 'CS301', type: 'theory', semester: 5, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB012', name: 'DBMS Lab', code: 'CS302', type: 'lab', semester: 5, department: 'Computer Engineering' },
  { id: 'SUB013', name: 'Operating Systems', code: 'CS303', type: 'theory', semester: 5, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB014', name: 'Operating Systems Lab', code: 'CS304', type: 'lab', semester: 5, department: 'Computer Engineering' },
  { id: 'SUB015', name: 'Computer Networks', code: 'CS305', type: 'theory', semester: 5, department: 'Computer Engineering', priority: 'High' },

  // CSE Semester 7
  { id: 'SUB016', name: 'Cryptography and Security', code: 'CS402', type: 'theory', semester: 7, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB017', name: 'Cloud Computing', code: 'CS403', type: 'theory', semester: 7, department: 'Computer Engineering', priority: 'High' },
  { id: 'SUB018', name: 'Project I', code: 'CS450', type: 'lab', semester: 7, department: 'Computer Engineering' },
  
  // AI & ML Semester 5
  { id: 'SUB101', name: 'Intro to AI', code: 'AI301', type: 'theory', semester: 5, department: 'Artificial Intelligence & ML', priority: 'High' },
  { id: 'SUB102', name: 'Python for ML', code: 'AI302', type: 'lab', semester: 5, department: 'Artificial Intelligence & ML' },
  { id: 'SUB103', name: 'Linear Algebra for ML', code: 'AI303', type: 'theory', semester: 5, department: 'Artificial Intelligence & ML', priority: 'High' },

  // AI & ML Semester 7
  { id: 'SUB104', name: 'Machine Learning', code: 'AI401', type: 'theory', semester: 7, department: 'Artificial Intelligence & ML', priority: 'High' },
  { id: 'SUB105', name: 'Deep Learning', code: 'AI402', type: 'theory', semester: 7, department: 'Artificial Intelligence & ML', priority: 'High' },
  { id: 'SUB106', name: 'Natural Language Processing', code: 'AI403', type: 'theory', semester: 7, department: 'Artificial Intelligence & ML', priority: 'High' },
  { id: 'SUB107', name: 'AI Lab', code: 'AI404', type: 'lab', semester: 7, department: 'Artificial Intelligence & ML' },
  
  // ECE Subjects
  { id: 'SUB201', name: 'Analog Circuits', code: 'EC201', type: 'theory', semester: 3, department: 'Electronics Engineering', priority: 'High' },
  { id: 'SUB202', name: 'Digital Electronics', code: 'EC202', type: 'theory', semester: 3, department: 'Electronics Engineering', priority: 'High' },
  { id: 'SUB203', name: 'Signals and Systems', code: 'EC301', type: 'theory', semester: 5, department: 'Electronics Engineering', priority: 'High' },
  { id: 'SUB204', name: 'VLSI Design', code: 'EC401', type: 'theory', semester: 7, department: 'Electronics Engineering', priority: 'High' },
  
  // Special / Common Subjects
  { id: 'CODECHEF', name: 'CodeChef', code: 'CC001', type: 'lab', semester: 3, isSpecial: true, department: 'Computer Engineering' },
  { id: 'LIB001', name: 'Library', code: 'LIB001', type: 'theory', semester: 1, department: 'Computer Engineering', isSpecial: false },
].map(sub => ({
  ...sub,
  departmentId: departments.find(d => d.name === sub.department)!.id
}));

export const classes: (Omit<Class, 'departmentId'> & { department: string })[] = [
  // Computer Engineering
  { id: 'CLS001', name: 'CE 2024 (A)', semester: 1, department: 'Computer Engineering', section: 'A' },
  { id: 'CLS002', name: 'CE 2024 (B)', semester: 1, department: 'Computer Engineering', section: 'B' },
  { id: 'CLS003', name: 'CE 2023 (A)', semester: 3, department: 'Computer Engineering', section: 'A' },
  { id: 'CLS004', name: 'CE 2023 (B)', semester: 3, department: 'Computer Engineering', section: 'B' },
  { id: 'CLS005', name: 'CE 2022 (A)', semester: 5, department: 'Computer Engineering', section: 'A' },
  { id: 'CLS006', name: 'CE 2021 (A)', semester: 7, department: 'Computer Engineering', section: 'A' },
  // AI & ML
  { id: 'CLS101', name: 'AIML 2022 (A)', semester: 5, department: 'Artificial Intelligence & ML', section: 'A' },
  { id: 'CLS102', name: 'AIML 2021 (A)', semester: 7, department: 'Artificial Intelligence & ML', section: 'A' },
  // Electronics
  { id: 'CLS201', name: 'ECE 2023 (A)', semester: 3, department: 'Electronics Engineering', section: 'A' },
  { id: 'CLS202', name: 'ECE 2022 (A)', semester: 5, department: 'Electronics Engineering', section: 'A' },
].map(cls => ({
  ...cls,
  departmentId: departments.find(d => d.name === cls.department)!.id
}));

const studentNames = ["Aarav Sharma", "Vivaan Singh", "Aditya Kumar", "Vihaan Gupta", "Arjun Patel", "Sai Joshi", "Reyansh Reddy", "Ayaan Verma", "Krishna Mehta", "Ishaan Shah", "Saanvi Sharma", "Aanya Singh", "Aadhya Kumar", "Ananya Gupta", "Diya Patel", "Pari Joshi", "Myra Reddy", "Anika Verma", "Navya Mehta", "Kiara Shah", "Liam Smith", "Olivia Johnson", "Noah Williams", "Emma Brown", "Oliver Jones", "Ava Garcia", "Elijah Miller", "Charlotte Davis", "James Rodriguez", "Amelia Martinez"];
export const students: Student[] = studentNames.map((name, index) => {
  const classList = classes;
  const currentClass = classList[index % classList.length];
  return {
    id: `STU${(index + 1).toString().padStart(3, '0')}`, name, email: `${name.toLowerCase().replace(' ', '.')}@example.com`, enrollmentNumber: `ENRL24${(index + 1).toString().padStart(4, '0')}`, rollNumber: index + 1, batch: (index % 2) + 1, phone: `98765432${(index + 10).toString().padStart(2, '0')}`, classId: currentClass.id, profileCompleted: 50 + Math.floor(Math.random() * 51), sgpa: parseFloat((7 + Math.random() * 3).toFixed(2)), cgpa: parseFloat((7 + Math.random() * 3).toFixed(2)), streak: name === 'Aarav Sharma' ? 50 : Math.floor(Math.random() * 30), points: Math.floor(Math.random() * 5000),
  } as Student;
});

export const faculty: (Omit<Faculty, 'departmentId'> & { department: string })[] = [
  { id: 'FAC001', name: 'Dr. Alan Turing', email: 'turing@example.com', code: '240101001001', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: ['HOD'], streak: 45, profileCompleted: 90, points: 5200, allottedSubjects: ['SUB001', 'SUB008'], maxWeeklyHours: 20, designatedYear: 1 },
  { id: 'FAC002', name: 'Dr. Ada Lovelace', email: 'lovelace@example.com', code: '240101001002', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 8, profileCompleted: 80, points: 2100, allottedSubjects: ['SUB003', 'SUB006'], maxWeeklyHours: 18, designatedYear: 1 },
  { id: 'FAC003', name: 'Dr. Grace Hopper', email: 'hopper@example.com', code: '240102001003', designation: 'Assistant Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: ['Lab Incharge'], streak: 15, profileCompleted: 85, points: 3400, allottedSubjects: ['SUB002', 'SUB007', 'SUB300'], maxWeeklyHours: 22, designatedYear: 1 },
  { id: 'FAC004', name: 'Dr. John von Neumann', email: 'neumann@example.com', code: '220302001004', designation: 'Assistant Professor', employmentType: 'part-time', department: 'Computer Engineering', roles: [], streak: 0, profileCompleted: 50, points: 500, allottedSubjects: ['SUB013', 'SUB014'], maxWeeklyHours: 10, designatedYear: 3 },
  { id: 'FAC005', name: 'Dr. Donald Knuth', email: 'knuth@example.com', code: '230203001005', designation: 'Lecturer', employmentType: 'contract', department: 'Computer Engineering', roles: [], streak: 0, profileCompleted: 60, points: 800, allottedSubjects: ['SUB005', 'SUB010'], maxWeeklyHours: 15, designatedYear: 2 },
  { id: 'FAC006', name: 'Dr. Andrew Ng', email: 'ng@example.com', code: '210401002006', designation: 'Professor', employmentType: 'full-time', department: 'Artificial Intelligence & ML', roles: ['HOD'], streak: 40, profileCompleted: 98, points: 6000, allottedSubjects: ['SUB101', 'SUB104'], maxWeeklyHours: 20, designatedYear: 4 },
  { id: 'FAC007', name: 'Dr. Fei-Fei Li', email: 'li@example.com', code: '210401002007', designation: 'Professor', employmentType: 'full-time', department: 'Artificial Intelligence & ML', roles: [], streak: 35, profileCompleted: 95, points: 5500, allottedSubjects: ['SUB105', 'SUB107'], maxWeeklyHours: 20, designatedYear: 4 },
  { id: 'FAC008', name: 'Prof. Yann LeCun', email: 'lecun@example.com', code: '220302002008', designation: 'Assistant Professor', employmentType: 'full-time', department: 'Artificial Intelligence & ML', roles: [], streak: 28, profileCompleted: 90, points: 4500, allottedSubjects: ['SUB102', 'SUB106'], maxWeeklyHours: 22, designatedYear: 3 },
  { id: 'FAC009', name: 'Dr. Nikola Tesla', email: 'tesla@example.com', code: '230201003009', designation: 'Professor', employmentType: 'full-time', department: 'Electronics Engineering', roles: ['HOD'], streak: 40, profileCompleted: 90, points: 5500, allottedSubjects: ['SUB201', 'SUB203'], maxWeeklyHours: 20, designatedYear: 2 },
  { id: 'FAC010', name: 'Dr. Marie Curie', email: 'curie@example.com', code: '220301003010', designation: 'Professor', employmentType: 'full-time', department: 'Electronics Engineering', roles: [], streak: 33, profileCompleted: 100, points: 4800, allottedSubjects: ['SUB202', 'SUB204'], maxWeeklyHours: 20, designatedYear: 3 },
  { id: 'FAC011', name: 'Prof. Annalise Keating', email: 'keating@example.com', code: '210401001011', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 14, profileCompleted: 85, points: 3200, allottedSubjects: ['SUB015', 'SUB017'], maxWeeklyHours: 22, designatedYear: 4 },
  { id: 'FAC012', name: 'Prof. Walter White', email: 'white@example.com', code: '240103001012', designation: 'Lecturer', employmentType: 'contract', department: 'Computer Engineering', roles: [], streak: 1, profileCompleted: 40, points: 200, allottedSubjects: ['SUB004'], maxWeeklyHours: 12, designatedYear: 1 },
  { id: 'FAC_LIB', name: 'Library Staff', email: 'library@example.com', code: 'ADMIN01', designation: 'Librarian', employmentType: 'full-time', department: 'Administration', roles: [], streak: 0, profileCompleted: 100, points: 0, allottedSubjects: ['LIB001'], departmentId: 'DEPT_CSE' },
].map(fac => ({
  ...fac,
  departmentId: departments.find(d => d.name === fac.department)?.id || 'DEPT_CSE'
}));

export const classrooms: Classroom[] = [
  ...Array.from({ length: 15 }, (_, i) => ({ id: `CR${(i + 1).toString().padStart(3, '0')}`, name: `Room ${101 + i}`, type: 'classroom', capacity: 70, maintenanceStatus: 'available', building: 'Main Building' })),
  ...Array.from({ length: 15 }, (_, i) => ({ id: `LB${(i + 1).toString().padStart(3, '0')}`, name: `Lab ${i + 1}`, type: 'lab', capacity: 40, maintenanceStatus: 'available', building: 'Tech Park' })),
  { id: 'CR_LIB', name: 'Library Hall', type: 'classroom', capacity: 100, maintenanceStatus: 'available', building: 'Main Building' }
];

export const schedule: Schedule[] = [
  { id: 'SCH001', classId: 'CLS001', subjectId: 'SUB001', facultyId: 'FAC001', classroomId: 'CR001', day: 'Monday', time: '07:30 AM - 08:25 AM' },
  { id: 'SCH002', classId: 'CLS001', subjectId: 'SUB003', facultyId: 'FAC002', classroomId: 'CR002', day: 'Monday', time: '08:25 AM - 09:20 AM' },
  { id: 'SCH004', classId: 'CLS003', subjectId: 'SUB006', facultyId: 'FAC002', classroomId: 'CR001', day: 'Tuesday', time: '09:30 AM - 10:25 AM' },
  { id: 'SCH005', classId: 'CLS005', subjectId: 'SUB011', facultyId: 'FAC004', classroomId: 'CR004', day: 'Wednesday', time: '12:20 PM - 01:15 PM' },
  { id: 'SCH006', classId: 'CLS005', subjectId: 'SUB012', facultyId: 'FAC004', classroomId: 'LB001', day: 'Wednesday', time: '01:15 PM - 02:10 PM' },
  { id: 'SCH007', classId: 'CLS101', subjectId: 'SUB101', facultyId: 'FAC006', classroomId: 'CR005', day: 'Monday', time: '07:30 AM - 08:25 AM' },
];

export const leaveRequests: LeaveRequest[] = [];

export const scheduleChangeRequests: ScheduleChangeRequest[] = [];

export const notifications: Notification[] = [];

export const adminUser = { id: 'admin-user', name: 'Admin', email: 'admin@timewise.app', password: 'admin123', role: 'admin', avatar: 'https://avatar.vercel.sh/admin.png' };
export const managerUser = { id: 'manager-user', name: 'Manager', email: 'manager@timewise.app', password: 'manager123', role: 'manager', avatar: 'https://avatar.vercel.sh/manager.png', permissions: ['manage_students', 'manage_schedule'] };

export const hostels: Hostel[] = [
    { id: 'HOS001', name: 'Jupiter Hall', blocks: 'A,B' }, { id: 'HOS002', name: 'Orion House', blocks: 'A,B,C' }, { id: 'HOS003', name: 'Phoenix Enclave', blocks: 'A' },
];
export const rooms: Room[] = [];
let roomCounter = 1, floorCounter = 1;
hostels.forEach(hostel => {
    const blocks = hostel.blocks.split(',');
    blocks.forEach(block => {
        for (let i = 1; i <= 10; i++) {
            rooms.push({ id: `ROOM${roomCounter.toString().padStart(3, '0')}`, hostelId: hostel.id, roomNumber: `${block}${floorCounter}0${i}`, block: block, studentId: null, floor: floorCounter });
            roomCounter++;
        }
        floorCounter++; if (floorCounter > 4) floorCounter = 1;
    });
});
const aaravIndex = students.findIndex(s => s.id === 'STU001');
if (aaravIndex !== -1) rooms[0].studentId = students[aaravIndex].id;

export const fees: Fee[] = [
    { id: 'FEE001', studentId: 'STU001', semester: 1, feeType: 'tuition', amount: 5000, dueDate: '2024-08-01', status: 'paid', transactionId: `TXN-${Date.now()}` }, { id: 'FEE002', studentId: 'STU001', semester: 1, feeType: 'hostel', amount: 1200, dueDate: '2024-08-01', status: 'paid', transactionId: `TXN-${Date.now() + 1}` }, { id: 'FEE003', studentId: 'STU002', semester: 1, feeType: 'tuition', amount: 5000, dueDate: '2024-08-01', status: 'unpaid' },
];
export const attendance: Attendance[] = [];
const aaravStudent = students.find(s => s.id === 'STU001');
if (aaravStudent) {
    const aaravSchedule = schedule.filter(s => s.classId === aaravStudent.classId);
    if (aaravSchedule.length > 0) {
        for (let i = 0; i < 100; i++) {
            const date = subDays(new Date(), i);
            const dayName = format(date, 'EEEE');
            const daySchedule = aaravSchedule.filter(s => s.day === dayName);
            daySchedule.forEach(slot => { attendance.push({ id: `ATT_AARAV_${slot.id}_${i}`, scheduleId: slot.id, studentId: 'STU001', date: format(date, 'yyyy-MM-dd'), status: (i % 7 === 0) ? 'absent' : 'present', isLocked: false, timestamp: date.toISOString() }); });
        }
    }
}

export const results: Result[] = [
    { id: 'RES001', studentId: 'STU001', subjectId: 'SUB001', semester: 1, examType: 'internal', marks: 85, totalMarks: 100, grade: 'A' }, { id: 'RES002', studentId: 'STU001', subjectId: 'SUB001', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'A' }, { id: 'RES003', studentId: 'STU001', subjectId: 'SUB002', semester: 1, examType: 'internal', marks: 92, totalMarks: 100, grade: 'O' }, { id: 'RES004', studentId: 'STU001', subjectId: 'SUB002', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'O' }, { id: 'RES005', studentId: 'STU001', subjectId: 'SUB003', semester: 1, examType: 'internal', marks: 78, totalMarks: 100, grade: 'B' }, { id: 'RES006', studentId: 'STU001', subjectId: 'SUB003', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'A' }, { id: 'RES007', studentId: 'STU001', subjectId: 'SUB004', semester: 1, examType: 'internal', marks: 88, totalMarks: 100, grade: 'A' }, { id: 'RES008', studentId: 'STU001', subjectId: 'SUB004', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'A' },
];
export const gatePasses: GatePass[] = [
    { id: 'GP001', studentId: 'STU001', requestDate: format(subDays(new Date(), 10), 'yyyy-MM-dd'), departureDate: format(subDays(new Date(), 9), 'yyyy-MM-dd'), arrivalDate: format(subDays(new Date(), 8), 'yyyy-MM-dd'), reason: 'Weekend trip home', status: 'approved' }, { id: 'GP002', studentId: 'STU001', requestDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'), departureDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), arrivalDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), reason: 'Medical emergency', status: 'pending' },
];
export const badges: Badge[] = [
    { id: 'B01', name: 'Top of the Class', description: 'Achieved a CGPA of 9.0 or higher.', icon: 'Award', rarity: 'Epic', category: 'Academic', points: 500 }, { id: 'B02', name: 'Honor Roll', description: 'Maintained a CGPA between 8.0 and 9.0.', icon: 'Star', rarity: 'Rare', category: 'Academic', points: 250 }, { id: 'B03', name: 'Perfect Attendance', description: 'Achieved 100% attendance in a month.', icon: 'CheckCircle', rarity: 'Epic', category: 'Attendance', points: 300 }, { id: 'B04', name: 'Punctuality Pro', description: 'Achieved over 90% attendance in a month.', icon: 'ShieldCheck', rarity: 'Rare', category: 'Attendance', points: 150 }, { id: 'B05', name: 'Taskmaster', description: 'Submitted all assignments on time in a semester.', icon: 'ClipboardCheck', rarity: 'Rare', category: 'Engagement', points: 200 }, { id: 'B06', name: 'Event Enthusiast', description: 'Participated in 3+ university events.', icon: 'PartyPopper', rarity: 'Common', category: 'Engagement', points: 100 },
];
export const userBadges: UserBadge[] = [
    { id: 'UB01', userId: 'STU001', badgeId: 'B02', earnedAt: new Date().toISOString() }, { id: 'UB02', userId: 'STU001', badgeId: 'B04', earnedAt: new Date().toISOString() }, { id: 'UB03', userId: 'FAC001', badgeId: 'B01', earnedAt: new Date().toISOString() },
];

    