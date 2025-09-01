
'use server';

import { db } from '@/lib/db';
import type { User, Faculty, Student } from '@/lib/types';
import { updateFaculty as originalUpdateFaculty } from './faculty';
import { updateStudent as originalUpdateStudent } from './students';

type UserStoreEntry = {
    id: string;
    password?: string;
    role: 'admin' | 'faculty' | 'student';
    email: string;
};

export const authService = {
  login: (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userEntry: UserStoreEntry | undefined = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

        if (userEntry && userEntry.password === password) {
            let details: any;
            if (userEntry.role === 'admin') {
                details = {
                    id: 'admin',
                    name: 'Admin User',
                    email: 'admin@codeblooded.app',
                    avatar: `https://avatar.vercel.sh/admin@codeblooded.app.png`,
                };
            } else if (userEntry.role === 'faculty') {
                details = db.prepare('SELECT * FROM faculty WHERE id = ?').get(userEntry.id);
            } else {
                details = db.prepare('SELECT * FROM students WHERE id = ?').get(userEntry.id);
            }

          const user: User = {
            id: details.id,
            name: details.name,
            email: details.email,
            avatar: details.avatar || `https://avatar.vercel.sh/${details.email}.png`,
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
        const oldEntry: UserStoreEntry | undefined = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(updatedDetails.id, 'admin') as any;
        if (!oldEntry) return reject(new Error('Admin user not found'));

        // If email has changed, we need to update the users table
        if (oldEntry.email !== updatedDetails.email) {
            db.prepare('UPDATE users SET email = ? WHERE id = ? AND role = ?').run(updatedDetails.email, updatedDetails.id, 'admin');
        }

        const user: User = {
            id: 'admin',
            name: updatedDetails.name,
            email: updatedDetails.email,
            avatar: updatedDetails.avatar,
            role: 'admin',
        };
        resolve(user);
    });
  },
  
  updatePassword: (email: string, newPassword: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const result = db.prepare('UPDATE users SET password = ? WHERE email = ?').run(newPassword, email);
        if (result.changes > 0) {
            resolve();
        } else {
            reject(new Error('User not found when trying to update password.'));
        }
    });
  },
  
  updateUserEmail: (oldEmail: string, newEmail: string): Promise<void> => {
     return new Promise((resolve, reject) => {
        if (oldEmail === newEmail) return resolve();

        const newEmailExists: { count: number } | undefined = db.prepare('SELECT count(*) as count FROM users WHERE email = ?').get(newEmail) as any;
        if (newEmailExists && newEmailExists.count > 0) {
            return reject(new Error('New email is already taken.'));
        }
        
        const result = db.prepare('UPDATE users SET email = ? WHERE email = ?').run(newEmail, oldEmail);
        if (result.changes > 0) {
            resolve();
        } else {
            reject(new Error('User not found when trying to update email.'));
        }
    });
  },
  
  addUser: (user: {id: string, email: string, password?: string, role: 'faculty' | 'student'}): Promise<void> => {
    return new Promise((resolve, reject) => {
        const existingUser: { count: number } | undefined = db.prepare('SELECT count(*) as count FROM users WHERE email = ?').get(user.email) as any;
        if (existingUser && existingUser.count > 0) {
            return reject(new Error("User with this email already exists."));
        }
        db.prepare('INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)').run(user.id, user.email, user.password, user.role);
        resolve();
    });
  },
};

// --- Monkey Patching update functions to sync with auth store ---

const _originalUpdateFaculty = originalUpdateFaculty;
const _originalUpdateStudent = originalUpdateStudent;

async function updateFaculty(facultyMember: Faculty) {
    const allFaculty = await getFaculty();
    const oldFaculty = allFaculty.find(f => f.id === facultyMember.id);
    const oldEmail = oldFaculty?.email;

    const updatedFaculty = await _originalUpdateFaculty(facultyMember);

    if (oldEmail && oldEmail !== updatedFaculty.email) {
        await authService.updateUserEmail(oldEmail, updatedFaculty.email);
    }
    
    return updatedFaculty;
}

async function updateStudent(student: Student) {
    const allStudents = await getStudents();
    const oldStudent = allStudents.find(s => s.id === student.id);
    const oldEmail = oldStudent?.email;

    const updatedStudent = await _originalUpdateStudent(student);

    if (oldEmail && oldEmail !== updatedStudent.email) {
        await authService.updateUserEmail(oldEmail, updatedStudent.email);
    }

    return updatedStudent;
}


// We re-export the patched functions so other services use them.
// We also need to manually import and export the other functions from the original files.
export { updateFaculty, updateStudent };
export { getFaculty, addFaculty, deleteFaculty } from './faculty';
export { getStudents, addStudent, deleteStudent } from './students';
