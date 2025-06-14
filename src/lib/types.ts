
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'employee' | 'supervisor';
  avatarUrl?: string; // Optional: for employee directory
  managerId?: string; 
  position?: string;
  staffNo?: string;
  academicQualification?: string;
  dateJoined?: Date;
}

export type TrainingRequestStatus = 'pending' | 'approved' | 'rejected';
export type TrainingRequestMode = 'online' | 'in-person' | 'conference';

export interface TrainingRequest {
  id: string;
  employeeId: string;
  employeeName: string; 
  trainingTitle: string; // Renamed from purpose
  justification: string; // Employee's justification
  organiser: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  cost: number;
  mode: TrainingRequestMode;
  previousRelevantTraining?: string; // Optional field
  supportingDocuments?: { name: string; url?: string }[]; // Store document names or URLs
  status: TrainingRequestStatus;
  submittedDate: Date;
  supervisorNotes?: string; 
  lastUpdated: Date;
}
