
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import { invokeEdgeFunction, setAuthToken } from './supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (nick: string, pass: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check local storage on mount
    const storedUser = localStorage.getItem('erp_user');
    const storedToken = localStorage.getItem('erp_token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      setAuthToken(storedToken); // Initialize Supabase client with token
    }
    setIsLoading(false);
  }, []);

  const login = async (nick: string, pass: string) => {
    setIsLoading(true);
    try {
      // Call the Edge Function 'auth-login'
      const response = await invokeEdgeFunction<AuthResponse>('auth-login', { nick, password: pass });
      
      setUser(response.user);
      setToken(response.token);
      setAuthToken(response.token); // Set Supabase client token
      
      localStorage.setItem('erp_user', JSON.stringify(response.user));
      localStorage.setItem('erp_token', response.token);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setAuthToken(null); // Clear Supabase client token
    localStorage.removeItem('erp_user');
    localStorage.removeItem('erp_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
