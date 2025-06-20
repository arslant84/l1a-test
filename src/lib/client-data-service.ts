
// This file runs on the client-side.
import { getDb, convertSqljsResponse, parseEmployee, parseTrainingRequest, saveDatabaseChanges, addNotificationToDb, getNotificationsFromDb, markNotificationAsReadInDb, markAllNotificationsAsReadInDb } from './sqljs-db';
import type { Employee, TrainingRequest, ApprovalAction, TrainingRequestStatus, CurrentApprovalStep, ApprovalStepRole, AppNotification, AppNotificationType } from '@/lib/types';
import type { NewRequestFormValues } from '@/components/requests/new-request-form';
import { sendEmailNotification } from './email-service';
import { generateRequestLink } from './utils'; 
import { format } from 'date-fns';

const approvalStepRoleDisplay: Record<ApprovalStepRole, string> = {
  supervisor: 'Supervisor',
  thr: 'THR',
  ceo: 'CEO',
  cm: 'Capability Management'
};

async function getEmployeeById(userId: string): Promise<Employee | null> {
  const allUsers = await fetchAllUsersAction(); 
  return allUsers.find(u => u.id === userId) || null;
}

async function getUsersByRole(role: Employee['role']): Promise<Employee[]> {
  const allUsers = await fetchAllUsersAction();
  return allUsers.filter(u => u.role === role);
}

async function getSupervisorForEmployee(employeeId: string): Promise<Employee | null> {
  const employee = await getEmployeeById(employeeId);
  if (employee && employee.managerId) {
    return getEmployeeById(employee.managerId);
  }
  return null;
}


// --- Notification Helper ---
async function createAndSaveAppNotification(
  userId: string,
  title: string,
  description: string,
  type: AppNotificationType,
  link?: string,
  relatedRequestId?: string,
  actorName?: string
) {
  const user = await getEmployeeById(userId);
  if (user && user.prefersInAppNotifications) {
    await addNotificationToDb({
      userId,
      title,
      description,
      type,
      link,
      relatedRequestId,
      actorName
    });
  }
}


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
): Promise<string | false> { 
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
    
    const supervisor = await getSupervisorForEmployee(currentUser.id);
    if (supervisor) {
      if (supervisor.prefersEmailNotifications) {
        await sendEmailNotification({
          to: supervisor.email,
          recipientName: supervisor.name,
          subject: `New Training Request Awaiting Your Approval: "${requestData.trainingTitle}"`,
          body: `Hello ${supervisor.name},\n\nA new training request titled "${requestData.trainingTitle}" submitted by ${currentUser.name} is awaiting your approval.\n\nTraining Details:\n- Title: ${requestData.trainingTitle}\n- Dates: ${format(requestData.startDate, 'PPP')} to ${format(requestData.endDate, 'PPP')}\n- Cost: $${requestData.cost.toFixed(2)}\n\nPlease review it here: ${generateRequestLink(newRequestId)}\n\nThank you.`
        });
      }
      await createAndSaveAppNotification(
        supervisor.id,
        `New Request: ${requestData.trainingTitle}`,
        `Submitted by ${currentUser.name}. Please review.`,
        'action_required',
        generateRequestLink(newRequestId),
        newRequestId,
        currentUser.name
      );
    }
    
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
  actingUserId: string 
): Promise<boolean> {
  const db = await getDb();
  
  let newDocumentNames: { name: string; url?: string }[];
  if (newData.supportingDocuments && newData.supportingDocuments.length > 0) {
    newDocumentNames = Array.from(newData.supportingDocuments).map(file => ({ name: file.name }));
  } else {
    newDocumentNames = originalSupportingDocs || [];
  }

  try {
    const originalRequestBeforeUpdate = (await fetchAllTrainingRequestsAction()).find(r => r.id === requestId);
    if (!originalRequestBeforeUpdate) {
        console.error("Cannot send update notification: Original request not found.");
        return false;
    }

    db.run(
      `UPDATE training_requests SET 
        trainingTitle = ?, justification = ?, organiser = ?, venue = ?, 
        startDate = ?, endDate = ?, cost = ?, mode = ?, programType = ?, 
        previousRelevantTraining = ?, supportingDocuments = ?, 
        costCenter = ?, estimatedLogisticCost = ?, departmentApprovedBudget = ?, departmentBudgetBalance = ?,
        lastUpdated = ?, status = ?, currentApprovalStep = ?
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
        'pending', // Reset status to pending
        'supervisor', // Reset approval step to supervisor
        requestId
      ]
    );
    
    const requester = await getEmployeeById(originalRequestBeforeUpdate.employeeId);
    const editor = await getEmployeeById(actingUserId);

    if (editor && requester) {
        const notificationTitle = `Request Updated: ${newData.trainingTitle}`;
        const notificationLink = generateRequestLink(requestId);

        if (actingUserId === originalRequestBeforeUpdate.employeeId) { // Requester edited
            const supervisor = await getSupervisorForEmployee(requester.id);
            if (supervisor) {
                if (supervisor.prefersEmailNotifications) {
                    await sendEmailNotification({
                        to: supervisor.email, recipientName: supervisor.name,
                        subject: notificationTitle,
                        body: `Hello ${supervisor.name},\n\nThe training request "${newData.trainingTitle}" for ${requester.name}, has been updated by the requester and requires your review.\n\nPlease review the changes: ${notificationLink}\n\nThank you.`
                    });
                }
                await createAndSaveAppNotification(supervisor.id, notificationTitle, `Request by ${requester.name} was updated and needs your review.`, 'action_required', notificationLink, requestId, requester.name);
            }
        } else { // Approver edited
            if (requester.prefersEmailNotifications) {
                 await sendEmailNotification({
                    to: requester.email, recipientName: requester.name,
                    subject: notificationTitle,
                    body: `Hello ${requester.name},\n\nYour training request "${newData.trainingTitle}" has been modified by ${editor.name} (${approvalStepRoleDisplay[editor.role as ApprovalStepRole] || editor.role}). It has been reset to 'Pending Supervisor' approval.\n\nPlease review the changes: ${notificationLink}\n\nThank you.`
                });
            }
            await createAndSaveAppNotification(requester.id, notificationTitle, `Your request was modified by ${editor.name}.`, 'request_updated', notificationLink, requestId, editor.name);
            
            // Also notify supervisor that it's back in their queue
            const supervisor = await getSupervisorForEmployee(requester.id);
             if (supervisor && supervisor.id !== editor.id) { // Don't notify supervisor if they are the editor
                if (supervisor.prefersEmailNotifications) {
                     await sendEmailNotification({
                        to: supervisor.email, recipientName: supervisor.name,
                        subject: `Request Needs Review: ${newData.trainingTitle}`,
                        body: `Hello ${supervisor.name},\n\nThe training request "${newData.trainingTitle}" for ${requester.name} was modified by ${editor.name} and is now awaiting your approval.\n\nPlease review it: ${notificationLink}\n\nThank you.`
                    });
                }
                await createAndSaveAppNotification(supervisor.id, `Request Needs Review: ${newData.trainingTitle}`, `Modified by ${editor.name}, awaiting your approval for ${requester.name}.`, 'action_required', notificationLink, requestId, editor.name);
            }
        }
    }
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
    console.warn("UpdateRequestStatus: Action not allowed or request not in correct state.", 
                 { reqStatus: parsedCurrentRequest.status, currentStep: parsedCurrentRequest.currentApprovalStep, userRole: currentUser.role });
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
  let notificationTypeForRequester: AppNotificationType = decision === 'approved' ? 'request_approved_step' : 'request_rejected';

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
          notificationTypeForRequester = 'request_fully_approved';
        }
        break;
      case 'ceo':
        finalStatus = 'approved';
        nextApprovalStep = 'cm'; 
        notificationTypeForRequester = 'request_fully_approved';
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
    
    const requester = await getEmployeeById(parsedCurrentRequest.employeeId);
    const approver = currentUser; 
    const requestLink = generateRequestLink(requestId);

    if (requester) {
      const emailSubject = `Training Request Update: "${parsedCurrentRequest.trainingTitle}"`;
      const emailBody = `Hello ${requester.name},\n\nYour training request for "${parsedCurrentRequest.trainingTitle}" has been ${decision} by ${approver.name} (${approvalStepRoleDisplay[newAction.stepRole]}).\n\nNotes: ${notes || 'N/A'}\n\nView request: ${requestLink}\n\nThank you.`;
      if (requester.prefersEmailNotifications) {
        await sendEmailNotification({ to: requester.email, recipientName: requester.name, subject: emailSubject, body: emailBody });
      }
      await createAndSaveAppNotification(requester.id, emailSubject, `Your request was ${decision} by ${approver.name}. Notes: ${notes || 'N/A'}`, notificationTypeForRequester, requestLink, requestId, approver.name);
    }

    if (finalStatus === 'pending' && nextApprovalStep !== 'completed' && nextApprovalStep !== parsedCurrentRequest.currentApprovalStep) {
      const nextApprovers = await getUsersByRole(nextApprovalStep as ApprovalStepRole);
      for (const nextAppr of nextApprovers) {
        let shouldNotify = true;
        if (nextApprovalStep === 'supervisor') {
           const employeeBeingSupervised = await getEmployeeById(parsedCurrentRequest.employeeId);
           if (employeeBeingSupervised?.managerId !== nextAppr.id) shouldNotify = false;
        }

        if (shouldNotify) {
            const emailSubjectNext = `Action Required: Training Request for ${parsedCurrentRequest.employeeName}`;
            const emailBodyNext = `Hello ${nextAppr.name},\n\nThe training request "${parsedCurrentRequest.trainingTitle}" from ${parsedCurrentRequest.employeeName} is now awaiting your approval as ${approvalStepRoleDisplay[nextApprovalStep as ApprovalStepRole]}.\n\nPlease review it here: ${requestLink}\n\nThank you.`;
            if (nextAppr.prefersEmailNotifications) {
                await sendEmailNotification({ to: nextAppr.email, recipientName: nextAppr.name, subject: emailSubjectNext, body: emailBodyNext });
            }
            await createAndSaveAppNotification(nextAppr.id, emailSubjectNext, `Request from ${parsedCurrentRequest.employeeName} for "${parsedCurrentRequest.trainingTitle}" needs your approval.`, 'action_required', requestLink, requestId, parsedCurrentRequest.employeeName);
        }
      }
    } else if (finalStatus === 'approved' && nextApprovalStep === 'cm') { 
        const cmUsers = await getUsersByRole('cm');
        for (const cmUser of cmUsers) {
            const emailSubjectCM = `Action Required: Approved Training for ${parsedCurrentRequest.employeeName}`;
            const emailBodyCM = `Hello ${cmUser.name},\n\nThe training request "${parsedCurrentRequest.trainingTitle}" from ${parsedCurrentRequest.employeeName} has been fully approved and is awaiting your processing as Capability Management.\n\nPlease process it here: ${requestLink}\n\nThank you.`;
            if (cmUser.prefersEmailNotifications) {
                 await sendEmailNotification({ to: cmUser.email, recipientName: cmUser.name, subject: emailSubjectCM, body: emailBodyCM });
            }
            await createAndSaveAppNotification(cmUser.id, emailSubjectCM, `Request for ${parsedCurrentRequest.employeeName} (${parsedCurrentRequest.trainingTitle}) is fully approved and pending your processing.`, 'action_required', requestLink, requestId, parsedCurrentRequest.employeeName);
        }
    }
    await saveDatabaseChanges();
    return true;
  } catch (error)
  {
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
    
    const requester = await getEmployeeById(parsedCurrentRequest.employeeId);
    const requestLink = generateRequestLink(requestId);
    if (requester) {
      const emailSubject = `Training Request Processed: "${parsedCurrentRequest.trainingTitle}"`;
      const emailBody = `Hello ${requester.name},\n\nYour training request for "${parsedCurrentRequest.trainingTitle}" has been processed by Capability Management (${currentUser.name}).\n\nNotes: ${notes || 'N/A'}\n\nView request: ${requestLink}\n\nThank you.`;
      if (requester.prefersEmailNotifications) {
        await sendEmailNotification({ to: requester.email, recipientName: requester.name, subject: emailSubject, body: emailBody });
      }
      await createAndSaveAppNotification(requester.id, emailSubject, `CM (${currentUser.name}) processed your request. Notes: ${notes || 'N/A'}`, 'request_processed_cm', requestLink, requestId, currentUser.name);
    }
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
    const requestToCancel = (await fetchAllTrainingRequestsAction()).find(r => r.id === requestId);
    if (!requestToCancel) {
        console.error("Cannot send cancellation notification: Request not found.");
        return false;
    }

    db.run(
      'UPDATE training_requests SET status = ?, currentApprovalStep = ?, cancelledByUserId = ?, cancelledDate = ?, cancellationReason = ?, lastUpdated = ? WHERE id = ?',
      [
        'cancelled',
        'completed', 
        cancellingUserId,
        cancelledDate,
        cancellationReason || null,
        cancelledDate, 
        requestId
      ]
    );
    
    const requester = await getEmployeeById(requestToCancel.employeeId);
    const canceller = await getEmployeeById(cancellingUserId);
    const requestLink = generateRequestLink(requestId);

    if (requester && canceller) {
      const emailSubject = `Training Request Cancelled: "${requestToCancel.trainingTitle}"`;
      const emailBody = `Hello ${requester.name},\n\nYour training request for "${requestToCancel.trainingTitle}" has been cancelled ${canceller ? `by ${canceller.name}` : ''}.\n\nReason: ${cancellationReason || 'N/A'}\n\nView request: ${requestLink}\n\nThank you.`;
      if (requester.prefersEmailNotifications) {
        await sendEmailNotification({ to: requester.email, recipientName: requester.name, subject: emailSubject, body: emailBody });
      }
      await createAndSaveAppNotification(requester.id, emailSubject, `Request cancelled ${canceller ? `by ${canceller.name}` : ''}. Reason: ${cancellationReason || 'N/A'}`, 'request_cancelled', requestLink, requestId, canceller.name);
    }
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
  console.log(`[CDA] Attempting to update avatar for user ${userId} to ${avatarUrl.substring(0, 30)}...`);
  try {
    const stmt = db.prepare('UPDATE employees SET avatarUrl = ? WHERE id = ?');
    stmt.run([avatarUrl, userId]);
    stmt.free();
    await saveDatabaseChanges();
    console.log(`[CDA] Avatar SQL for user ${userId} executed. DB save attempt initiated.`);
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

// --- App Notification Actions ---
export async function fetchUserNotificationsAction(userId: string): Promise<AppNotification[]> {
  try {
    return await getNotificationsFromDb(userId);
  } catch (error) {
    console.error("Failed to fetch user notifications:", error);
    return [];
  }
}

export async function markAppNotificationAsReadAction(notificationId: string, userId: string): Promise<boolean> {
  try {
    const success = await markNotificationAsReadInDb(notificationId, userId);
    if (success) await saveDatabaseChanges();
    return success;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return false;
  }
}

export async function markAllAppNotificationsAsReadAction(userId: string): Promise<boolean> {
  try {
    const success = await markAllNotificationsAsReadInDb(userId);
    if (success) await saveDatabaseChanges();
    return success;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return false;
  }
}
