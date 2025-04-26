
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name?: string;
  credits: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateCredits: (newAmount: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock authentication for now - would be replaced with real auth
  useEffect(() => {
    const storedUser = localStorage.getItem('maimai_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock login - would be replaced with real auth
      if (password.length < 6) {
        throw new Error('Invalid credentials');
      }
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 800));
      
      // Mock user data
      const userData = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0],
        credits: 0, // New users start with 0 credits
      };
      
      setUser(userData);
      localStorage.setItem('maimai_user', JSON.stringify(userData));
      toast.success('Successfully logged in!');
    } catch (error) {
      toast.error('Login failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      // Mock registration - would be replaced with real auth
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Simulate network delay
      await new Promise(r => setTimeout(r, 800));
      
      // Mock user data with 5 free credits for new users
      const userData = {
        id: `user_${Date.now()}`,
        email,
        name,
        credits: 5, // New users start with 5 free credits
      };
      
      setUser(userData);
      localStorage.setItem('maimai_user', JSON.stringify(userData));
      toast.success('Registration successful! You received 5 free credits.');
    } catch (error) {
      toast.error('Registration failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('maimai_user');
    toast.info('You have been logged out');
  };

  const updateCredits = (newAmount: number) => {
    if (!user) return;
    const updatedUser = { ...user, credits: newAmount };
    setUser(updatedUser);
    localStorage.setItem('maimai_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateCredits }}>
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
