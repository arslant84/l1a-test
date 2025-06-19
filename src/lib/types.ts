
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
  cost: number;
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
}
