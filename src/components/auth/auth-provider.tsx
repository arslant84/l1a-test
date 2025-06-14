
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Employee, TrainingRequest, TrainingRequestStatus, ApprovalAction, CurrentApprovalStep, ApprovalStepRole, ProgramType, TrainingRequestLocationMode } from '@/lib/types';
import { mockEmployees, mockTrainingRequests as initialMockTrainingRequests } from '@/lib/mock-data';

interface AuthContextType {
  currentUser: Employee | null;
  isLoading: boolean;
  login: (email: string, role: Employee['role']) => Promise<boolean>;
  logout: () => void;
  trainingRequests: TrainingRequest[];
  addTrainingRequest: (request: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>) => Promise<boolean>;
  updateRequestStatus: (requestId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
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
          approvalChain: req.approvalChain ? req.approvalChain.map(action => ({...action, date: new Date(action.date)})) : [],
        })));
      } else {
        setTrainingRequests(initialMockTrainingRequests);
      }
    } catch (error) {
      console.error("Failed to load from local storage", error);
      if (trainingRequests.length === 0) {
        setTrainingRequests(initialMockTrainingRequests.map(req => ({
          ...req,
          approvalChain: req.approvalChain ? req.approvalChain.map(action => ({...action, date: new Date(action.date)})) : [],
        })));
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

  const login = useCallback(async (email: string, role: Employee['role']): Promise<boolean> => {
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

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>): Promise<boolean> => {
    if (!currentUser) return false;
    const newRequest: TrainingRequest = {
      ...requestData,
      id: `req${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      status: 'pending',
      currentApprovalStep: 'supervisor',
      approvalChain: [],
      submittedDate: new Date(),
      lastUpdated: new Date(),
    };
    setTrainingRequests(prevRequests => [newRequest, ...prevRequests]);
    return true;
  }, [currentUser]);

  const updateRequestStatus = useCallback(async (requestId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
    if (!currentUser) return false;

    setTrainingRequests(prevRequests =>
      prevRequests.map(req => {
        if (req.id === requestId && req.currentApprovalStep !== 'completed' && currentUser.role === req.currentApprovalStep) {
          const newAction: ApprovalAction = {
            stepRole: req.currentApprovalStep as ApprovalStepRole, 
            decision,
            userId: currentUser.id,
            userName: currentUser.name,
            notes,
            date: new Date(),
          };

          const updatedApprovalChain = [...req.approvalChain, newAction];
          let nextApprovalStep: CurrentApprovalStep = req.currentApprovalStep;
          let finalStatus: TrainingRequestStatus = req.status;

          if (decision === 'rejected') {
            finalStatus = 'rejected';
            nextApprovalStep = 'completed';
          } else { // Approved
            switch (req.currentApprovalStep) {
              case 'supervisor':
                nextApprovalStep = 'thr';
                break;
              case 'thr':
                // CEO approval if cost > 2000 OR mode is 'overseas'
                const requiresCeoApproval = req.cost > 2000 || req.mode === 'overseas';
                if (requiresCeoApproval) {
                  nextApprovalStep = 'ceo';
                } else {
                  finalStatus = 'approved';
                  nextApprovalStep = 'completed';
                }
                break;
              case 'ceo':
                finalStatus = 'approved';
                nextApprovalStep = 'completed';
                break;
            }
          }
          return { 
            ...req, 
            status: finalStatus,
            currentApprovalStep: nextApprovalStep,
            approvalChain: updatedApprovalChain,
            lastUpdated: new Date() 
          };
        }
        return req;
      })
    );
    return true;
  }, [currentUser]);
  

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, trainingRequests, addTrainingRequest, updateRequestStatus, users }}>
      {children}
    </AuthContext.Provider>
  );
};
