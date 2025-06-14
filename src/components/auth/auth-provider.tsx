
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
import { parseTrainingRequest, parseEmployee } from '@/lib/db'; // Import parsers

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
      setUsers(fetchedUsers.map(parseEmployee)); // Ensure users are parsed

      const fetchedRequests = await fetchAllTrainingRequestsAction();
      setTrainingRequests(fetchedRequests.map(parseTrainingRequest)); // Ensure requests are parsed

      if (loggedInUser) {
         // Re-fetch current user from DB to ensure data consistency, especially after potential DB updates
        const freshUser = fetchedUsers.find(u => u.id === loggedInUser.id);
        setCurrentUser(freshUser || null);
      }

    } catch (error) {
      console.error("Failed to load initial data:", error);
      // Potentially set an error state here to show to the user
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Effect to load data on initial mount and try to re-authenticate
  useEffect(() => {
    const attemptReAuthenticationAndLoad = async () => {
      setIsLoading(true);
      let sessionUser: Employee | null = null;
      try {
        const storedUserId = localStorage.getItem(SESSION_USER_ID_KEY);
        const storedUserRole = localStorage.getItem(SESSION_USER_ROLE_KEY) as Employee['role'] | null;
        
        if (storedUserId && storedUserRole) {
           // Instead of full user object, find from all users fetched, then get by email and role.
           // This is a simplified re-auth. A real app would use tokens/sessions.
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
        await loadInitialData(sessionUser); // Load data regardless of re-auth success for now
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
        localStorage.setItem(SESSION_USER_ID_KEY, user.id); // Store ID for re-auth
        localStorage.setItem(SESSION_USER_ROLE_KEY, user.role); // Store role for re-auth
        await loadInitialData(user); // Reload all data after login
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
    // Optionally clear users and requests or let them be refetched on next login
    setUsers([]);
    setTrainingRequests([]);
    // No need to redirect here, layout will handle it.
  }, []);

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>): Promise<boolean> => {
    if (!currentUser) return false;
    setIsLoading(true);
    try {
      const success = await addTrainingRequestAction(requestData, currentUser);
      if (success) {
        await loadInitialData(currentUser); // Reload data to get the new request
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
        await loadInitialData(currentUser); // Reload data to reflect changes
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
    <AuthContext.Provider value={{ currentUser, isLoading, login, logout, trainingRequests, addTrainingRequest, updateRequestStatus, users }}>
      {children}
    </AuthContext.Provider>
  );
};
