
'use server';

import { getDb, parseEmployee, parseTrainingRequest } from '@/lib/db';
import type { Employee, TrainingRequest, ApprovalAction, TrainingRequestStatus, CurrentApprovalStep, ApprovalStepRole, ProgramType, TrainingRequestLocationMode } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function loginUserAction(email: string, role: Employee['role']): Promise<Employee | null> {
  const db = await getDb();
  const dbUser = await db.get('SELECT * FROM employees WHERE lower(email) = lower(?) AND role = ?', email, role);
  if (dbUser) {
    return parseEmployee(dbUser);
  }
  return null;
}

export async function fetchAllUsersAction(): Promise<Employee[]> {
  const db = await getDb();
  const dbUsers = await db.all('SELECT * FROM employees');
  return dbUsers.map(parseEmployee);
}

export async function fetchAllTrainingRequestsAction(): Promise<TrainingRequest[]> {
  const db = await getDb();
  const dbRequests = await db.all('SELECT * FROM training_requests ORDER BY submittedDate DESC');
  return dbRequests.map(parseTrainingRequest);
}

export async function addTrainingRequestAction(
  requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain'>,
  currentUser: Employee
): Promise<boolean> {
  if (!currentUser) return false;
  const db = await getDb();
  const newRequestId = `req${Date.now()}`;
  const submittedDate = new Date().toISOString();

  try {
    await db.run(
      'INSERT INTO training_requests (id, employeeId, employeeName, trainingTitle, justification, organiser, venue, startDate, endDate, cost, mode, programType, previousRelevantTraining, supportingDocuments, status, currentApprovalStep, approvalChain, submittedDate, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      newRequestId,
      currentUser.id,
      currentUser.name,
      requestData.trainingTitle,
      requestData.justification,
      requestData.organiser,
      requestData.venue,
      requestData.startDate.toISOString(),
      requestData.endDate.toISOString(),
      requestData.cost,
      requestData.mode,
      requestData.programType,
      requestData.previousRelevantTraining,
      JSON.stringify(requestData.supportingDocuments || []),
      'pending',
      'supervisor',
      JSON.stringify([]),
      submittedDate,
      submittedDate
    );
    revalidatePath('/dashboard');
    revalidatePath('/requests/review');
    return true;
  } catch (error) {
    console.error("Failed to add training request:", error);
    return false;
  }
}

export async function updateRequestStatusAction(
  requestId: string,
  decision: 'approved' | 'rejected',
  notes: string | undefined,
  currentUser: Employee
): Promise<boolean> {
  if (!currentUser) return false;
  const db = await getDb();
  
  const currentRequest = await db.get('SELECT * FROM training_requests WHERE id = ?', requestId);
  if (!currentRequest) return false;

  const parsedCurrentRequest = parseTrainingRequest(currentRequest);

  if (parsedCurrentRequest.currentApprovalStep === 'completed' || currentUser.role !== parsedCurrentRequest.currentApprovalStep) {
    return false; // Already completed or not the current user's turn
  }

  const newAction: ApprovalAction = {
    stepRole: parsedCurrentRequest.currentApprovalStep as ApprovalStepRole,
    decision,
    userId: currentUser.id,
    userName: currentUser.name,
    notes,
    date: new Date(), 
  };

  const updatedApprovalChain = [...parsedCurrentRequest.approvalChain, newAction];
  let nextApprovalStep: CurrentApprovalStep = parsedCurrentRequest.currentApprovalStep;
  let finalStatus: TrainingRequestStatus = parsedCurrentRequest.status;

  if (decision === 'rejected') {
    finalStatus = 'rejected';
    nextApprovalStep = 'completed';
  } else { // Approved
    switch (parsedCurrentRequest.currentApprovalStep) {
      case 'supervisor':
        nextApprovalStep = 'thr';
        break;
      case 'thr':
        const requiresCeoApproval = parsedCurrentRequest.cost > 2000 || parsedCurrentRequest.mode === 'overseas';
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

  try {
    await db.run(
      'UPDATE training_requests SET status = ?, currentApprovalStep = ?, approvalChain = ?, lastUpdated = ? WHERE id = ?',
      finalStatus,
      nextApprovalStep,
      JSON.stringify(updatedApprovalChain.map(ac => ({...ac, date: ac.date.toISOString()}))), // Serialize dates in approval chain
      new Date().toISOString(),
      requestId
    );
    revalidatePath('/dashboard');
    revalidatePath('/requests/review');
    return true;
  } catch (error) {
    console.error("Failed to update request status:", error);
    return false;
  }
}

export async function updateUserProfileNameAction(userId: string, newName: string): Promise<boolean> {
  const db = await getDb();
  try {
    const result = await db.run('UPDATE employees SET name = ? WHERE id = ?', newName, userId);
    if (result.changes && result.changes > 0) {
      revalidatePath('/settings');
      revalidatePath('/(authenticated)', 'layout'); 
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to update user name:", error);
    return false;
  }
}

export async function updateUserAvatarAction(userId: string, avatarUrl: string): Promise<boolean> {
  const db = await getDb();
  try {
    const result = await db.run('UPDATE employees SET avatarUrl = ? WHERE id = ?', avatarUrl, userId);
     if (result.changes && result.changes > 0) {
      revalidatePath('/settings');
      revalidatePath('/(authenticated)', 'layout');
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to update user avatar:", error);
    return false;
  }
}

export async function updateUserPasswordAction(userId: string): Promise<boolean> {
  // In a real app, this would involve hashing the new password, verifying the old one, etc.
  // For now, we'll just update the passwordLastChanged timestamp.
  const db = await getDb();
  try {
    const result = await db.run('UPDATE employees SET passwordLastChanged = ? WHERE id = ?', new Date().toISOString(), userId);
     if (result.changes && result.changes > 0) {
      revalidatePath('/settings');
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to update password last changed date:", error);
    return false;
  }
}

export async function updateUserNotificationPreferenceAction(
  userId: string,
  preferenceType: 'email' | 'inApp',
  value: boolean
): Promise<boolean> {
  const db = await getDb();
  const columnToUpdate = preferenceType === 'email' ? 'prefersEmailNotifications' : 'prefersInAppNotifications';
  const dbValue = value ? 1 : 0;
  try {
    const result = await db.run(`UPDATE employees SET ${columnToUpdate} = ? WHERE id = ?`, dbValue, userId);
    if (result.changes && result.changes > 0) {
      revalidatePath('/settings');
      revalidatePath('/(authenticated)', 'layout'); // Ensures broader UI updates if needed
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to update ${preferenceType} notification preference for user ${userId}:`, error);
    return false;
  }
}

