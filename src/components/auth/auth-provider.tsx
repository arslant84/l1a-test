
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Employee, TrainingRequest, TrainingRequestStatus } from '@/lib/types';
import { mockEmployees, mockTrainingRequests as initialMockTrainingRequests } from '@/lib/mock-data';

interface AuthContextType {
  currentUser: Employee | null;
  isLoading: boolean;
  login: (email: string, role: 'employee' | 'supervisor') => Promise<boolean>;
  logout: () => void;
  trainingRequests: TrainingRequest[];
  addTrainingRequest: (request: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated'>) => Promise<boolean>;
  updateRequestStatus: (requestId: string, status: TrainingRequestStatus, supervisorNotes?: string) => Promise<boolean>;
  users: Employee[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY_USER = 'l1a_currentUser';
const LOCAL_STORAGE_KEY_REQUESTS = 'l1a_trainingRequests';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [users, setUsers] = useState<Employee[]>(mockEmployees);


  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(LOCAL_STORAGE_KEY_USER);
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser({
          ...parsedUser,
          dateJoined: parsedUser.dateJoined ? new Date(parsedUser.dateJoined) : undefined,
        });
      }
      const storedRequests = localStorage.getItem(LOCAL_STORAGE_KEY_REQUESTS);
      if (storedRequests) {
        setTrainingRequests(JSON.parse(storedRequests).map((req: TrainingRequest) => ({
          ...req,
          startDate: new Date(req.startDate),
          endDate: new Date(req.endDate),
          submittedDate: new Date(req.submittedDate),
          lastUpdated: new Date(req.lastUpdated),
        })));
      } else {
        setTrainingRequests(initialMockTrainingRequests);
      }
    } catch (error) {
      console.error("Failed to load from local storage", error);
      if (trainingRequests.length === 0) {
        setTrainingRequests(initialMockTrainingRequests);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      try {
        if (currentUser) {
          localStorage.setItem(LOCAL_STORAGE_KEY_USER, JSON.stringify(currentUser));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY_REQUESTS, JSON.stringify(trainingRequests));
      } catch (error) {
        console.error("Failed to save to local storage", error);
      }
    }
  }, [currentUser, trainingRequests, isLoading]);

  const login = useCallback(async (email: string, role: 'employee' | 'supervisor'): Promise<boolean> => {
    const user = mockEmployees.find(emp => emp.email.toLowerCase() === email.toLowerCase() && emp.role === role);
    if (user) {
      setCurrentUser({
        ...user,
        dateJoined: user.dateJoined ? new Date(user.dateJoined) : undefined,
      });
      setIsLoading(false); 
      return true;
    }
    setIsLoading(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(LOCAL_STORAGE_KEY_USER);
  }, []);

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated'>): Promise<boolean> => {
    if (!currentUser) return false;
    const newRequest: TrainingRequest = {
      ...requestData,
      id: `req${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      status: 'pending',
      submittedDate: new Date(),
      lastUpdated: new Date(),
    };
    setTrainingRequests(prevRequests => [newRequest, ...prevRequests]);
    return true;
  }, [currentUser]);

  const updateRequestStatus = useCallback(async (requestId: string, status: TrainingRequestStatus, supervisorNotes?: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'supervisor') return false;
    
    setTrainingRequests(prevRequests =>
      prevRequests.map(req =>
        req.id === requestId
          ? { ...req, status, supervisorNotes: supervisorNotes || req.supervisorNotes, lastUpdated: new Date() }
          : req
      )
    );
    return true;
  }, [currentUser]);
  

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, trainingRequests, addTrainingRequest, updateRequestStatus, users }}>
      {children}
    </AuthContext.Provider>
  );
};
