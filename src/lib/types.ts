
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

export type TrainingRequestStatus = 'pending' | 'approved' | 'rejected';
// Updated TrainingRequestMode to be more location-centric
export type TrainingRequestLocationMode = 'online' | 'in-house' | 'local' | 'overseas';
// Added ProgramType based on L1A form's "Type of Program"
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
  mode: TrainingRequestLocationMode; // Updated this to use the new type
  programType: ProgramType; // Added new field
  previousRelevantTraining?: string;
  supportingDocuments?: { name: string; url?: string }[];
  status: TrainingRequestStatus; 
  currentApprovalStep: CurrentApprovalStep; 
  approvalChain: ApprovalAction[]; 
  submittedDate: Date;
  lastUpdated: Date;
}

