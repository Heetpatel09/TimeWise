
import type { Subject, Class, Student, Faculty, Schedule, LeaveRequest, ScheduleChangeRequest, Notification, Classroom, Hostel, Room, Fee, Attendance, Result, GatePass, Badge, UserBadge } from './types';
import { format, subDays, addDays } from 'date-fns';


export const subjects: Subject[] = [
  { id: 'SUB001', name: 'Intro to Programming', code: 'CS101', type: 'theory', semester: 1, syllabus: '{"modules":[{"name":"Basics","topics":["Variables","Data Types"],"weightage":"50%"},{"name":"Control Flow","topics":["If/Else","Loops"],"weightage":"50%"}]}' },
  { id: 'SUB002', name: 'Programming Lab I', code: 'CS102', type: 'lab', semester: 1, syllabus: '{"modules":[{"name":"Lab Work","topics":["Basic Programs"],"weightage":"100%"}]}' },
  { id: 'SUB003', name: 'Digital Logic Design', code: 'EC101', type: 'theory', semester: 1, syllabus: '{"modules":[{"name":"Boolean Algebra","topics":["Theorems","Gates"],"weightage":"50%"},{"name":"Combinational Circuits","topics":["Adders","Subtractors"],"weightage":"50%"}]}' },
  { id: 'SUB004', name: 'Applied Mathematics I', code: 'AM101', type: 'theory', semester: 1, syllabus: '{"modules":[{"name":"Calculus","topics":["Limits","Derivatives"],"weightage":"50%"},{"name":"Linear Algebra","topics":["Matrices","Vectors"],"weightage":"50%"}]}' },

  { id: 'SUB005', name: 'Data Structures', code: 'CS201', type: 'theory', semester: 3, syllabus: '{"modules":[{"name":"Arrays and Strings","topics":["Sorting","Searching"],"weightage":"25%"},{"name":"Linked Lists","topics":["Singly","Doubly"],"weightage":"25%"},{"name":"Trees","topics":["BST","AVL"],"weightage":"25%"},{"name":"Graphs","topics":["BFS","DFS"],"weightage":"25%"}]}' },
  { id: 'SUB006', name: 'Data Structures Lab', code: 'CS202', type: 'lab', semester: 3, syllabus: '{"modules":[{"name":"Lab Work","topics":["Implementing DS"],"weightage":"100%"}]}' },
  { id: 'SUB007', name: 'Object Oriented Programming', code: 'CS203', type: 'theory', semester: 3, syllabus: '{"modules":[{"name":"OOP Concepts","topics":["Inheritance","Polymorphism"],"weightage":"50%"},{"name":"Java Basics","topics":["Classes","Objects"],"weightage":"50%"}]}' },
  { id: 'SUB008', name: 'Applied Mathematics III', code: 'AM201', type: 'theory', semester: 3, syllabus: '{"modules":[{"name":"Complex Variables","topics":["Functions","Integration"],"weightage":"50%"},{"name":"Transforms","topics":["Laplace","Fourier"],"weightage":"50%"}]}' },
  
  { id: 'SUB009', name: 'Database Management Systems', code: 'CS301', type: 'theory', semester: 5, syllabus: '{"modules":[{"name":"SQL Basics","topics":["SELECT","UPDATE","DELETE"],"weightage":"40%"},{"name":"Normalization","topics":["1NF","2NF","3NF"],"weightage":"60%"}]}' },
  { id: 'SUB010', name: 'DBMS Lab', code: 'CS302', type: 'lab', semester: 5, syllabus: '{"modules":[{"name":"Lab Work","topics":["Queries","Schema Design"],"weightage":"100%"}]}' },
  { id: 'SUB011', name: 'Operating Systems', code: 'CS303', type: 'theory', semester: 5, syllabus: '{"modules":[{"name":"Process Management","topics":["Scheduling","Deadlocks"],"weightage":"50%"},{"name":"Memory Management","topics":["Paging","Segmentation"],"weightage":"50%"}]}' },
  { id: 'SUB012', name: 'Computer Networks', code: 'CS304', type: 'theory', semester: 5, syllabus: '{"modules":[{"name":"OSI Model","topics":["Layers"],"weightage":"50%"},{"name":"TCP/IP","topics":["Sockets","Ports"],"weightage":"50%"}]}' },

  { id: 'SUB013', name: 'Machine Learning', code: 'AI401', type: 'theory', semester: 7, syllabus: '{"modules":[{"name":"Supervised Learning","topics":["Regression","Classification"],"weightage":"50%"},{"name":"Unsupervised Learning","topics":["Clustering","Dimensionality Reduction"],"weightage":"50%"}]}' },
  { id: 'SUB014', name: 'Cryptography and Security', code: 'CS402', type: 'theory', semester: 7, syllabus: '{"modules":[{"name":"Symmetric Key","topics":["DES","AES"],"weightage":"50%"},{"name":"Asymmetric Key","topics":["RSA","ECC"],"weightage":"50%"}]}' },
  { id: 'SUB015', name: 'Cloud Computing', code: 'CS403', type: 'theory', semester: 7, syllabus: '{"modules":[{"name":"Virtualization","topics":["Hypervisors"],"weightage":"50%"},{"name":"Cloud Models","topics":["IaaS","PaaS","SaaS"],"weightage":"50%"}]}' },
  { id: 'SUB016', name: 'AI Lab', code: 'AI402', type: 'lab', semester: 7, syllabus: '{"modules":[{"name":"Lab Work","topics":["Model Training"],"weightage":"100%"}]}' },

  { id: 'SUB017', name: 'Analog Circuits', code: 'EC201', type: 'theory', semester: 3, department: 'Electronics Engineering' },
  { id: 'SUB018', name: 'Digital Electronics', code: 'EC202', type: 'theory', semester: 3, department: 'Electronics Engineering' },
  { id: 'SUB019', name: 'Signals and Systems', code: 'EC301', type: 'theory', semester: 5, department: 'Electronics Engineering' },
  { id: 'SUB020', name: 'VLSI Design', code: 'EC401', type: 'theory', semester: 7, department: 'Electronics Engineering' },
];

export const classes: Class[] = [
  { id: 'CLS001', name: 'FE COMP A', semester: 1, department: 'Computer Engineering' },
  { id: 'CLS002', name: 'FE COMP B', semester: 1, department: 'Computer Engineering' },
  { id: 'CLS003', name: 'SE COMP A', semester: 3, department: 'Computer Engineering' },
  { id: 'CLS004', name: 'SE COMP B', semester: 3, department: 'Computer Engineering' },
  { id: 'CLS005', name: 'TE COMP A', semester: 5, department: 'Computer Engineering' },
  { id: 'CLS006', name: 'TE COMP B', semester: 5, department: 'Computer Engineering' },
  { id: 'CLS007', name: 'BE COMP A', semester: 7, department: 'Computer Engineering' },
  { id: 'CLS008', name: 'BE COMP B', semester: 7, department: 'Computer Engineering' },
  { id: 'CLS009', name: 'SE ETRX', semester: 3, department: 'Electronics Engineering' },
  { id: 'CLS010', name: 'TE ETRX', semester: 5, department: 'Electronics Engineering' },
  { id: 'CLS011', name: 'BE ETRX', semester: 7, department: 'Electronics Engineering' },
];

const studentNames = [
  "Aarav Sharma", "Vivaan Singh", "Aditya Kumar", "Vihaan Gupta", "Arjun Patel", "Sai Joshi", "Reyansh Reddy", "Ayaan Verma", "Krishna Mehta", "Ishaan Shah",
  "Saanvi Sharma", "Aanya Singh", "Aadhya Kumar", "Ananya Gupta", "Diya Patel", "Pari Joshi", "Myra Reddy", "Anika Verma", "Navya Mehta", "Kiara Shah",
  "Liam Smith", "Olivia Johnson", "Noah Williams", "Emma Brown", "Oliver Jones", "Ava Garcia", "Elijah Miller", "Charlotte Davis", "James Rodriguez", "Amelia Martinez",
  "Benjamin Hernandez", "Mia Lopez", "Lucas Gonzalez", "Harper Wilson", "Henry Anderson", "Evelyn Thomas", "Alexander Taylor", "Abigail Moore", "Michael Jackson", "Emily White",
  "Daniel Harris", "Sofia Martin", "Matthew Thompson", "Avery Garcia", "Joseph Martinez", "Ella Robinson", "John Lewis", "Grace Lee", "Robert Walker"
];

export const students: Student[] = studentNames.map((name, index) => {
  const classList = classes;
  const currentClass = classList[index % classList.length];

  return {
    id: `STU${(index + 1).toString().padStart(3, '0')}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    enrollmentNumber: `ENRL${new Date().getFullYear()}${(index + 1).toString().padStart(4, '0')}`,
    rollNumber: index + 1,
    section: (index % 2 === 0) ? 'A' : 'B',
    batch: (index % 2) + 1,
    phone: `98765432${(index + 10).toString().padStart(2, '0')}`,
    category: (index % 5 === 0) ? 'Scholarship' : 'General',
    classId: currentClass.id,
    profileCompleted: 50 + Math.floor(Math.random() * 51),
    sgpa: parseFloat((7 + Math.random() * 3).toFixed(2)),
    cgpa: parseFloat((7 + Math.random() * 3).toFixed(2)),
    streak: Math.floor(Math.random() * 30),
    points: Math.floor(Math.random() * 5000)
  };
});


export const faculty: Faculty[] = [
  { id: 'FAC001', name: 'Dr. Alan Turing', email: 'turing@example.com', code: 'TNG01', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: ['HOD'], streak: 45, profileCompleted: 90, points: 5200 },
  { id: 'FAC002', name: 'Dr. Ada Lovelace', email: 'lovelace@example.com', code: 'LCE02', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 8, profileCompleted: 80, points: 2100 },
  { id: 'FAC003', name: 'Dr. Grace Hopper', email: 'hopper@example.com', code: 'HPR03', designation: 'Assistant Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: ['Lab Incharge'], streak: 15, profileCompleted: 85, points: 3400 },
  { id: 'FAC004', name: 'Dr. John von Neumann', email: 'neumann@example.com', code: 'NMN04', designation: 'Assistant Professor', employmentType: 'part-time', department: 'Computer Engineering', roles: [], streak: 0, profileCompleted: 50, points: 500 },
  { id: 'FAC005', name: 'Dr. Donald Knuth', email: 'knuth@example.com', code: 'KNH05', designation: 'Lecturer', employmentType: 'contract', department: 'Computer Engineering', roles: [], streak: 0, profileCompleted: 60, points: 800 },
  { id: 'FAC006', name: 'Dr. Abhinav Gupta', email: 'abhinav@example.com', code: 'GPT06', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 25, profileCompleted: 95, points: 4500 },
  { id: 'FAC007', name: 'Prof. Sheldon Cooper', email: 'cooper@example.com', code: 'CPR07', designation: 'Professor', employmentType: 'full-time', department: 'Physics', roles: [], streak: 3, profileCompleted: 70, points: 1200 },
  { id: 'FAC008', name: 'Prof. Minerva McGonagall', email: 'mcgonagall@example.com', code: 'MGL08', designation: 'Professor', employmentType: 'full-time', department: 'Transfiguration', roles: ['HOD'], streak: 50, profileCompleted: 100, points: 6000 },
  { id: 'FAC009', name: 'Prof. Walter White', email: 'white@example.com', code: 'WHT09', designation: 'Lecturer', employmentType: 'contract', department: 'Chemistry', roles: [], streak: 1, profileCompleted: 40, points: 200 },
  { id: 'FAC010', name: 'Prof. Indiana Jones', email: 'jones@example.com', code: 'JNS10', designation: 'Professor', employmentType: 'full-time', department: 'Archaeology', roles: [], streak: 12, profileCompleted: 75, points: 2800 },
  { id: 'FAC011', name: 'Dr. Marie Curie', email: 'curie@example.com', code: 'CRE11', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 33, profileCompleted: 100, points: 4800 },
  { id: 'FAC012', name: 'Dr. Nikola Tesla', email: 'tesla@example.com', code: 'TSL12', designation: 'Professor', employmentType: 'full-time', department: 'Electronics Engineering', roles: ['HOD'], streak: 40, profileCompleted: 90, points: 5500 },
  { id: 'FAC013', name: 'Dr. Isaac Newton', email: 'newton@example.com', code: 'NTN13', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 20, profileCompleted: 88, points: 3900 },
  { id: 'FAC014', name: 'Dr. Albert Einstein', email: 'einstein@example.com', code: 'EST14', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 18, profileCompleted: 92, points: 3600 },
  { id: 'FAC015', name: 'Dr. Rosalind Franklin', email: 'franklin@example.com', code: 'FRN15', designation: 'Assistant Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 22, profileCompleted: 95, points: 4100 },
  { id: 'FAC016', name: 'Dr. Stephen Hawking', email: 'hawking@example.com', code: 'HWK16', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 30, profileCompleted: 98, points: 4700 },
  { id: 'FAC017', name: 'Prof. Charles Xavier', email: 'xavier@example.com', code: 'XVR17', designation: 'Professor', employmentType: 'full-time', department: 'Electronics Engineering', roles: [], streak: 10, profileCompleted: 80, points: 2500 },
  { id: 'FAC018', name: 'Prof. Albus Dumbledore', email: 'dumbledore@example.com', code: 'DDR18', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 55, profileCompleted: 100, points: 6500 },
  { id: 'FAC019', name: 'Prof. Severus Snape', email: 'snape@example.com', code: 'SNP19', designation: 'Assistant Professor', employmentType: 'part-time', department: 'Electronics Engineering', roles: [], streak: 5, profileCompleted: 65, points: 1500 },
  { id: 'FAC020', name: 'Prof. Annalise Keating', email: 'keating@example.com', code: 'KTG20', designation: 'Professor', employmentType: 'full-time', department: 'Computer Engineering', roles: [], streak: 14, profileCompleted: 85, points: 3200 },
];

export const classrooms: Classroom[] = Array.from({ length: 25 }, (_, i) => {
    const num = i + 1;
    const isLab = num > 20; // Last 5 are labs
    return {
        id: `CR${num.toString().padStart(3, '0')}`,
        name: isLab ? `Lab ${String.fromCharCode(65 + (num - 21))}` : `Room ${100 + num}`,
        type: isLab ? 'lab' : 'classroom',
        capacity: isLab ? 30 : 60,
        maintenanceStatus: 'available',
        building: num <= 10 ? 'Main Building' : 'Tech Park'
    };
});

// A more robust schedule generation
const tempSchedule: Omit<Schedule, 'id'>[] = [];
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = ['07:30 AM - 08:30 AM', '08:30 AM - 09:30 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'];
const facultyCopy = [...faculty];
const classroomsCopy = [...classrooms];

classes.forEach(c => {
    const classSubjects = subjects.filter(s => s.semester === c.semester);
    daysOfWeek.forEach(day => {
        const dailySlots = [...timeSlots];
        for(let i=0; i<4; i++) { // Assign ~4 lectures a day
            if (dailySlots.length === 0 || classSubjects.length === 0 || facultyCopy.length === 0 || classroomsCopy.length === 0) break;

            const time = dailySlots.splice(Math.floor(Math.random() * dailySlots.length), 1)[0];
            const subject = classSubjects[Math.floor(Math.random() * classSubjects.length)];
            const fac = facultyCopy[Math.floor(Math.random() * facultyCopy.length)];
            const room = classroomsCopy.find(r => (subject.type === 'lab' ? r.type === 'lab' : r.type === 'classroom')) || classroomsCopy[0];
            
            // Basic conflict check
            const conflict = tempSchedule.find(s => s.day === day && s.time === time && (s.facultyId === fac.id || s.classroomId === room.id));
            if (!conflict) {
                 tempSchedule.push({
                    classId: c.id,
                    subjectId: subject.id,
                    facultyId: fac.id,
                    classroomId: room.id,
                    day: day as Schedule['day'],
                    time: time
                });
            }
        }
    });
});
export const schedule: Schedule[] = tempSchedule.map((s, i) => ({ ...s, id: `SCH${(i + 1).toString().padStart(3, '0')}` }));

export const leaveRequests: LeaveRequest[] = [
  { id: 'LR001', requesterId: 'FAC002', requesterName: 'Dr. Ada Lovelace', requesterRole: 'faculty', startDate: '2024-08-01', endDate: '2024-08-05', reason: 'Family wedding.', status: 'pending', type: 'academic' },
  { id: 'LR002', requesterId: 'FAC003', requesterName: 'Dr. Grace Hopper', requesterRole: 'faculty', startDate: '2024-08-10', endDate: '2024-08-12', reason: 'Attending a conference.', status: 'pending', type: 'academic' },
  { id: 'LR003', requesterId: 'FAC001', requesterName: 'Dr. Alan Turing', requesterRole: 'faculty', startDate: '2024-07-20', endDate: '2024-07-21', reason: 'Personal reasons.', status: 'approved', type: 'academic' },
  { id: 'LR004', requesterId: 'STU001', requesterName: 'Aarav Sharma', requesterRole: 'student', startDate: '2024-08-02', endDate: '2024-08-03', reason: 'Medical appointment.', status: 'pending', type: 'academic' },
  { id: 'LR005', requesterId: 'STU001', requesterName: 'Aarav Sharma', requesterRole: 'student', startDate: format(addDays(new Date(), 5), 'yyyy-MM-dd'), endDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'), reason: 'Going home for a family function.', status: 'pending', type: 'hostel' },
];

export const scheduleChangeRequests: ScheduleChangeRequest[] = [
    { id: 'SCR001', scheduleId: 'SCH001', facultyId: 'FAC001', reason: 'Need to swap this class with my afternoon slot.', status: 'pending' },
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

export const hostels: Hostel[] = [
    { id: 'HOS001', name: 'Jupiter Hall', blocks: 'A,B' },
    { id: 'HOS002', name: 'Orion House', blocks: 'A,B,C' },
    { id: 'HOS003', name: 'Phoenix Enclave', blocks: 'A' },
];

export const rooms: Room[] = [];
let roomCounter = 1;
let floorCounter = 1;
hostels.forEach(hostel => {
    const blocks = hostel.blocks.split(',');
    blocks.forEach(block => {
        for (let i = 1; i <= 10; i++) { // 10 rooms per block
            const room: Room = {
                id: `ROOM${roomCounter.toString().padStart(3, '0')}`,
                hostelId: hostel.id,
                roomNumber: `${block}${floorCounter}0${i}`,
                block: block,
                studentId: null,
                floor: floorCounter,
            };
            rooms.push(room);
            roomCounter++;
        }
        floorCounter++;
        if (floorCounter > 4) floorCounter = 1; // Max 4 floors
    });
});

// Assign Aarav Sharma to a room
const aaravIndex = students.findIndex(s => s.id === 'STU001');
if (aaravIndex !== -1) {
    rooms[0].studentId = students[aaravIndex].id;
}


export const fees: Fee[] = [
    { id: 'FEE001', studentId: 'STU001', semester: 1, feeType: 'tuition', amount: 5000, dueDate: '2024-08-01', status: 'paid' },
    { id: 'FEE002', studentId: 'STU001', semester: 1, feeType: 'hostel', amount: 1200, dueDate: '2024-08-01', status: 'paid' },
    { id: 'FEE003', studentId: 'STU002', semester: 1, feeType: 'tuition', amount: 5000, dueDate: '2024-08-01', status: 'unpaid' },
];

export const attendance: Attendance[] = [
    // Create a 5-day streak for Aarav Sharma (STU001) ending yesterday
    ...Array.from({ length: 5 }).map((_, i) => ({
        id: `ATT_AARAV_${i}`,
        scheduleId: 'SCH003', // A class Aarav is in
        studentId: 'STU001',
        date: format(subDays(new Date(), i + 1), 'yyyy-MM-dd'),
        status: 'present' as 'present',
        isLocked: false,
        timestamp: new Date().toISOString()
    })),
    // Add one absence to break the streak before that
    {
        id: 'ATT_AARAV_ABSENT',
        scheduleId: 'SCH003',
        studentId: 'STU001',
        date: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        status: 'absent',
        isLocked: false,
        timestamp: new Date().toISOString()
    },
     // Add some attendance for other students
    {
        id: 'ATT_OTHER_1',
        scheduleId: 'SCH003',
        studentId: 'STU002',
        date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
        status: 'present',
        isLocked: false,
        timestamp: new Date().toISOString()
    },
    {
        id: 'ATT_OTHER_2',
        scheduleId: 'SCH004',
        studentId: 'STU002',
        date: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
        status: 'absent',
        isLocked: false,
        timestamp: new Date().toISOString()
    }
];

export const results: Result[] = [
    // Semester 1 results for Aarav Sharma (STU001)
    { id: 'RES001', studentId: 'STU001', subjectId: 'SUB001', semester: 1, examType: 'internal', marks: 85, totalMarks: 100, grade: 'A' },
    { id: 'RES002', studentId: 'STU001', subjectId: 'SUB001', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'A' },
    { id: 'RES003', studentId: 'STU001', subjectId: 'SUB002', semester: 1, examType: 'internal', marks: 92, totalMarks: 100, grade: 'O' },
    { id: 'RES004', studentId: 'STU001', subjectId: 'SUB002', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'O' },
    { id: 'RES005', studentId: 'STU001', subjectId: 'SUB003', semester: 1, examType: 'internal', marks: 78, totalMarks: 100, grade: 'B' },
    { id: 'RES006', studentId: 'STU001', subjectId: 'SUB003', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'A' },
    { id: 'RES007', studentId: 'STU001', subjectId: 'SUB004', semester: 1, examType: 'internal', marks: 88, totalMarks: 100, grade: 'A' },
    { id: 'RES008', studentId: 'STU001', subjectId: 'SUB004', semester: 1, examType: 'external', marks: null, totalMarks: null, grade: 'A' },

    // Other student results for different semesters
    { id: 'RES009', studentId: 'STU003', subjectId: 'SUB005', semester: 3, examType: 'internal', marks: 90, totalMarks: 100, grade: 'O' },
    { id: 'RES010', studentId: 'STU003', subjectId: 'SUB005', semester: 3, examType: 'external', marks: null, totalMarks: null, grade: 'O' },
    { id: 'RES011', studentId: 'STU005', subjectId: 'SUB009', semester: 5, examType: 'internal', marks: 75, totalMarks: 100, grade: 'B' },
    { id: 'RES012', studentId: 'STU005', subjectId: 'SUB009', semester: 5, examType: 'external', marks: null, totalMarks: null, grade: 'B' },
];

export const gatePasses: GatePass[] = [
    { id: 'GP001', studentId: 'STU001', requestDate: format(subDays(new Date(), 10), 'yyyy-MM-dd'), departureDate: format(subDays(new Date(), 9), 'yyyy-MM-dd'), arrivalDate: format(subDays(new Date(), 8), 'yyyy-MM-dd'), reason: 'Weekend trip home', status: 'approved' },
    { id: 'GP002', studentId: 'STU001', requestDate: format(subDays(new Date(), 2), 'yyyy-MM-dd'), departureDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'), arrivalDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), reason: 'Medical emergency', status: 'pending' },
];

export const badges: Badge[] = [
    // Academic
    { id: 'B01', name: 'Top of the Class', description: 'Achieved a CGPA of 9.0 or higher.', icon: 'Award', rarity: 'Epic', category: 'Academic', points: 500 },
    { id: 'B02', name: 'Honor Roll', description: 'Maintained a CGPA between 8.0 and 9.0.', icon: 'Star', rarity: 'Rare', category: 'Academic', points: 250 },
    // Attendance
    { id: 'B03', name: 'Perfect Attendance', description: 'Achieved 100% attendance in a month.', icon: 'CheckCircle', rarity: 'Epic', category: 'Attendance', points: 300 },
    { id: 'B04', name: 'Punctuality Pro', description: 'Achieved over 90% attendance in a month.', icon: 'ShieldCheck', rarity: 'Rare', category: 'Attendance', points: 150 },
    // Assignments
    { id: 'B05', name: 'Taskmaster', description: 'Submitted all assignments on time in a semester.', icon: 'ClipboardCheck', rarity: 'Rare', category: 'Engagement', points: 200 },
    // Events
    { id: 'B06', name: 'Event Enthusiast', description: 'Participated in 3+ university events.', icon: 'PartyPopper', rarity: 'Common', category: 'Engagement', points: 100 },
];

export const userBadges: UserBadge[] = [
    { id: 'UB01', userId: 'STU001', badgeId: 'B02', earnedAt: new Date().toISOString() },
    { id: 'UB02', userId: 'STU001', badgeId: 'B04', earnedAt: new Date().toISOString() },
    { id: 'UB03', userId: 'FAC001', badgeId: 'B01', earnedAt: new Date().toISOString() },
];
