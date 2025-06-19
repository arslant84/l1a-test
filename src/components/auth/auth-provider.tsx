
"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { Employee, TrainingRequest } from '@/lib/types';
import { 
  loginUserAction, 
  fetchAllUsersAction, 
  fetchAllTrainingRequestsAction, 
  addTrainingRequestAction, 
  updateRequestStatusAction 
} from '@/lib/client-data-service'; // UPDATED IMPORT
import { getDb } from '@/lib/sqljs-db'; // Import getDb to ensure DB is initialized

interface AuthContextType {
  currentUser: Employee | null;
  isLoading: boolean;
  login: (email: string, role: Employee['role']) => Promise<boolean>;
  logout: () => void;
  reloadCurrentUser: () => Promise<void>;
  trainingRequests: TrainingRequest[];
  addTrainingRequest: (request: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>) => Promise<boolean>;
  updateRequestStatus: (requestId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
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

  // Initialize DB first
  useEffect(() => {
    const initDb = async () => {
      try {
        await getDb(); // This will initialize sql.js and load vendors.db
        setDbReady(true);
      } catch (error) {
        console.error("AuthProvider: Failed to initialize database", error);
        setIsLoading(false); // Stop loading if DB fails critically
      }
    };
    initDb();
  }, []);

  const loadInitialData = useCallback(async (loggedInUser: Employee | null) => {
    if (!dbReady) return; // Don't load data if DB is not ready
    setIsLoading(true);
    try {
      const fetchedUsers = await fetchAllUsersAction();
      setUsers(fetchedUsers); 

      const fetchedRequests = await fetchAllTrainingRequestsAction();
      setTrainingRequests(fetchedRequests);

      if (loggedInUser) {
        // Re-fetch current user from the now client-side DB to ensure data consistency
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
      setCurrentUser(freshUser); // Update current user
      
      // Since data might have changed (e.g. user name in requests), reload all relevant data
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
    if (!dbReady) return; // Wait for DB to be ready

    const attemptReAuthenticationAndLoad = async () => {
      setIsLoading(true);
      let sessionUser: Employee | null = null;
      try {
        const storedUserId = localStorage.getItem(SESSION_USER_ID_KEY);
        const storedUserRole = localStorage.getItem(SESSION_USER_ROLE_KEY) as Employee['role'] | null;
        
        if (storedUserId && storedUserRole) {
           // We need to query all users to find the one matching stored ID and role,
           // because loginUserAction now needs email.
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
        // Load all data regardless of re-auth success, but pass the potentially re-authed user
        await loadInitialData(sessionUser); 
        // setIsLoading(false); // loadInitialData handles this
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
        // After successful login, all data is reloaded by loadInitialData called via useEffect or directly.
        // Forcing a fresh load ensures consistency.
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
    // Clear data, it will be reloaded on next login or page refresh if session persists
    setUsers([]);
    setTrainingRequests([]);
  }, []);

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    // No need for setIsLoading(true) here as individual actions should be quick client-side
    try {
      const success = await addTrainingRequestAction(requestData, currentUser);
      if (success) {
        // Reload data to reflect the new request
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
        // Reload data to reflect the status change
        await loadInitialData(currentUser);
      }
      return success;
    } catch (error)
    {
      console.error("Failed to update request status:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData]);
  

  return (
    <AuthContext.Provider value={{ currentUser, isLoading: isLoading || !dbReady, login, logout, reloadCurrentUser, trainingRequests, addTrainingRequest, updateRequestStatus, users }}>
      {children}
    </AuthContext.Provider>
  );
};
