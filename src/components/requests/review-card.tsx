
"use client";
import type { TrainingRequest, ApprovalAction, TrainingRequestLocationMode, ProgramType, ApprovalStepRole, Employee } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle, XCircle, FileText, User, DollarSign, CalendarDays, MessageSquare, Info,
  Award, BookOpen, MapPin, Users, ShieldCheck, Landmark, LayoutList, MapPinned, Trash2, CheckCheck, ListChecks
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from '../ui/input';


interface ReviewCardProps {
  request: TrainingRequest;
  isReadOnly?: boolean;
}

const approvalStepRoleDisplay: Record<ApprovalStepRole, string> = {
  supervisor: 'Supervisor',
  thr: 'THR',
  ceo: 'CEO',
  cm: 'Capability Management'
};

const getRoleIcon = (role: ApprovalAction['stepRole']) => {
  switch(role) {
    case 'supervisor': return Users;
    case 'thr': return ShieldCheck;
    case 'ceo': return Landmark;
    case 'cm': return CheckCheck;
    default: return User;
  }
}

const getOverallStatusText = (request: TrainingRequest, usersFromAuth: Employee[]): string => {
  if (request.status === 'cancelled') {
    const cancellerUser = request.cancelledByUserId ? usersFromAuth.find(u => u.id === request.cancelledByUserId) : null;
    const cancellerName = cancellerUser ? cancellerUser.name : 'System';
    return "Cancelled by " + (cancellerUser && cancellerUser.id === request.employeeId ? 'Employee' : cancellerName);
  }
  if (request.status === 'approved' && request.currentApprovalStep === 'cm') return "Pending CM Processing";
  if (request.status === 'approved' && request.currentApprovalStep === 'completed') return 'Approved & Processed';
  if (request.status === 'approved') return 'Approved'; // Fallback if CM step somehow missed but status is approved

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
  return request.status.charAt(0).toUpperCase() + request.status.slice(1); // Fallback
};


function ReviewCardComponent({ request, isReadOnly = false }: ReviewCardProps) {
  const [actionNotes, setActionNotes] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { updateRequestStatus, cancelTrainingRequest, users, currentUser, markRequestAsProcessedByCM } = useAuth();
  const { toast } = useToast();

  const employeeDetails = users.find(u => u.id === request.employeeId);

  const handleDecisionAction = async (decision: 'approved' | 'rejected') => {
    if (!currentUser) return;
    const success = await updateRequestStatus(request.id, decision, actionNotes);
    if (success) {
      toast({ title: "Request " + decision.charAt(0).toUpperCase() + decision.slice(1), description: "Request from " + request.employeeName + " has been " + decision + "."});
      setActionNotes('');
    } else {
      toast({ variant: "destructive", title: "Action Failed", description: "Could not update request status."});
    }
  };

  const handleCMProcessing = async () => {
    if (!currentUser || currentUser.role !== 'cm') return;
    const success = await markRequestAsProcessedByCM(request.id, actionNotes);
     if (success) {
      toast({
        title: "Request Processed",
        description: "Request from " + request.employeeName + " has been marked as processed."
      });
      setActionNotes('');
    } else {
      toast({ variant: "destructive", title: "Processing Failed", description: "Could not mark request as processed."});
    }
  }

  const handleCancelAction = async () => {
    if (!currentUser) return;
    // Pass current user's name if they are cancelling
    const cancellerName = currentUser?.name || "User"; 
    const success = await cancelTrainingRequest(request.id, cancellationReason);
    if (success) {
      toast({
        title: "Request Cancelled",
        description: "Request from " + request.employeeName + " has been cancelled."
      });
      setCancellationReason('');
    } else {
      toast({ variant: "destructive", title: "Cancellation Failed", description: "Could not cancel the request."});
    }
    setShowCancelDialog(false);
  };

  const getStatusVariant = (status: TrainingRequest['status'], currentStep?: TrainingRequest['currentApprovalStep']): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'approved' && currentStep === 'cm') return 'secondary';
    if (status === 'approved') return 'default';
    if (status === 'rejected') return 'destructive';
    if (status === 'cancelled') return 'outline';
    return 'secondary'; // pending
  };

  const canTakeAction = !isReadOnly && currentUser && (
    (currentUser.role === 'cm' && request.status === 'approved' && request.currentApprovalStep === 'cm') ||
    ( (currentUser.role === 'supervisor' || currentUser.role === 'thr' || currentUser.role === 'ceo') &&
      request.status === 'pending' &&
      currentUser.role === request.currentApprovalStep &&
      (currentUser.role !== 'supervisor' || (employeeDetails && employeeDetails.managerId === currentUser.id))
    )
  );

  const canCancelAsApprover = !isReadOnly && currentUser &&
    (currentUser.role === 'supervisor' || currentUser.role === 'thr' || currentUser.role === 'ceo') &&
    request.status === 'pending' && currentUser.role === request.currentApprovalStep &&
    (currentUser.role !== 'supervisor' || (employeeDetails && employeeDetails.managerId === currentUser.id));


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

  return (
    <>
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg leading-tight" title={request.trainingTitle}>{request.trainingTitle}</CardTitle>
            <CardDescription>
              Submitted by: {request.employeeName} on {format(request.submittedDate, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(request.status, request.currentApprovalStep)} className="whitespace-nowrap text-xs px-2 py-1">
            {getOverallStatusText(request, users)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm flex-grow">
        <Accordion type="single" collapsible className="w-full" defaultValue="keyDetails">
          <AccordionItem value="keyDetails">
            <AccordionTrigger className="text-sm py-2 hover:no-underline font-semibold">
              <div className="flex items-center">
                <ListChecks className="h-4 w-4 mr-2 text-muted-foreground" /> Key Training Details
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-xs space-y-1.5 p-2 bg-muted/30 rounded-md">
              <div className="flex items-start space-x-2">
                <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><strong>Organiser:</strong> {request.organiser}</div>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><strong>Venue:</strong> {request.venue}</div>
              </div>
              <div className="flex items-start space-x-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><strong>Cost:</strong> ${request.cost.toFixed(2)}</div>
              </div>
              <div className="flex items-start space-x-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><strong>Dates:</strong> {format(request.startDate, 'MMM d')} - {format(request.endDate, 'MMM d, yyyy')}</div>
              </div>
              <div className="flex items-start space-x-2">
                <MapPinned className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><strong>Mode/Location:</strong> <span className="capitalize">{locationModeDisplayNames[request.mode]}</span></div>
              </div>
              <div className="flex items-start space-x-2">
                <LayoutList className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div><strong>Program Type:</strong> <span className="capitalize">{programTypeDisplayNames[request.programType]}</span></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="justification">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-2 text-muted-foreground" /> Employee Justification
              </div>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground whitespace-pre-wrap text-xs p-2 bg-muted/30 rounded-md">
              {request.justification || "No justification provided."}
            </AccordionContent>
          </AccordionItem>

          {request.previousRelevantTraining && (
            <AccordionItem value="previousTraining">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center">
                  <Award className="h-4 w-4 mr-2 text-muted-foreground" /> Previous Training
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-wrap text-xs p-2 bg-muted/30 rounded-md">
                {request.previousRelevantTraining}
              </AccordionContent>
            </AccordionItem>
          )}

          {employeeDetails && (
            <AccordionItem value="employeeInfo">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center">
                   <User className="h-4 w-4 mr-2 text-muted-foreground" /> Employee Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs space-y-1 p-2 bg-muted/30 rounded-md">
                <p><strong>Position:</strong> {employeeDetails.position || 'N/A'}</p>
                <p><strong>Department:</strong> {employeeDetails.department || 'N/A'}</p>
                <p><strong>Staff No:</strong> {employeeDetails.staffNo || 'N/A'}</p>
                <p><strong>Joined:</strong> {employeeDetails.dateJoined ? format(employeeDetails.dateJoined, 'MMM d, yyyy') : 'N/A'}</p>
                <p><strong>Qualification:</strong> {employeeDetails.academicQualification || 'N/A'}</p>
              </AccordionContent>
            </AccordionItem>
          )}

          {request.supportingDocuments && request.supportingDocuments.length > 0 && (
            <AccordionItem value="documents">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                 <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" /> Supporting Documents
                 </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs p-2 bg-muted/30 rounded-md">
                <ul className="list-disc list-inside">
                  {request.supportingDocuments.map(doc => (
                    <li key={doc.name} className="text-muted-foreground hover:text-primary transition-colors">
                      {doc.name}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          )}

          {request.approvalChain && request.approvalChain.length > 0 && (
            <AccordionItem value="approvalHistory">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" /> Approval History ({request.approvalChain.length})
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-xs space-y-2 p-2 bg-muted/30 rounded-md">
                {request.approvalChain.map((action, index) => {
                  const ActionIcon = getRoleIcon(action.stepRole);
                  const roleName = approvalStepRoleDisplay[action.stepRole] || action.stepRole;
                  const decisionVariant = action.decision === 'approved' ? 'default'
                                         : action.decision === 'processed' ? 'secondary'
                                         : 'destructive';
                  return (
                    <div key={index} className="border-b border-dashed border-border pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                         <div className="flex items-center gap-1.5">
                            <ActionIcon className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-semibold">{roleName}</span>
                            <span>({action.userName})</span>
                         </div>
                         <Badge variant={decisionVariant} className="text-xs capitalize">{action.decision}</Badge>
                      </div>
                      {action.notes && <p className="text-muted-foreground italic text-[0.7rem] whitespace-pre-wrap">"{action.notes}"</p>}
                      <p className="text-muted-foreground/70 text-[0.7rem] mt-0.5">{format(new Date(action.date), 'MMM d, yyyy p')}</p>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          )}
          {request.cancellationReason && (
             <AccordionItem value="cancellationReason">
              <AccordionTrigger className="text-sm py-2 hover:no-underline">
                <div className="flex items-center">
                  <XCircle className="h-4 w-4 mr-2 text-destructive" /> Cancellation Details
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground whitespace-pre-wrap text-xs p-2 bg-muted/30 rounded-md">
                {request.cancellationReason}
                {request.cancelledDate && <span className="block text-muted-foreground/70 text-[0.7rem] mt-0.5">Cancelled on: {format(request.cancelledDate, 'MMM d, yyyy p')}</span>}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {canTakeAction && (
          <div className="mt-4 pt-3 border-t">
            <label htmlFor={"notes-" + request.id} className="block text-xs font-medium text-foreground mb-1">Your Notes (Optional):</label>
            <Textarea
              id={"notes-" + request.id}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              placeholder={currentUser?.role === 'cm' ? "Add processing notes..." : "Provide reasoning for approval or rejection..."}
              rows={2}
              className="text-xs"
            />
          </div>
        )}
      </CardContent>
      {(canTakeAction || canCancelAsApprover) && (
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t mt-auto">
          {currentUser?.role !== 'cm' && canTakeAction && request.status === 'pending' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleDecisionAction('rejected')} className="w-full sm:w-auto">
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
              <Button size="sm" onClick={() => handleDecisionAction('approved')} className="w-full sm:w-auto">
                <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
              </Button>
            </>
          )}
          {currentUser?.role === 'cm' && canTakeAction && (
             <Button size="sm" onClick={handleCMProcessing} className="w-full sm:w-auto">
                <CheckCheck className="mr-1.5 h-4 w-4" /> Mark as Processed
              </Button>
          )}
          {canCancelAsApprover && request.status === 'pending' && (
            <Button variant="destructive" size="sm" onClick={() => setShowCancelDialog(true)} className="w-full sm:w-auto sm:ml-auto">
                <Trash2 className="mr-1.5 h-4 w-4" /> Cancel Request
            </Button>
          )}
        </CardFooter>
      )}
    </Card>

    {showCancelDialog && (
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Training Request?</AlertDialogTitle>
              <AlertDialogDescription>
                Training: "{request.trainingTitle}" for {request.employeeName}.
                <br/>
                Please provide a reason for cancellation (optional). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              type="text"
              placeholder="Reason for cancellation (optional)"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="mt-2"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>Back</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelAction} className="bg-destructive hover:bg-destructive/90">
                Confirm Cancellation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

export const ReviewCard = React.memo(ReviewCardComponent);
