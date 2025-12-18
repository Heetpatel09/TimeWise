
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, Admin } from '@/lib/types';
import { login as loginService } from '@/lib/services/auth';

interface AuthContextType {
  user: (User & Partial<Admin>) | null; // Allow user to have Admin properties
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<(User & Partial<Admin>) | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    } finally {
        setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const loggedInUser = await loginService(email, password);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };
  
  const handleSetUser = (updatedUser: User) => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const newUser = { ...currentUser, ...updatedUser };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser: handleSetUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
