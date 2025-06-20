

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'supervisor' | 'thr' | 'ceo' | 'cm'; 
  avatarUrl?: string;
  managerId?: string; 
  position?: string;
  staffNo?: string;
  academicQualification?: string;
  dateJoined?: Date;
  passwordLastChanged?: Date | null;
  prefersEmailNotifications: boolean;
  prefersInAppNotifications: boolean;
}

export type TrainingRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TrainingRequestLocationMode = 'online' | 'in-house' | 'local' | 'overseas';
export type ProgramType = 
  | 'course' 
  | 'conference/seminar/forum' 
  | 'on-the-job attachment' 
  | 'skg/fsa' 
  | 'hse' 
  | 'functional' 
  | 'leadership' 
  | 'specialized' 
  | 'others';

export type ApprovalStepRole = 'supervisor' | 'thr' | 'ceo' | 'cm';
export type CurrentApprovalStep = ApprovalStepRole | 'completed';

export interface ApprovalAction {
  stepRole: ApprovalStepRole;
  decision: 'approved' | 'rejected' | 'processed'; // Added 'processed' for CM
  userId: string;
  userName:string;
  notes?: string;
  date: Date;
}

export interface TrainingRequest {
  id: string;
  employeeId: string;
  employeeName: string; 
  trainingTitle: string;
  justification: string;
  organiser: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  cost: number; // This is the "Course Fee"
  mode: TrainingRequestLocationMode;
  programType: ProgramType;
  previousRelevantTraining?: string;
  supportingDocuments?: { name: string; url?: string }[];
  status: TrainingRequestStatus; 
  currentApprovalStep: CurrentApprovalStep; 
  approvalChain: ApprovalAction[]; 
  submittedDate: Date;
  lastUpdated: Date;
  cancelledByUserId?: string;
  cancelledDate?: Date;
  cancellationReason?: string;

  // New fields from L1A PDF
  costCenter?: string;
  estimatedLogisticCost?: number;
  departmentApprovedBudget?: number;
  departmentBudgetBalance?: number;
}

// Placeholder for VendorInputFields as its definition was not provided
// Please replace with the actual type definition for your application.
export interface VendorInputFields {
  vendorName: string;
  tenderNumber?: string | null;
  tenderTitle?: string | null;
  dateOfFinancialEvaluation?: string | null; // Assuming string for date simplicity here
  evaluationValidityDate?: string | null; // Assuming string for date simplicity here
  evaluatorNameDepartment?: string | null;
  overallResult?: string | null;
  quantitativeScore?: string | null; // Or number, adjust as needed
  quantitativeBand?: string | null;
  quantitativeRiskCategory?: string | null;
  altmanZScore?: string | null; // Or number
  altmanZBand?: string | null;
  altmanZRiskCategory?: string | null;
  qualitativeScore?: string | null; // Or number
  qualitativeBand?: string | null;
  qualitativeRiskCategory?: string | null;
  overallFinancialEvaluationResult?: string | null;
  // Add any other fields that are part of VENDOR_COLUMNS in database.ts
  [key: string]: any; // Allow other properties if needed
}

export type AppNotificationType = 
  | 'request_submitted'
  | 'request_approved_step' // Approved at a step, pending next
  | 'request_fully_approved' // Final approval, now pending CM
  | 'request_rejected'
  | 'request_cancelled'
  | 'request_processed_cm' // CM has processed it
  | 'request_updated'      // Details of a request were modified
  | 'action_required';     // Generic: your action is needed

export interface AppNotification {
  id: string;
  userId: string; // The user who should see this notification
  title: string;
  description: string;
  timestamp: Date;
  isRead: boolean;
  link?: string; // e.g., to the specific training request
  type: AppNotificationType;
  relatedRequestId?: string; // Optional: ID of the training request
  actorName?: string; // Optional: Name of the user who triggered the notification
}

