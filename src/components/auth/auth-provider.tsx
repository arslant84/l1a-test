
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Employee, TrainingRequest } from '@/lib/types';
import { 
  loginUserAction, 
  fetchAllUsersAction, 
  fetchAllTrainingRequestsAction, 
  addTrainingRequestAction, 
  updateRequestStatusAction,
  cancelTrainingRequestAction // Added cancel action
} from '@/lib/client-data-service';
import { getDb } from '@/lib/sqljs-db';

interface AuthContextType {
  currentUser: Employee | null;
  isLoading: boolean;
  login: (email: string, role: Employee['role']) => Promise<boolean>;
  logout: () => void;
  reloadCurrentUser: () => Promise<void>;
  trainingRequests: TrainingRequest[];
  addTrainingRequest: (request: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain' | 'cancelledByUserId' | 'cancelledDate' | 'cancellationReason'>) => Promise<boolean>;
  updateRequestStatus: (requestId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
  cancelTrainingRequest: (requestId: string, cancellationReason?: string) => Promise<boolean>; // Added cancelTrainingRequest
  users: Employee[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_USER_ID_KEY = 'l1a_sessionUserId'; 
const SESSION_USER_ROLE_KEY = 'l1a_sessionUserRole';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await getDb(); 
        setDbReady(true);
      } catch (error) {
        console.error("AuthProvider: Failed to initialize database", error);
        setIsLoading(false); 
      }
    };
    initDb();
  }, []);

  const loadInitialData = useCallback(async (loggedInUser: Employee | null) => {
    if (!dbReady) return; 
    setIsLoading(true);
    try {
      const fetchedUsers = await fetchAllUsersAction();
      setUsers(fetchedUsers); 

      const fetchedRequests = await fetchAllTrainingRequestsAction();
      setTrainingRequests(fetchedRequests);

      if (loggedInUser) {
        const freshUser = await loginUserAction(loggedInUser.email, loggedInUser.role);
        setCurrentUser(freshUser || null);
      } else {
        setCurrentUser(null);
      }

    } catch (error) {
      console.error("AuthProvider: Failed to load initial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [dbReady]);
  
  const reloadCurrentUser = useCallback(async () => {
    if (!currentUser || !dbReady) return;
    setIsLoading(true);
    try {
      const freshUser = await loginUserAction(currentUser.email, currentUser.role);
      setCurrentUser(freshUser); 
      
      const fetchedUsers = await fetchAllUsersAction();
      setUsers(fetchedUsers);
      const fetchedRequests = await fetchAllTrainingRequestsAction();
      setTrainingRequests(fetchedRequests);

    } catch (error) {
      console.error("AuthProvider: Failed to reload current user:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, dbReady]);
  
  useEffect(() => {
    if (!dbReady) return;

    const attemptReAuthenticationAndLoad = async () => {
      setIsLoading(true);
      let sessionUser: Employee | null = null;
      try {
        const storedUserId = localStorage.getItem(SESSION_USER_ID_KEY);
        const storedUserRole = localStorage.getItem(SESSION_USER_ROLE_KEY) as Employee['role'] | null;
        
        if (storedUserId && storedUserRole) {
           const allDbUsers = await fetchAllUsersAction();
           const potentialUser = allDbUsers.find(u => u.id === storedUserId && u.role === storedUserRole);
           if (potentialUser) {
              sessionUser = await loginUserAction(potentialUser.email, potentialUser.role);
              if (sessionUser) {
                 setCurrentUser(sessionUser);
              }
           }
        }
      } catch (e) {
        console.error("AuthProvider: Error during re-authentication:", e);
      } finally {
        await loadInitialData(sessionUser); 
      }
    };
    attemptReAuthenticationAndLoad();
  }, [dbReady, loadInitialData]);


  const login = useCallback(async (email: string, role: Employee['role']): Promise<boolean> => {
    if (!dbReady) {
      console.error("Login attempt before DB is ready.");
      return false;
    }
    setIsLoading(true);
    try {
      const user = await loginUserAction(email, role);
      if (user) {
        setCurrentUser(user);
        localStorage.setItem(SESSION_USER_ID_KEY, user.id); 
        localStorage.setItem(SESSION_USER_ROLE_KEY, user.role);
        await loadInitialData(user);
        return true;
      }
      setCurrentUser(null);
      localStorage.removeItem(SESSION_USER_ID_KEY);
      localStorage.removeItem(SESSION_USER_ROLE_KEY);
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dbReady, loadInitialData]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_USER_ID_KEY);
    localStorage.removeItem(SESSION_USER_ROLE_KEY);
    setUsers([]);
    setTrainingRequests([]);
  }, []);

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain' | 'cancelledByUserId' | 'cancelledDate' | 'cancellationReason'>): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    try {
      const success = await addTrainingRequestAction(requestData, currentUser);
      if (success) {
        await loadInitialData(currentUser); 
      }
      return success;
    } catch (error) {
      console.error("Failed to add training request:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData]);

  const updateRequestStatus = useCallback(async (requestId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    try {
      const success = await updateRequestStatusAction(requestId, decision, notes, currentUser);
      if (success) {
        await loadInitialData(currentUser);
      }
      return success;
    } catch (error)
    {
      console.error("Failed to update request status:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData]);

  const cancelTrainingRequest = useCallback(async (requestId: string, cancellationReason?: string): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    try {
      const success = await cancelTrainingRequestAction(requestId, currentUser.id, cancellationReason);
      if (success) {
        await loadInitialData(currentUser);
      }
      return success;
    } catch (error) {
      console.error("Failed to cancel training request:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData]);
  

  return (
    <AuthContext.Provider value={{ currentUser, isLoading: isLoading || !dbReady, login, logout, reloadCurrentUser, trainingRequests, addTrainingRequest, updateRequestStatus, cancelTrainingRequest, users }}>
      {children}
    </AuthContext.Provider>
  );
};
