

"use client";
import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Employee, TrainingRequest, AppNotification } from '@/lib/types';
import { 
  loginUserAction, 
  fetchAllUsersAction, 
  fetchAllTrainingRequestsAction, 
  addTrainingRequestAction, 
  updateRequestStatusAction,
  cancelTrainingRequestAction,
  markRequestAsProcessedByCMAction,
  updateTrainingRequestDetailsAction,
  fetchUserNotificationsAction,
  markAppNotificationAsReadAction,
  markAllAppNotificationsAsReadAction
} from '@/lib/client-data-service';
import { getDb } from '@/lib/sqljs-db';
import type { NewRequestFormValues } from '@/components/requests/new-request-form';

interface AuthContextType {
  currentUser: Employee | null;
  isLoading: boolean;
  login: (email: string, role: Employee['role']) => Promise<boolean>;
  logout: () => void;
  reloadCurrentUser: () => Promise<void>;
  trainingRequests: TrainingRequest[];
  addTrainingRequest: (request: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain' | 'cancelledByUserId' | 'cancelledDate' | 'cancellationReason'>) => Promise<string | false>;
  updateTrainingRequestDetails: (requestId: string, newData: NewRequestFormValues, originalRequest: TrainingRequest) => Promise<boolean>;
  updateRequestStatus: (requestId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<boolean>;
  cancelTrainingRequest: (requestId: string, cancellationReason?: string) => Promise<boolean>;
  markRequestAsProcessedByCM: (requestId: string, notes?: string) => Promise<boolean>;
  users: Employee[];
  // Notifications
  notifications: AppNotification[];
  unreadNotificationCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_USER_ID_KEY = 'l1a_sessionUserId'; 
const SESSION_USER_ROLE_KEY = 'l1a_sessionUserRole';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [trainingRequests, setTrainingRequests] = useState<TrainingRequest[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
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

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !dbReady) return;
    try {
      const userNotifications = await fetchUserNotificationsAction(currentUser.id);
      setNotifications(userNotifications);
      setUnreadNotificationCount(userNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("AuthProvider: Failed to fetch notifications:", error);
    }
  }, [currentUser, dbReady]);

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
        if (freshUser) { // If user re-authenticated, fetch their notifications
            const userNotifications = await fetchUserNotificationsAction(freshUser.id);
            setNotifications(userNotifications);
            setUnreadNotificationCount(userNotifications.filter(n => !n.isRead).length);
        }
      } else {
        setCurrentUser(null);
        setNotifications([]);
        setUnreadNotificationCount(0);
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
      await fetchNotifications(); // Also reload notifications

    } catch (error) {
      console.error("AuthProvider: Failed to reload current user:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, dbReady, fetchNotifications]);
  
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
        await loadInitialData(user); // This will also fetch notifications
        return true;
      }
      setCurrentUser(null);
      localStorage.removeItem(SESSION_USER_ID_KEY);
      localStorage.removeItem(SESSION_USER_ROLE_KEY);
      setNotifications([]);
      setUnreadNotificationCount(0);
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
    setNotifications([]);
    setUnreadNotificationCount(0);
  }, []);

  const addTrainingRequest = useCallback(async (requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain' | 'cancelledByUserId' | 'cancelledDate' | 'cancellationReason'>): Promise<string | false> => {
    if (!currentUser || !dbReady) return false;
    try {
      const newRequestId = await addTrainingRequestAction(requestData, currentUser);
      if (newRequestId) {
        await loadInitialData(currentUser); 
        await fetchNotifications(); // Refresh notifications as new ones might be generated
      }
      return newRequestId;
    } catch (error) {
      console.error("Failed to add training request:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData, fetchNotifications]);

  const updateTrainingRequestDetails = useCallback(async (requestId: string, newData: NewRequestFormValues, originalRequest: TrainingRequest): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    try {
      const success = await updateTrainingRequestDetailsAction(requestId, newData, originalRequest.supportingDocuments, currentUser.id);
      if (success) {
        await loadInitialData(currentUser);
        await fetchNotifications(); 
      }
      return success;
    } catch (error) {
      console.error("Failed to update training request details:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData, fetchNotifications]);


  const updateRequestStatus = useCallback(async (requestId: string, decision: 'approved' | 'rejected', notes?: string): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    try {
      const success = await updateRequestStatusAction(requestId, decision, notes, currentUser);
      if (success) {
        await loadInitialData(currentUser);
        await fetchNotifications();
      }
      return success;
    } catch (error)
    {
      console.error("Failed to update request status:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData, fetchNotifications]);

  const cancelTrainingRequest = useCallback(async (requestId: string, cancellationReason?: string): Promise<boolean> => {
    if (!currentUser || !dbReady) return false;
    try {
      const success = await cancelTrainingRequestAction(requestId, currentUser.id, cancellationReason);
      if (success) {
        await loadInitialData(currentUser);
        await fetchNotifications();
      }
      return success;
    } catch (error) {
      console.error("Failed to cancel training request:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData, fetchNotifications]);

  const markRequestAsProcessedByCM = useCallback(async (requestId: string, notes?: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'cm' || !dbReady) return false;
    try {
      const success = await markRequestAsProcessedByCMAction(requestId, notes, currentUser);
      if (success) {
        await loadInitialData(currentUser);
        await fetchNotifications();
      }
      return success;
    } catch (error) {
      console.error("Failed to mark request as processed by CM:", error);
      return false;
    }
  }, [currentUser, dbReady, loadInitialData, fetchNotifications]);
  
  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    if (!currentUser || !dbReady) return;
    const success = await markAppNotificationAsReadAction(notificationId, currentUser.id);
    if (success) {
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    }
  }, [currentUser, dbReady]);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!currentUser || !dbReady) return;
    const success = await markAllAppNotificationsAsReadAction(currentUser.id);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotificationCount(0);
    }
  }, [currentUser, dbReady]);

  const contextValue = useMemo(() => ({
    currentUser, 
    isLoading: isLoading || !dbReady, 
    login, 
    logout, 
    reloadCurrentUser, 
    trainingRequests, 
    addTrainingRequest,
    updateTrainingRequestDetails, 
    updateRequestStatus, 
    cancelTrainingRequest, 
    markRequestAsProcessedByCM,
    users,
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  }), [
    currentUser, isLoading, dbReady, login, logout, reloadCurrentUser, 
    trainingRequests, addTrainingRequest, updateTrainingRequestDetails, updateRequestStatus, 
    cancelTrainingRequest, markRequestAsProcessedByCM, users,
    notifications, unreadNotificationCount, fetchNotifications,
    markNotificationAsRead, markAllNotificationsAsRead
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

