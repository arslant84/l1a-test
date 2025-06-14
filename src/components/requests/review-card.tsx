
"use client";
import type { TrainingRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, FileText, User, DollarSign, CalendarDays, Briefcase, MessageSquare, Info, Award, Edit3, BookOpen, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface ReviewCardProps {
  request: TrainingRequest;
}

export function ReviewCard({ request }: ReviewCardProps) {
  const [notes, setNotes] = useState(request.supervisorNotes || '');
  const { updateRequestStatus, users }
   = useAuth();
  const { toast } = useToast();

  const employeeDetails = users.find(u => u.id === request.employeeId);

  const handleAction = async (status: 'approved' | 'rejected') => {
    const success = await updateRequestStatus(request.id, status, notes);
    if (success) {
      toast({ title: `Request ${status}`, description: `Request from ${request.employeeName} has been ${status}.`});
    } else {
      toast({ variant: "destructive", title: "Action Failed", description: "Could not update request status."});
    }
  };
  
  const getStatusVariant = (status: TrainingRequest['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved':
        return 'default'; 
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

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
          <Badge variant={getStatusVariant(request.status)} className="capitalize text-xs px-2 py-1">{request.status}</Badge>
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

        <Accordion type="single" collapsible className="w-full">
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
        </Accordion>
        
        {request.status !== 'pending' && request.supervisorNotes && (
           <div className="mt-2 p-2.5 bg-muted/50 rounded-md border border-dashed">
             <h4 className="font-semibold text-xs mb-1 flex items-center"><MessageSquare className="h-4 w-4 mr-1.5 text-primary" /> Your Notes:</h4>
             <p className="text-xs text-muted-foreground whitespace-pre-wrap">{request.supervisorNotes}</p>
           </div>
        )}

        {request.status === 'pending' && (
          <div className="mt-2">
            <label htmlFor={`notes-${request.id}`} className="block text-xs font-medium text-foreground mb-1">Add Notes (Optional):</label>
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
      {request.status === 'pending' && (
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
