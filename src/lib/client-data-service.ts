
// This file runs on the client-side.
import { getDb, convertSqljsResponse, parseEmployee, parseTrainingRequest, saveDatabaseChanges } from './sqljs-db';
import type { Employee, TrainingRequest, ApprovalAction, TrainingRequestStatus, CurrentApprovalStep, ApprovalStepRole } from '@/lib/types';
import type { NewRequestFormValues } from '@/components/requests/new-request-form'; // Assuming this type is exported

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
  requestData: Omit<TrainingRequest, 'id' | 'employeeId' | 'employeeName' | 'status' | 'submittedDate' | 'lastUpdated' | 'currentApprovalStep' | 'approvalChain' | 'cancelledByUserId' | 'cancelledDate' | 'cancellationReason'>,
  currentUser: Employee
): Promise<string | false> { // Returns new request ID or false
  if (!currentUser) return false;
  const db = await getDb();
  const newRequestId = 'req' + Date.now() + Math.random().toString(36).substring(2, 7);
  const submittedDate = new Date().toISOString();

  try {
    db.run(
      'INSERT INTO training_requests (id, employeeId, employeeName, trainingTitle, justification, organiser, venue, startDate, endDate, cost, mode, programType, previousRelevantTraining, supportingDocuments, status, currentApprovalStep, approvalChain, submittedDate, lastUpdated, costCenter, estimatedLogisticCost, departmentApprovedBudget, departmentBudgetBalance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
        requestData.previousRelevantTraining || null,
        JSON.stringify(requestData.supportingDocuments || []),
        'pending',
        'supervisor', 
        JSON.stringify([]), 
        submittedDate,
        submittedDate,
        requestData.costCenter || null,
        requestData.estimatedLogisticCost !== undefined ? requestData.estimatedLogisticCost : null,
        requestData.departmentApprovedBudget !== undefined ? requestData.departmentApprovedBudget : null,
        requestData.departmentBudgetBalance !== undefined ? requestData.departmentBudgetBalance : null,
      ]
    );
    await saveDatabaseChanges(); 
    return newRequestId;
  } catch (error) {
    console.error("Failed to add training request (sql.js):", error);
    return false;
  }
}

export async function updateTrainingRequestDetailsAction(
  requestId: string,
  newData: NewRequestFormValues,
  originalSupportingDocs: { name: string; url?: string }[] | undefined,
  // updatedByUserId: string // Not directly used in SQL, lastUpdated implies this
): Promise<boolean> {
  const db = await getDb();
  
  let newDocumentNames: { name: string; url?: string }[];
  if (newData.supportingDocuments && newData.supportingDocuments.length > 0) {
    newDocumentNames = Array.from(newData.supportingDocuments).map(file => ({ name: file.name }));
  } else {
    newDocumentNames = originalSupportingDocs || [];
  }

  try {
    db.run(
      `UPDATE training_requests SET 
        trainingTitle = ?, justification = ?, organiser = ?, venue = ?, 
        startDate = ?, endDate = ?, cost = ?, mode = ?, programType = ?, 
        previousRelevantTraining = ?, supportingDocuments = ?, 
        costCenter = ?, estimatedLogisticCost = ?, departmentApprovedBudget = ?, departmentBudgetBalance = ?,
        lastUpdated = ? 
      WHERE id = ?`,
      [
        newData.trainingTitle, newData.justification, newData.organiser, newData.venue,
        newData.startDate.toISOString(), newData.endDate.toISOString(), newData.cost, newData.mode, newData.programType,
        newData.previousRelevantTraining || null, JSON.stringify(newDocumentNames),
        newData.costCenter || null,
        newData.estimatedLogisticCost !== undefined ? newData.estimatedLogisticCost : null,
        newData.departmentApprovedBudget !== undefined ? newData.departmentApprovedBudget : null,
        newData.departmentBudgetBalance !== undefined ? newData.departmentBudgetBalance : null,
        new Date().toISOString(),
        requestId
      ]
    );
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error("Failed to update training request details (sql.js):", error);
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

  if (parsedCurrentRequest.status !== 'pending' || parsedCurrentRequest.currentApprovalStep === 'completed' || currentUser.role !== parsedCurrentRequest.currentApprovalStep) {
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
  } else { 
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
          nextApprovalStep = 'cm'; 
        }
        break;
      case 'ceo':
        finalStatus = 'approved';
        nextApprovalStep = 'cm'; 
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

export async function markRequestAsProcessedByCMAction(
  requestId: string,
  notes: string | undefined,
  currentUser: Employee
): Promise<boolean> {
  if (!currentUser || currentUser.role !== 'cm') return false;
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

  if (parsedCurrentRequest.status !== 'approved' || parsedCurrentRequest.currentApprovalStep !== 'cm') {
    console.error("CM Processing Error: Request not in correct state for CM action.", parsedCurrentRequest);
    return false;
  }

  const newAction: ApprovalAction = {
    stepRole: 'cm',
    decision: 'processed',
    userId: currentUser.id,
    userName: currentUser.name,
    notes,
    date: new Date(),
  };
  const updatedApprovalChain = [...parsedCurrentRequest.approvalChain, newAction];

  try {
    db.run(
      'UPDATE training_requests SET currentApprovalStep = ?, approvalChain = ?, lastUpdated = ? WHERE id = ?',
      [
        'completed', 
        JSON.stringify(updatedApprovalChain.map(ac => ({...ac, date: ac.date.toISOString()}))),
        new Date().toISOString(),
        requestId
      ]
    );
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error("Failed to mark request as processed by CM (sql.js):", error);
    return false;
  }
}


export async function cancelTrainingRequestAction(
  requestId: string,
  cancellingUserId: string,
  cancellationReason?: string
): Promise<boolean> {
  const db = await getDb();
  const cancelledDate = new Date().toISOString();
  try {
    db.run(
      'UPDATE training_requests SET status = ?, currentApprovalStep = ?, cancelledByUserId = ?, cancelledDate = ?, cancellationReason = ?, lastUpdated = ? WHERE id = ?',
      [
        'cancelled',
        'completed', // Mark as completed as it's a final state.
        cancellingUserId,
        cancelledDate,
        cancellationReason || null,
        cancelledDate, // lastUpdated is also cancellation date
        requestId
      ]
    );
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error("Failed to cancel training request (sql.js):", error);
    return false;
  }
}

export async function updateUserProfileNameAction(userId: string, newName: string): Promise<boolean> {
  const db = await getDb();
  try {
    db.run('UPDATE employees SET name = ? WHERE id = ?', [newName, userId]);
    await saveDatabaseChanges();
    return true; 
  } catch (error) {
    console.error("Failed to update user name (sql.js):", error);
    return false;
  }
}

export async function updateUserAvatarAction(userId: string, avatarUrl: string): Promise<boolean> {
  const db = await getDb();
  console.log(`[CDA] Attempting to update avatar for user ${userId} to ${avatarUrl}`);
  try {
    const stmt = db.prepare('UPDATE employees SET avatarUrl = ? WHERE id = ?');
    stmt.run([avatarUrl, userId]);
    const changes = db.getRowsModified();
    stmt.free();
    console.log(`[CDA] Rows modified by avatar update SQL: ${changes}`);
    
    if (changes > 0) {
      await saveDatabaseChanges();
      console.log(`[CDA] Avatar for user ${userId} updated and DB save attempt initiated.`);
      return true;
    }
    console.warn(`[CDA] No rows modified by avatar update for user ${userId}. URL not saved to DB.`);
    return false;
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
  const dbValue = value ? 1 : 0; 
  try {
    db.run('UPDATE employees SET ' + columnToUpdate + ' = ? WHERE id = ?', [dbValue, userId]);
    await saveDatabaseChanges();
    return true;
  } catch (error) {
    console.error('Failed to update ' + preferenceType + ' notification preference for user ' + userId + ' (sql.js):', error);
    return false;
  }
}
