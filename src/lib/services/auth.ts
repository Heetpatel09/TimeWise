
import { students, faculty } from '@/lib/placeholder-data';
import type { User, Faculty, Student } from '@/lib/types';
import { updateFaculty } from './faculty';
import { updateStudent } from './students';

// This is a mock authentication service.
// In a real application, this would involve API calls to a secure backend.

type UserStoreEntry = {
    id: string;
    password?: string;
    role: 'admin' | 'faculty' | 'student';
    details: any;
};

if (!(global as any).users) {
    const allUsers: Record<string, UserStoreEntry> = {};

    // Add admin
    allUsers['admin@codeblooded.app'] = {
        id: 'admin',
        password: 'admin123',
        role: 'admin',
        details: {
            id: 'admin',
            name: 'Admin User',
            email: 'admin@codeblooded.app',
            avatar: `https://avatar.vercel.sh/admin@codeblooded.app.png`,
        }
    };
    
    // Add faculty
    faculty.forEach(f => {
        allUsers[f.email] = { id: f.id, password: 'faculty123', role: 'faculty', details: f };
    });

    // Add students
    students.forEach(s => {
        allUsers[s.email] = { id: s.id, password: 'student123', role: 'student', details: s };
    });

    (global as any).users = allUsers;
}
let users: Record<string, UserStoreEntry> = (global as any).users;


export const authService = {
  login: (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userEntry = users[email];
        if (userEntry && userEntry.password === password) {
          const user: User = {
            id: userEntry.details.id,
            name: userEntry.details.name,
            email: userEntry.details.email,
            avatar: userEntry.details.avatar || `https://avatar.vercel.sh/${userEntry.details.email}.png`,
            role: userEntry.role,
          };
          resolve(user);
        } else {
          reject(new Error('Invalid email or password.'));
        }
      }, 500); // Simulate network delay
    });
  },

  updateAdmin: (updatedDetails: { id: string; name: string, email: string, avatar: string }): Promise<User> => {
    return new Promise((resolve, reject) => {
        const oldEmail = Object.keys(users).find(key => users[key].id === updatedDetails.id && users[key].role === 'admin');
        if (!oldEmail) return reject(new Error('Admin user not found'));

        const adminEntry = users[oldEmail];
        
        // Update details
        adminEntry.details.name = updatedDetails.name;
        adminEntry.details.avatar = updatedDetails.avatar;
        
        // If email has changed, we need to move the entry
        if (oldEmail !== updatedDetails.email) {
            adminEntry.details.email = updatedDetails.email;
            users[updatedDetails.email] = adminEntry;
            delete users[oldEmail];
        }

        const user: User = {
            id: 'admin',
            name: adminEntry.details.name,
            email: adminEntry.details.email,
            avatar: adminEntry.details.avatar,
            role: 'admin',
        };
        resolve(user);
    });
  },
  
  updatePassword: (email: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (users[email]) {
            users[email].password = newPassword;
            resolve();
        } else {
            reject(new Error('User not found.'));
        }
    });
  },
  
  updateUserEmail: (oldEmail: string, newEmail: string): Promise<void> => {
     return new Promise((resolve, reject) => {
        if (users[oldEmail] && !users[newEmail]) {
            const entry = users[oldEmail];
            entry.details.email = newEmail;
            users[newEmail] = entry;
            delete users[oldEmail];
            resolve();
        } else if (users[newEmail]) {
            reject(new Error('New email is already taken.'));
        } 
        else {
            reject(new Error('User not found.'));
        }
    });
  }
};

// Sync faculty changes with auth store
const originalUpdateFaculty = updateFaculty;
(global as any).updateFaculty = async (facultyMember: Faculty) => {
    const originalFaculty = (await originalUpdateFaculty(facultyMember));
    const oldEmail = Object.keys(users).find(key => users[key].id === facultyMember.id);
    if (oldEmail && oldEmail !== facultyMember.email) {
        await authService.updateUserEmail(oldEmail, facultyMember.email);
    }
     if (users[facultyMember.email]) {
        users[facultyMember.email].details = facultyMember;
    }
    return originalFaculty;
};

// Sync student changes with auth store
const originalUpdateStudent = updateStudent;
(global as any).updateStudent = async (student: Student) => {
    const originalStudent = await originalUpdateStudent(student);
     const oldEmail = Object.keys(users).find(key => users[key].id === student.id);
    if (oldEmail && oldEmail !== student.email) {
        await authService.updateUserEmail(oldEmail, student.email);
    }
    if (users[student.email]) {
        users[student.email].details = student;
    }
    return originalStudent;
};

// We need to re-export the patched functions for other services to use them
export { updateFaculty, updateStudent };
