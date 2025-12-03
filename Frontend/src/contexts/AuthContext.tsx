import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  name: string;
  email: string;
  role: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  login: (user: User) => void;
  logout: () => void;
  register: (user: User) => void;
  updateProfile: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const login = (user: User) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  const logout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };

  const register = (user: User) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, currentUser, login, logout, register, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
