
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Employee, TrainingRequest, ProgramType, TrainingRequestLocationMode, ApprovalStepRole } from '@/lib/types';
import { 
  loginUserAction, 
  fetchAllUsersAction, 
  fetchAllTrainingRequestsAction, 
  addTrainingRequestAction, 
  updateRequestStatusAction 
} from '@/actions/dataActions';


interface AuthContextType {
  currentUser: Employee | null;
  isLoading: boolean;
  login: (email: string, role: Employee['role']) => Promise<boolean>;
  logout: () => void;
  reloadCurrentUser: () => Promise<void>; // Added to refresh user data
  trainingRequests: TrainingRequest[];
  addTrainingRequest: (request: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>) => Promise<boolean>;
  updateRequestStatus: (requestId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
  users: Employee[];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Key for storing minimal user info (e.g., ID) to re-authenticate on refresh
const SESSION_USER_ID_KEY = 'l1a_sessionUserId'; 
const SESSION_USER_ROLE_KEY = 'l1a_sessionUserRole';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);

  const loadInitialData = useCallback(async (loggedInUser: Employee | null) => {
    setIsLoading(true);
    try {
      const fetchedUsers = await fetchAllUsersAction();
      setUsers(fetchedUsers); 

      const fetchedRequests = await fetchAllTrainingRequestsAction();
      setTrainingRequests(fetchedRequests);

      if (loggedInUser) {
        const freshUser = fetchedUsers.find(u => u.id === loggedInUser.id);
        setCurrentUser(freshUser || null);
      }

    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reloadCurrentUser = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      // Re-fetch the current user's data from the backend
      const freshUser = await loginUserAction(currentUser.email, currentUser.role);
      if (freshUser) {
        setCurrentUser(freshUser);
        // Optionally, re-fetch all users and requests if other parts of their data might have changed system-wide
        // For settings changes that only affect the current user, just updating currentUser might be enough.
        // However, to ensure consistency, especially if the user's name changed (which appears in requests),
        // reloading all data is safer.
        await loadInitialData(freshUser);
      }
    } catch (error) {
      console.error("Failed to reload current user:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadInitialData]);
  
  // Effect to load data on initial mount and try to re-authenticate
  useEffect(() => {
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
        console.error("Error during re-authentication:", e);
      } finally {
        await loadInitialData(sessionUser); 
        setIsLoading(false);
      }
    };
    attemptReAuthenticationAndLoad();
  }, [loadInitialData]);


  const login = useCallback(async (email: string, role: Employee['role']): Promise<boolean> => {
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
  }, [loadInitialData]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_USER_ID_KEY);
    localStorage.removeItem(SESSION_USER_ROLE_KEY);
    setUsers([]);
    setTrainingRequests([]);
  }, []);

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>): Promise<boolean> => {
    if (!currentUser) return false;
    setIsLoading(true);
    try {
      const success = await addTrainingRequestAction(requestData, currentUser);
      if (success) {
        await loadInitialData(currentUser); 
      }
      return success;
    } catch (error) {
      console.error("Failed to add training request:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadInitialData]);

  const updateRequestStatus = useCallback(async (requestId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
    if (!currentUser) return false;
    setIsLoading(true);
    try {
      const success = await updateRequestStatusAction(requestId, decision, notes, currentUser);
      if (success) {
        await loadInitialData(currentUser); 
      }
      return success;
    } catch (error) {
      console.error("Failed to update request status:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, loadInitialData]);
  

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, reloadCurrentUser, trainingRequests, addTrainingRequest, updateRequestStatus, users }}>
      {children}
    </AuthContext.Provider>
  );
};
