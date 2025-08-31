
import { students, faculty } from '@/lib/placeholder-data';
import type { User } from '@/lib/types';

// This is a mock authentication service.
// In a real application, this would involve API calls to a secure backend.

const users: Record<string, { password: string, role: 'admin' | 'faculty' | 'student', details: any }> = {
    'admin': {
        password: 'admin123',
        role: 'admin',
        details: {
            id: 'admin',
            name: 'Admin User',
            email: 'admin@codeblooded.app',
            avatar: 'https://avatar.vercel.sh/admin.png',
        }
    },
    ...Object.fromEntries(faculty.map(f => [f.id, { password: 'faculty123', role: 'faculty', details: f }])),
    ...Object.fromEntries(students.map(s => [s.id, { password: 'student123', role: 'student', details: s }])),
};

export const authService = {
  login: (userId: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const userEntry = users[userId];
        if (userEntry && userEntry.password === password) {
          const user: User = {
            id: userEntry.details.id,
            name: userEntry.details.name,
            email: userEntry.details.email,
            avatar: `https://avatar.vercel.sh/${userEntry.details.email}.png`,
            role: userEntry.role,
          };
          resolve(user);
        } else {
          reject(new Error('Invalid user ID or password.'));
        }
      }, 500); // Simulate network delay
    });
  }
};
