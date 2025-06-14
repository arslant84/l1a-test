
"use client";
import type { TrainingRequest, ApprovalAction } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, FileText, User, DollarSign, CalendarDays, Briefcase, MessageSquare, Info, Award, Edit3, BookOpen, MapPin, Users, ShieldCheck, Landmark } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '../ui/separator';

interface ReviewCardProps {
  request: TrainingRequest;
  isReadOnly?: boolean;
}

const getRoleIcon = (role: ApprovalAction['stepRole']) => {
  switch(role) {
    case 'supervisor': return Users;
    case 'thr': return ShieldCheck;
    case 'ceo': return Landmark;
    default: return User;
  }
}

const getOverallStatusText = (request: TrainingRequest): string => {
  if (request.status === 'approved') return 'Approved';
  if (request.status === 'rejected') {
     const lastAction = request.approvalChain[request.approvalChain.length - 1];
     if (lastAction?.decision === 'rejected') {
       return `Rejected by ${lastAction.stepRole}`;
     }
     return 'Rejected';
  }
  // Pending status
  if (request.currentApprovalStep === 'supervisor') return 'Pending Supervisor';
  if (request.currentApprovalStep === 'thr') return 'Pending THR';
  if (request.currentApprovalStep === 'ceo') return 'Pending CEO';
  return 'Pending';
};


export function ReviewCard({ request, isReadOnly = false }: ReviewCardProps) {
  const [notes, setNotes] = useState('');
  const { updateRequestStatus, users, currentUser } = useAuth();
  const { toast } = useToast();

  const employeeDetails = users.find(u => u.id === request.employeeId);

  const handleAction = async (decision: 'approved' | 'rejected') => {
    const success = await updateRequestStatus(request.id, decision, notes);
    if (success) {
      toast({ title: `Request ${decision}`, description: `Request from ${request.employeeName} has been ${decision}.`});
      setNotes(''); // Clear notes after action
    } else {
      toast({ variant: "destructive", title: "Action Failed", description: "Could not update request status."});
    }
  };
  
  const getStatusVariant = (status: TrainingRequest['status'], currentStep: TrainingRequest['currentApprovalStep']): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'approved') return 'default'; // default is primary (greenish)
    if (status === 'rejected') return 'destructive';
    // For pending, secondary (greyish)
    return 'secondary';
  };

  const canTakeAction = !isReadOnly && currentUser?.role === request.currentApprovalStep && request.status === 'pending';

  return (
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-lg leading-tight" title={request.trainingTitle}>{request.trainingTitle}</CardTitle>
            <CardDescription>
              Submitted by: {request.employeeName} on {format(request.submittedDate, 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(request.status, request.currentApprovalStep)} className="capitalize text-xs px-2 py-1">
            {getOverallStatusText(request)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-grow">
        <div className="grid grid-cols-1 gap-2">
           <div className="flex items-start space-x-2">
            <BookOpen className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><strong>Organiser:</strong> {request.organiser}</div>
          </div>
           <div className="flex items-start space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><strong>Venue:</strong> {request.venue}</div>
          </div>
          <div className="flex items-start space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><strong>Cost:</strong> ${request.cost.toFixed(2)}</div>
          </div>
          <div className="flex items-start space-x-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><strong>Dates:</strong> {format(request.startDate, 'MMM d')} - {format(request.endDate, 'MMM d, yyyy')}</div>
          </div>
          <div className="flex items-start space-x-2">
            <Briefcase className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div><strong>Mode:</strong> <span className="capitalize">{request.mode}</span></div>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full" defaultValue="justification">
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
                  return (
                    <div key={index} className="border-b border-dashed border-border pb-2 mb-2 last:border-b-0 last:pb-0 last:mb-0">
                      <div className="flex items-center justify-between mb-1">
                         <div className="flex items-center gap-1.5">
                            <ActionIcon className="h-4 w-4 text-muted-foreground"/>
                            <span className="font-semibold capitalize">{action.stepRole}</span>
                            <span>({action.userName})</span>
                         </div>
                         <Badge variant={action.decision === 'approved' ? 'default' : 'destructive'} className="text-xs capitalize">{action.decision}</Badge>
                      </div>
                      {action.notes && <p className="text-muted-foreground italic text-[0.7rem] whitespace-pre-wrap">"{action.notes}"</p>}
                      <p className="text-muted-foreground/70 text-[0.7rem] mt-0.5">{format(new Date(action.date), 'MMM d, yyyy p')}</p>
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
        
        {canTakeAction && (
          <div className="mt-4 pt-3 border-t">
            <label htmlFor={`notes-${request.id}`} className="block text-xs font-medium text-foreground mb-1">Your Notes (Optional):</label>
            <Textarea
              id={`notes-${request.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide reasoning for approval or rejection..."
              rows={2}
              className="text-xs"
            />
          </div>
        )}
      </CardContent>
      {canTakeAction && (
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 pt-3 border-t mt-auto">
          <Button variant="outline" size="sm" onClick={() => handleAction('rejected')} className="w-full sm:w-auto">
            <XCircle className="mr-1.5 h-4 w-4" /> Reject
          </Button>
          <Button size="sm" onClick={() => handleAction('approved')} className="w-full sm:w-auto">
            <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
