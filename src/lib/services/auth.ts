
import { students, faculty } from '@/lib/placeholder-data';
import type { User, Faculty, Student } from '@/lib/types';
import { updateFaculty as originalUpdateFaculty } from './faculty';
import { updateStudent as originalUpdateStudent } from './students';

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
        } else {
            users[oldEmail] = adminEntry;
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
        if (users[oldEmail] && oldEmail === newEmail) {
            return resolve();
        }
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

// --- Monkey Patching update functions to sync with auth store ---

// Store the original functions to avoid infinite loops
const _originalUpdateFaculty = originalUpdateFaculty;
const _originalUpdateStudent = originalUpdateStudent;

async function updateFaculty(facultyMember: Faculty) {
    const oldFaculty = (await getFaculty()).find(f => f.id === facultyMember.id);
    const oldEmail = oldFaculty?.email;

    // First, call the original function to update the main faculty data store
    const updatedFaculty = await _originalUpdateFaculty(facultyMember);

    // Then, sync changes with the auth store
    if (oldEmail && oldEmail !== updatedFaculty.email) {
        await authService.updateUserEmail(oldEmail, updatedFaculty.email);
    }
    
    // Ensure the details in the auth store are up-to-date
    if (users[updatedFaculty.email]) {
        users[updatedFaculty.email].details = updatedFaculty;
    }
    
    return updatedFaculty;
}

async function updateStudent(student: Student) {
    const oldStudent = (await getStudents()).find(s => s.id === student.id);
    const oldEmail = oldStudent?.email;

    // First, call the original function to update the main student data store
    const updatedStudent = await _originalUpdateStudent(student);

    // Then, sync changes with the auth store
    if (oldEmail && oldEmail !== updatedStudent.email) {
        await authService.updateUserEmail(oldEmail, updatedStudent.email);
    }

    // Ensure the details in the auth store are up-to-date
    if (users[updatedStudent.email]) {
        users[updatedStudent.email].details = updatedStudent;
    }

    return updatedStudent;
}


// We re-export the patched functions so other services use them.
// We also need to manually import and export the other functions from the original files.
export { updateFaculty, updateStudent };
export { getFaculty, addFaculty, deleteFaculty } from './faculty';
export { getStudents, addStudent, deleteStudent } from './students';
