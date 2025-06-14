
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'supervisor' | 'thr' | 'ceo' | 'cm'; // Added thr, ceo, cm roles
  avatarUrl?: string;
  managerId?: string; 
  position?: string;
  staffNo?: string;
  academicQualification?: string;
  dateJoined?: Date;
}

export type TrainingRequestStatus = 'pending' | 'approved' | 'rejected';
export type TrainingRequestMode = 'online' | 'in-person' | 'conference';
export type ApprovalStepRole = 'supervisor' | 'thr' | 'ceo';
export type CurrentApprovalStep = ApprovalStepRole | 'completed';

export interface ApprovalAction {
  stepRole: ApprovalStepRole;
  decision: 'approved' | 'rejected';
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
  cost: number;
  mode: TrainingRequestMode;
  previousRelevantTraining?: string;
  supportingDocuments?: { name: string; url?: string }[];
  status: TrainingRequestStatus; // Overall status
  currentApprovalStep: CurrentApprovalStep; // Whose turn it is or if completed
  approvalChain: ApprovalAction[]; // History of approvals/rejections
  submittedDate: Date;
  lastUpdated: Date;
}

