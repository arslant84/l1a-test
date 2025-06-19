
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, User, Briefcase, Mail, Building, Award, CalendarCheck2, DollarSign, CalendarDays, FileText, BookOpen, MapPin, MapPinned, LayoutList, MessageSquare, CheckCircle, XCircle, Info, CheckCheck, ShieldCheck, Landmark, Users as UsersIcon, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { TrainingRequest, Employee, ApprovalAction, ApprovalStepRole, TrainingRequestLocationMode, ProgramType } from '@/lib/types';
import React from 'react';

const approvalStepRoleDisplay: Record<ApprovalStepRole, string> = {
  supervisor: 'Supervisor',
  thr: 'THR',
  ceo: 'CEO',
  cm: 'Capability Management'
};

const getRoleIcon = (role: ApprovalAction['stepRole']) => {
  switch(role) {
    case 'supervisor': return UsersIcon;
    case 'thr': return ShieldCheck;
    case 'ceo': return Landmark;
    case 'cm': return CheckCheck;
    default: return User;
  }
};

const getOverallStatusText = (request: TrainingRequest, usersFromAuth: Employee[]): string => {
  if (request.status === 'cancelled') {
    const cancellerUser = request.cancelledByUserId ? usersFromAuth.find(u => u.id === request.cancelledByUserId) : null;
    const cancellerName = cancellerUser ? cancellerUser.name : 'System';
    return "Cancelled by " + (cancellerUser && cancellerUser.id === request.employeeId ? 'Employee' : cancellerName);
  }
  if (request.status === 'approved' && request.currentApprovalStep === 'cm') return "Pending CM Processing";
  if (request.status === 'approved' && request.currentApprovalStep === 'completed') return 'Approved & Processed';
  if (request.status === 'approved') return 'Approved';

  if (request.status === 'rejected') {
     const lastAction = request.approvalChain[request.approvalChain.length - 1];
     if (lastAction?.decision === 'rejected') {
       const roleName = approvalStepRoleDisplay[lastAction.stepRole] || lastAction.stepRole;
       return "Rejected by " + roleName;
     }
     return 'Rejected';
  }

  if (request.status === 'pending') {
    if (request.currentApprovalStep === 'supervisor') return "Pending " + approvalStepRoleDisplay['supervisor'];
    if (request.currentApprovalStep === 'thr') return "Pending " + approvalStepRoleDisplay['thr'];
    if (request.currentApprovalStep === 'ceo') return "Pending " + approvalStepRoleDisplay['ceo'];
  }
  return request.status.charAt(0).toUpperCase() + request.status.slice(1);
};

const getStatusVariant = (status: TrainingRequest['status'], currentStep?: TrainingRequest['currentApprovalStep']): "success" | "secondary" | "destructive" | "outline" => {
  if (status === 'approved') { // This covers 'approved & processed' and 'pending CM' if status is approved
    return 'success';
  }
  if (status === 'rejected') return 'destructive';
  if (status === 'cancelled') return 'outline';
  return 'secondary'; // pending (yellowish/grayish)
};

const programTypeDisplayNames: Record<ProgramType, string> = {
  'course': 'Course',
  'conference/seminar/forum': 'Conference/Seminar/Forum',
  'on-the-job attachment': 'On-the-Job Attachment',
  'skg/fsa': 'SKG/FSA',
  'hse': 'HSE',
  'functional': 'Functional',
  'leadership': 'Leadership',
  'specialized': 'Specialized',
  'others': 'Others',
};

const locationModeDisplayNames: Record<TrainingRequestLocationMode, string> = {
  'online': 'Online',
  'in-house': 'In-House',
  'local': 'Local (External)',
  'overseas': 'Overseas (External)',
};


interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
  isDate?: boolean;
  isCurrency?: boolean;
  children?: React.ReactNode;
}

const InfoDisplayRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value, isDate, isCurrency, children }) => {
  let displayValue: React.ReactNode = value;
  if (value === undefined || value === null || value === '') {
    displayValue = <span className="text-muted-foreground/70">N/A</span>;
  } else if (isDate && typeof value === 'string') {
    displayValue = format(new Date(value), "PPP");
  } else if (isDate && value instanceof Date) {
    displayValue = format(value, "PPP");
  } else if (isCurrency && typeof value === 'number') {
    displayValue = `$${value.toFixed(2)}`;
  }

  return (
    <div className="flex items-start space-x-3 py-2 border-b border-dashed last:border-b-0">
      <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? <div className="text-sm text-foreground mt-0.5">{children}</div> : <p className="text-sm text-foreground">{displayValue}</p>}
      </div>
    </div>
  );
};


export default function TrainingRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { trainingRequests, users, isLoading: authLoading } = useAuth();
  const requestId = params.requestId as string;

  const [request, setRequest] = React.useState<TrainingRequest | null>(null);
  const [employee, setEmployee] = React.useState<Employee | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!authLoading && trainingRequests.length > 0 && users.length > 0) {
      const foundRequest = trainingRequests.find(r => r.id === requestId);
      if (foundRequest) {
        setRequest(foundRequest);
        const foundEmployee = users.find(u => u.id === foundRequest.employeeId);
        setEmployee(foundEmployee || null);
      } else {
        setRequest(null); 
        setEmployee(null);
      }
      setIsLoading(false);
    }
  }, [requestId, trainingRequests, users, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading request details...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
        <h2 className="text-2xl font-semibold mb-2">Request Not Found</h2>
        <p className="text-muted-foreground mb-6">The training request you are looking for does not exist or you may not have permission to view it.</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight font-headline">Training Request Details</h1>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div className="flex-1">
              <CardTitle className="font-headline text-2xl mb-1">{request.trainingTitle}</CardTitle>
              <CardDescription>Submitted on: {format(request.submittedDate, 'PPP p')}</CardDescription>
            </div>
            <Badge 
              variant={getStatusVariant(request.status, request.currentApprovalStep)} 
              className="text-base px-4 py-2 mt-1 sm:mt-0 whitespace-nowrap self-start sm:self-center"
            >
              {getOverallStatusText(request, users)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            
            <section>
              <h2 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Employee Information</h2>
              {employee ? (
                <div className="space-y-1">
                  <InfoDisplayRow icon={User} label="Name" value={employee.name} />
                  <InfoDisplayRow icon={Briefcase} label="Position" value={employee.position} />
                  <InfoDisplayRow icon={Building} label="Department" value={employee.department} />
                  <InfoDisplayRow icon={Mail} label="Email" value={employee.email} />
                  <InfoDisplayRow icon={Award} label="Academic Qualification" value={employee.academicQualification} />
                  <InfoDisplayRow icon={CalendarCheck2} label="Date Joined" value={employee.dateJoined} isDate />
                </div>
              ) : (
                <p className="text-muted-foreground">Employee details not available.</p>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3 text-primary border-b pb-1">Training Proposal</h2>
              <div className="space-y-1">
                <InfoDisplayRow icon={BookOpen} label="Organiser / Provider" value={request.organiser} />
                <InfoDisplayRow icon={MapPin} label="Venue" value={request.venue} />
                <InfoDisplayRow icon={CalendarDays} label="Start Date" value={request.startDate} isDate />
                <InfoDisplayRow icon={CalendarDays} label="End Date" value={request.endDate} isDate />
                <InfoDisplayRow icon={DollarSign} label="Estimated Cost" value={request.cost} isCurrency />
                <InfoDisplayRow icon={MapPinned} label="Mode / Location" value={locationModeDisplayNames[request.mode]} />
                <InfoDisplayRow icon={LayoutList} label="Program Type" value={programTypeDisplayNames[request.programType]} />
              </div>
            </section>
            
            <section className="md:col-span-2">
              <h2 className="text-lg font-semibold mt-4 mb-3 text-primary border-b pb-1">Justification</h2>
              <InfoDisplayRow icon={FileText} label="Employee's Justification">
                <p className="text-sm text-foreground whitespace-pre-wrap">{request.justification || "N/A"}</p>
              </InfoDisplayRow>
            </section>
            
            {request.previousRelevantTraining && (
              <section className="md:col-span-2">
                <h2 className="text-lg font-semibold mt-4 mb-3 text-primary border-b pb-1">Previous Relevant Training</h2>
                <InfoDisplayRow icon={Award} label="Details (Past 3 Years)">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{request.previousRelevantTraining}</p>
                </InfoDisplayRow>
              </section>
            )}

            {request.supportingDocuments && request.supportingDocuments.length > 0 && (
              <section className="md:col-span-2">
                 <h2 className="text-lg font-semibold mt-4 mb-3 text-primary border-b pb-1">Supporting Documents</h2>
                  <ul className="list-disc list-inside pl-5 space-y-1">
                    {request.supportingDocuments.map(doc => (
                      <li key={doc.name} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {doc.name}
                      </li>
                    ))}
                  </ul>
              </section>
            )}
            
            {request.cancellationReason && (
                 <section className="md:col-span-2">
                    <h2 className="text-lg font-semibold mt-4 mb-3 text-destructive border-b border-destructive/50 pb-1">Cancellation Details</h2>
                    <InfoDisplayRow icon={XCircle} label="Reason for Cancellation">
                         <p className="text-sm text-foreground whitespace-pre-wrap">{request.cancellationReason}</p>
                    </InfoDisplayRow>
                    {request.cancelledDate && request.cancelledByUserId && (
                        <InfoDisplayRow icon={User} label="Cancelled By" value={`${users.find(u=>u.id === request.cancelledByUserId)?.name || 'Unknown'} on ${format(request.cancelledDate, 'PPP p')}`} />
                    )}
                 </section>
            )}


            {request.approvalChain && request.approvalChain.length > 0 && (
              <section className="md:col-span-2">
                <h2 className="text-lg font-semibold mt-4 mb-3 text-primary border-b pb-1">Approval History</h2>
                <ScrollArea className="max-h-[300px] pr-3">
                  <div className="space-y-3">
                  {request.approvalChain.map((action, index) => {
                    const ActionIcon = getRoleIcon(action.stepRole);
                    const roleName = approvalStepRoleDisplay[action.stepRole] || action.stepRole;
                    const decisionBadgeVariant = action.decision === 'approved' || action.decision === 'processed' ? 'success'
                                           : 'destructive';
                    return (
                      <div key={index} className="p-3 border rounded-md bg-muted/20 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                           <div className="flex items-center gap-2">
                              <ActionIcon className="h-5 w-5 text-muted-foreground"/>
                              <span className="font-semibold text-foreground">{roleName}</span>
                              <span className="text-xs text-muted-foreground">({action.userName})</span>
                           </div>
                           <Badge variant={decisionBadgeVariant} className="text-xs capitalize">{action.decision}</Badge>
                        </div>
                        {action.notes && <p className="text-sm text-muted-foreground italic whitespace-pre-wrap py-1 px-2 border-l-2 border-primary/50 bg-background/50 rounded-r-sm">"{action.notes}"</p>}
                        <p className="text-xs text-muted-foreground/80 mt-1">{format(new Date(action.date), 'MMM d, yyyy, h:mm a')}</p>
                      </div>
                    );
                  })}
                  </div>
                </ScrollArea>
              </section>
            )}
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">Last updated: {format(request.lastUpdated, 'PPP p')}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
