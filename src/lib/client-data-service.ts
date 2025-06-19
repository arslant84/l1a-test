
// This file runs on the client-side.
import { getDb, convertSqljsResponse, parseEmployee, parseTrainingRequest, saveDatabaseChanges } from './sqljs-db';
import type { Employee, TrainingRequest, ApprovalAction, TrainingRequestStatus, CurrentApprovalStep, ApprovalStepRole } from '@/lib/types';

// sql.js uses `?` or named placeholders like `$name` or `:name`
// We'll use `?` for simplicity

export async function loginUserAction(email: string, role: Employee['role']): Promise<Employee | null> {
  const db = await getDb();
  const stmt = db.prepare('SELECT * FROM employees WHERE lower(email) = lower(?) AND role = ?');
  stmt.bind([email, role]);
  const results: Employee[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as Employee);
  }
  stmt.free();
  
  if (results.length > 0) {
    return parseEmployee(results[0]);
  }
  return null;
}

export async function fetchAllUsersAction(): Promise<Employee[]> {
  const db = await getDb();
  // For sql.js, db.exec returns an array of result objects.
  // Each result object has 'columns' (array of column names) and 'values' (array of arrays of row values).
  const res = db.exec('SELECT * FROM employees');
  const dbUsers = convertSqljsResponse<any>(res);
  return dbUsers.map(parseEmployee);
}

export async function fetchAllTrainingRequestsAction(): Promise<TrainingRequest[]> {
  const db = await getDb();
  const res = db.exec('SELECT * FROM training_requests ORDER BY submittedDate DESC');
  const dbRequests = convertSqljsResponse<any>(res);
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
    db.run(
      'INSERT INTO training_requests (id, employeeId, employeeName, trainingTitle, justification, organiser, venue, startDate, endDate, cost, mode, programType, previousRelevantTraining, supportingDocuments, status, currentApprovalStep, approvalChain, submittedDate, lastUpdated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
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
        'supervisor', // Default first step
        JSON.stringify([]), // Empty approval chain initially
        submittedDate,
        submittedDate
      ]
    );
    await saveDatabaseChanges(); // Persist changes if implemented
    return true;
  } catch (error) {
    console.error("Failed to add training request (sql.js):", error);
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
  
  const stmt = db.prepare('SELECT * FROM training_requests WHERE id = ?');
  stmt.bind([requestId]);
  let currentRequestFromDb: any | null = null;
  if (stmt.step()) {
    currentRequestFromDb = stmt.getAsObject();
  }
  stmt.free();

  if (!currentRequestFromDb) return false;

  const parsedCurrentRequest = parseTrainingRequest(currentRequestFromDb);

  if (parsedCurrentRequest.currentApprovalStep === 'completed' || currentUser.role !== parsedCurrentRequest.currentApprovalStep) {
    return false; 
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
    db.run(
      'UPDATE training_requests SET status = ?, currentApprovalStep = ?, approvalChain = ?, lastUpdated = ? WHERE id = ?',
      [
        finalStatus,
        nextApprovalStep,
        JSON.stringify(updatedApprovalChain.map(ac => ({...ac, date: ac.date.toISOString()}))),
        new Date().toISOString(),
        requestId
      ]
    );
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error("Failed to update request status (sql.js):", error);
    return false;
  }
}

export async function updateUserProfileNameAction(userId: string, newName: string): Promise<boolean> {
  const db = await getDb();
  try {
    // sql.js db.run does not directly return changes count like node-sqlite.
    // We assume success if no error is thrown.
    db.run('UPDATE employees SET name = ? WHERE id = ?', [newName, userId]);
    await saveDatabaseChanges();
    // To verify changes, you might need to query or rely on error handling.
    // For simplicity, we'll assume it worked if no error.
    return true; 
  } catch (error) {
    console.error("Failed to update user name (sql.js):", error);
    return false;
  }
}

export async function updateUserAvatarAction(userId: string, avatarUrl: string): Promise<boolean> {
  const db = await getDb();
  try {
    db.run('UPDATE employees SET avatarUrl = ? WHERE id = ?', [avatarUrl, userId]);
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error("Failed to update user avatar (sql.js):", error);
    return false;
  }
}

export async function updateUserPasswordAction(userId: string): Promise<boolean> {
  const db = await getDb();
  try {
    db.run('UPDATE employees SET passwordLastChanged = ? WHERE id = ?', [new Date().toISOString(), userId]);
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error("Failed to update password last changed date (sql.js):", error);
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
  const dbValue = value ? 1 : 0; // SQLite uses 0/1 for booleans
  try {
    db.run(`UPDATE employees SET ${columnToUpdate} = ? WHERE id = ?`, [dbValue, userId]);
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error(`Failed to update ${preferenceType} notification preference for user ${userId} (sql.js):`, error);
    return false;
  }
}
