
import type { Subject, Class, Student, Faculty, Schedule, LeaveRequest, ScheduleChangeRequest, Notification, Classroom, Hostel, Room } from './types';

export const subjects: Subject[] = [
  { id: 'SUB001', name: 'Intro to Programming', code: 'CS101', isSpecial: false, type: 'theory', semester: 1, syllabus: '{"modules":[{"name":"Basics","topics":["Variables","Data Types"],"weightage":"50%"},{"name":"Control Flow","topics":["If/Else","Loops"],"weightage":"50%"}]}' },
  { id: 'SUB002', name: 'Programming Lab I', code: 'CS102', isSpecial: false, type: 'lab', semester: 1, syllabus: '{"modules":[{"name":"Lab Work","topics":["Basic Programs"],"weightage":"100%"}]}' },
  { id: 'SUB003', name: 'Digital Logic Design', code: 'EC101', isSpecial: false, type: 'theory', semester: 1, syllabus: '{"modules":[{"name":"Boolean Algebra","topics":["Theorems","Gates"],"weightage":"50%"},{"name":"Combinational Circuits","topics":["Adders","Subtractors"],"weightage":"50%"}]}' },
  { id: 'SUB004', name: 'Applied Mathematics I', code: 'AM101', isSpecial: false, type: 'theory', semester: 1, syllabus: '{"modules":[{"name":"Calculus","topics":["Limits","Derivatives"],"weightage":"50%"},{"name":"Linear Algebra","topics":["Matrices","Vectors"],"weightage":"50%"}]}' },

  { id: 'SUB005', name: 'Data Structures', code: 'CS201', isSpecial: false, type: 'theory', semester: 3, syllabus: '{"modules":[{"name":"Arrays and Strings","topics":["Sorting","Searching"],"weightage":"25%"},{"name":"Linked Lists","topics":["Singly","Doubly"],"weightage":"25%"},{"name":"Trees","topics":["BST","AVL"],"weightage":"25%"},{"name":"Graphs","topics":["BFS","DFS"],"weightage":"25%"}]}' },
  { id: 'SUB006', name: 'Data Structures Lab', code: 'CS202', isSpecial: false, type: 'lab', semester: 3, syllabus: '{"modules":[{"name":"Lab Work","topics":["Implementing DS"],"weightage":"100%"}]}' },
  { id: 'SUB007', name: 'Object Oriented Programming', code: 'CS203', isSpecial: false, type: 'theory', semester: 3, syllabus: '{"modules":[{"name":"OOP Concepts","topics":["Inheritance","Polymorphism"],"weightage":"50%"},{"name":"Java Basics","topics":["Classes","Objects"],"weightage":"50%"}]}' },
  { id: 'SUB008', name: 'Applied Mathematics III', code: 'AM201', isSpecial: false, type: 'theory', semester: 3, syllabus: '{"modules":[{"name":"Complex Variables","topics":["Functions","Integration"],"weightage":"50%"},{"name":"Transforms","topics":["Laplace","Fourier"],"weightage":"50%"}]}' },
  
  { id: 'SUB009', name: 'Database Management Systems', code: 'CS301', isSpecial: false, type: 'theory', semester: 5, syllabus: '{"modules":[{"name":"SQL Basics","topics":["SELECT","UPDATE","DELETE"],"weightage":"40%"},{"name":"Normalization","topics":["1NF","2NF","3NF"],"weightage":"60%"}]}' },
  { id: 'SUB010', name: 'DBMS Lab', code: 'CS302', isSpecial: false, type: 'lab', semester: 5, syllabus: '{"modules":[{"name":"Lab Work","topics":["Queries","Schema Design"],"weightage":"100%"}]}' },
  { id: 'SUB011', name: 'Operating Systems', code: 'CS303', isSpecial: false, type: 'theory', semester: 5, syllabus: '{"modules":[{"name":"Process Management","topics":["Scheduling","Deadlocks"],"weightage":"50%"},{"name":"Memory Management","topics":["Paging","Segmentation"],"weightage":"50%"}]}' },
  { id: 'SUB012', name: 'Computer Networks', code: 'CS304', isSpecial: false, type: 'theory', semester: 5, syllabus: '{"modules":[{"name":"OSI Model","topics":["Layers"],"weightage":"50%"},{"name":"TCP/IP","topics":["Sockets","Ports"],"weightage":"50%"}]}' },

  { id: 'SUB013', name: 'Machine Learning', code: 'AI401', isSpecial: true, type: 'theory', semester: 7, syllabus: '{"modules":[{"name":"Supervised Learning","topics":["Regression","Classification"],"weightage":"50%"},{"name":"Unsupervised Learning","topics":["Clustering","Dimensionality Reduction"],"weightage":"50%"}]}' },
  { id: 'SUB014', name: 'Cryptography and Security', code: 'CS402', isSpecial: false, type: 'theory', semester: 7, syllabus: '{"modules":[{"name":"Symmetric Key","topics":["DES","AES"],"weightage":"50%"},{"name":"Asymmetric Key","topics":["RSA","ECC"],"weightage":"50%"}]}' },
  { id: 'SUB015', name: 'Cloud Computing', code: 'CS403', isSpecial: false, type: 'theory', semester: 7, syllabus: '{"modules":[{"name":"Virtualization","topics":["Hypervisors"],"weightage":"50%"},{"name":"Cloud Models","topics":["IaaS","PaaS","SaaS"],"weightage":"50%"}]}' },
  { id: 'SUB016', name: 'AI Lab', code: 'AI402', isSpecial: false, type: 'lab', semester: 7, syllabus: '{"modules":[{"name":"Lab Work","topics":["Model Training"],"weightage":"100%"}]}' },

  { id: 'SUB017', name: 'Analog Circuits', code: 'EC201', isSpecial: false, type: 'theory', semester: 3, department: 'Electronics Engineering' },
  { id: 'SUB018', name: 'Digital Electronics', code: 'EC202', isSpecial: false, type: 'theory', semester: 3, department: 'Electronics Engineering' },
  { id: 'SUB019', name: 'Signals and Systems', code: 'EC301', isSpecial: false, type: 'theory', semester: 5, department: 'Electronics Engineering' },
  { id: 'SUB020', name: 'VLSI Design', code: 'EC401', isSpecial: false, type: 'theory', semester: 7, department: 'Electronics Engineering' },
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
  "Daniel Harris", "Sofia Martin", "Matthew Thompson", "Avery Garcia", "Joseph Martinez", "Ella Robinson", "David Clark", "Scarlett Rodriguez", "John Lewis", "Grace Lee", "Robert Walker"
];

export const students: Student[] = studentNames.map((name, index) => {
  const classList = classes;
  const classId = classList[index % classList.length].id;
  return {
    id: `STU${(index + 1).toString().padStart(3, '0')}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    classId,
    streak: Math.floor(Math.random() * 30),
    profileCompleted: 50 + Math.floor(Math.random() * 51),
    sgpa: parseFloat((7 + Math.random() * 3).toFixed(2)),
    cgpa: parseFloat((7 + Math.random() * 3).toFixed(2)),
  };
});


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
  { id: 'FAC011', name: 'Dr. Marie Curie', email: 'curie@example.com', department: 'Computer Engineering', streak: 33, profileCompleted: 100 },
  { id: 'FAC012', name: 'Dr. Nikola Tesla', email: 'tesla@example.com', department: 'Electronics Engineering', streak: 40, profileCompleted: 90 },
  { id: 'FAC013', name: 'Dr. Isaac Newton', email: 'newton@example.com', department: 'Computer Engineering', streak: 20, profileCompleted: 88 },
  { id: 'FAC014', name: 'Dr. Albert Einstein', email: 'einstein@example.com', department: 'Computer Engineering', streak: 18, profileCompleted: 92 },
  { id: 'FAC015', name: 'Dr. Rosalind Franklin', email: 'franklin@example.com', department: 'Computer Engineering', streak: 22, profileCompleted: 95 },
  { id: 'FAC016', name: 'Dr. Stephen Hawking', email: 'hawking@example.com', department: 'Computer Engineering', streak: 30, profileCompleted: 98 },
  { id: 'FAC017', name: 'Prof. Charles Xavier', email: 'xavier@example.com', department: 'Electronics Engineering', streak: 10, profileCompleted: 80 },
  { id: 'FAC018', name: 'Prof. Albus Dumbledore', email: 'dumbledore@example.com', department: 'Computer Engineering', streak: 55, profileCompleted: 100 },
  { id: 'FAC019', name: 'Prof. Severus Snape', email: 'snape@example.com', department: 'Electronics Engineering', streak: 5, profileCompleted: 65 },
  { id: 'FAC020', name: 'Prof. Annalise Keating', email: 'keating@example.com', department: 'Computer Engineering', streak: 14, profileCompleted: 85 },
];

export const classrooms: Classroom[] = Array.from({ length: 25 }, (_, i) => {
    const num = i + 1;
    const isLab = num > 20; // Last 5 are labs
    return {
        id: `CR${num.toString().padStart(3, '0')}`,
        name: isLab ? `Lab ${String.fromCharCode(65 + (num - 21))}` : `Room ${100 + num}`,
        type: isLab ? 'lab' : 'classroom',
    };
});

export const schedule: Schedule[] = [
  // Dr. Alan Turing (FAC001) - 6 lectures, 6 labs
  // Lectures
  { id: 'SCH_F1_L1', classId: 'CLS007', subjectId: 'SUB014', facultyId: 'FAC001', classroomId: 'CR001', day: 'Monday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH_F1_L2', classId: 'CLS001', subjectId: 'SUB004', facultyId: 'FAC001', classroomId: 'CR016', day: 'Wednesday', time: '11:00 AM - 12:00 PM' },
  { id: 'SCH_F1_L3', classId: 'CLS005', subjectId: 'SUB011', facultyId: 'FAC001', classroomId: 'CR002', day: 'Thursday', time: '02:00 PM - 03:00 PM' },
  { id: 'SCH_F1_L4', classId: 'CLS003', subjectId: 'SUB007', facultyId: 'FAC001', classroomId: 'CR003', day: 'Thursday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH_F1_L5', classId: 'CLS007', subjectId: 'SUB014', facultyId: 'FAC001', classroomId: 'CR015', day: 'Friday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH_F1_L6', classId: 'CLS003', subjectId: 'SUB005', facultyId: 'FAC001', classroomId: 'CR017', day: 'Friday', time: '10:00 AM - 11:00 AM' },
  // Labs
  { id: 'SCH_F1_B1', classId: 'CLS002', subjectId: 'SUB002', facultyId: 'FAC001', classroomId: 'CR023', day: 'Friday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH_F1_B2', classId: 'CLS008', subjectId: 'SUB016', facultyId: 'FAC001', classroomId: 'CR021', day: 'Monday', time: '10:00 AM - 11:00 AM' },
  { id: 'SCH_F1_B3', classId: 'CLS004', subjectId: 'SUB006', facultyId: 'FAC001', classroomId: 'CR023', day: 'Monday', time: '01:00 PM - 02:00 PM' },
  { id: 'SCH_F1_B4', classId: 'CLS006', subjectId: 'SUB010', facultyId: 'FAC001', classroomId: 'CR022', day: 'Thursday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH_F1_B5', classId: 'CLS001', subjectId: 'SUB002', facultyId: 'FAC001', classroomId: 'CR024', day: 'Thursday', time: '11:00 AM - 12:00 PM' },
  { id: 'SCH_F1_B6', classId: 'CLS008', subjectId: 'SUB016', facultyId: 'FAC001', classroomId: 'CR025', day: 'Friday', time: '01:00 PM - 02:00 PM' },

  // Other Faculty Schedule
  { id: 'SCH002', classId: 'CLS005', subjectId: 'SUB009', facultyId: 'FAC002', classroomId: 'CR002', day: 'Monday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH003', classId: 'CLS003', subjectId: 'SUB005', facultyId: 'FAC003', classroomId: 'CR003', day: 'Monday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH004', classId: 'CLS001', subjectId: 'SUB001', facultyId: 'FAC004', classroomId: 'CR004', day: 'Monday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH006', classId: 'CLS006', subjectId: 'SUB010', facultyId: 'FAC006', classroomId: 'CR022', day: 'Monday', time: '11:00 AM - 12:00 PM' },
  { id: 'SCH008', classId: 'CLS002', subjectId: 'SUB002', facultyId: 'FAC008', classroomId: 'CR024', day: 'Monday', time: '02:00 PM - 03:00 PM' },
  { id: 'SCH009', classId: 'CLS009', subjectId: 'SUB017', facultyId: 'FAC012', classroomId: 'CR005', day: 'Monday', time: '10:00 AM - 11:00 AM' },

  { id: 'SCH010', classId: 'CLS007', subjectId: 'SUB015', facultyId: 'FAC009', classroomId: 'CR005', day: 'Tuesday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH011', classId: 'CLS005', subjectId: 'SUB011', facultyId: 'FAC010', classroomId: 'CR006', day: 'Tuesday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH012', classId: 'CLS003', subjectId: 'SUB007', facultyId: 'FAC011', classroomId: 'CR007', day: 'Tuesday', time: '10:00 AM - 11:00 AM' },
  { id: 'SCH013', classId: 'CLS001', subjectId: 'SUB003', facultyId: 'FAC012', classroomId: 'CR008', day: 'Tuesday', time: '11:00 AM - 12:00 PM' },
  { id: 'SCH014', classId: 'CLS008', subjectId: 'SUB013', facultyId: 'FAC013', classroomId: 'CR009', day: 'Tuesday', time: '01:00 PM - 02:00 PM' },
  { id: 'SCH015', classId: 'CLS006', subjectId: 'SUB012', facultyId: 'FAC014', classroomId: 'CR010', day: 'Tuesday', time: '02:00 PM - 03:00 PM' },
  { id: 'SCH016', classId: 'CLS004', subjectId: 'SUB008', facultyId: 'FAC015', classroomId: 'CR011', day: 'Tuesday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH017', classId: 'CLS002', subjectId: 'SUB004', facultyId: 'FAC016', classroomId: 'CR012', day: 'Tuesday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH018', classId: 'CLS010', subjectId: 'SUB019', facultyId: 'FAC017', classroomId: 'CR007', day: 'Tuesday', time: '01:00 PM - 02:00 PM' },
  
  { id: 'SCH019', classId: 'CLS007', subjectId: 'SUB013', facultyId: 'FAC018', classroomId: 'CR013', day: 'Wednesday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH020', classId: 'CLS005', subjectId: 'SUB012', facultyId: 'FAC019', classroomId: 'CR014', day: 'Wednesday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH021', classId: 'CLS003', subjectId: 'SUB008', facultyId: 'FAC020', classroomId: 'CR015', day: 'Wednesday', time: '10:00 AM - 11:00 AM' },
  { id: 'SCH023', classId: 'CLS008', subjectId: 'SUB014', facultyId: 'FAC002', classroomId: 'CR017', day: 'Wednesday', time: '01:00 PM - 02:00 PM' },
  { id: 'SCH024', classId: 'CLS006', subjectId: 'SUB009', facultyId: 'FAC003', classroomId: 'CR018', day: 'Wednesday', time: '02:00 PM - 03:00 PM' },
  { id: 'SCH025', classId: 'CLS004', subjectId: 'SUB005', facultyId: 'FAC004', classroomId: 'CR019', day: 'Wednesday', time: '07:30 AM - 08:30 AM' },
  { id: 'SCH026', classId: 'CLS002', subjectId: 'SUB001', facultyId: 'FAC005', classroomId: 'CR020', day: 'Wednesday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH027', classId: 'CLS011', subjectId: 'SUB020', facultyId: 'FAC019', classroomId: 'CR011', day: 'Wednesday', time: '10:00 AM - 11:00 AM' },

  { id: 'SCH030', classId: 'CLS003', subjectId: 'SUB006', facultyId: 'FAC008', classroomId: 'CR023', day: 'Thursday', time: '10:00 AM - 11:00 AM' },
  { id: 'SCH032', classId: 'CLS008', subjectId: 'SUB015', facultyId: 'FAC010', classroomId: 'CR001', day: 'Thursday', time: '01:00 PM - 02:00 PM' },
  { id: 'SCH035', classId: 'CLS002', subjectId: 'SUB003', facultyId: 'FAC013', classroomId: 'CR004', day: 'Thursday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH036', classId: 'CLS009', subjectId: 'SUB018', facultyId: 'FAC012', classroomId: 'CR006', day: 'Thursday', time: '11:00 AM - 12:00 PM' },

  { id: 'SCH038', classId: 'CLS005', subjectId: 'SUB009', facultyId: 'FAC015', classroomId: 'CR016', day: 'Friday', time: '08:30 AM - 09:30 AM' },
  { id: 'SCH040', classId: 'CLS001', subjectId: 'SUB001', facultyId: 'FAC017', classroomId: 'CR018', day: 'Friday', time: '11:00 AM - 12:00 PM' },
  { id: 'SCH042', classId: 'CLS006', subjectId: 'SUB010', facultyId: 'FAC019', classroomId: 'CR021', day: 'Friday', time: '02:00 PM - 03:00 PM' },
  { id: 'SCH043', classId: 'CLS004', subjectId: 'SUB006', facultyId: 'FAC020', classroomId: 'CR022', day: 'Friday', time: '07:30 AM - 08:30 AM' },
];


export const leaveRequests: LeaveRequest[] = [
  { id: 'LR001', requesterId: 'FAC002', requesterName: 'Dr. Ada Lovelace', requesterRole: 'faculty', startDate: '2024-08-01', endDate: '2024-08-05', reason: 'Family wedding.', status: 'pending' },
  { id: 'LR002', requesterId: 'FAC003', requesterName: 'Dr. Grace Hopper', requesterRole: 'faculty', startDate: '2024-08-10', endDate: '2024-08-12', reason: 'Attending a conference.', status: 'pending' },
  { id: 'LR003', requesterId: 'FAC001', requesterName: 'Dr. Alan Turing', requesterRole: 'faculty', startDate: '2024-07-20', endDate: '2024-07-21', reason: 'Personal reasons.', status: 'approved' },
  { id: 'LR004', requesterId: 'STU001', requesterName: 'Alice Johnson', requesterRole: 'student', startDate: '2024-08-02', endDate: '2024-08-03', reason: 'Medical appointment.', status: 'pending' },
];

export const scheduleChangeRequests: ScheduleChangeRequest[] = [
    { id: 'SCR001', scheduleId: 'SCH001', facultyId: 'FAC001', reason: 'Need to swap this class with my afternoon slot.', status: 'pending' },
    { id: 'SCR002', scheduleId: 'SCH003', facultyId: 'FAC003', reason: 'Lab equipment is unavailable.', status: 'pending' },
    { id: 'SCR003', scheduleId: 'SCH012', facultyId: 'FAC011', reason: 'Requesting to move to Room 102.', status: 'pending', requestedClassroomId: 'CR002' },
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
    { id: 'HOS004', name: 'Sirius Residence', blocks: 'A,B' },
    { id: 'HOS005', name: 'Nova Tower', blocks: 'A,B,C' },
    { id: 'HOS006', name: 'Galaxy Apartments', blocks: 'A' },
    { id: 'HOS007', name: 'Cosmos Quarters', blocks: 'A,B' },
    { id: 'HOS008', name: 'Apollo Building', blocks: 'A' },
    { id: 'HOS009', name: 'Pegasus Place', blocks: 'A,B' },
    { id: 'HOS010', name: 'Andromeda Complex', blocks: 'A,B,C' },
];

export const rooms: Room[] = [];

let roomCounter = 1;
hostels.forEach(hostel => {
    const blocks = hostel.blocks.split(',');
    blocks.forEach(block => {
        for (let i = 1; i <= 10; i++) { // 10 rooms per block
            const room: Room = {
                id: `ROOM${roomCounter.toString().padStart(3, '0')}`,
                hostelId: hostel.id,
                roomNumber: `${block}${i.toString().padStart(2, '0')}`,
                block: block,
                studentId: null,
            };
            rooms.push(room);
            roomCounter++;
        }
    });
});

// Allocate students to rooms
students.forEach((student, index) => {
    if (index < rooms.length) {
        rooms[index].studentId = student.id;
    }
});

    
