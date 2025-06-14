
"use client";
import type { TrainingRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle, XCircle, FileText, User, DollarSign, CalendarDays, Briefcase, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

interface ReviewCardProps {
  request: TrainingRequest;
}

export function ReviewCard({ request }: ReviewCardProps) {
  const [notes, setNotes] = useState(request.supervisorNotes || '');
  const { updateRequestStatus } = useAuth();
  const { toast } = useToast();

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
    <Card className="w-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-xl">{request.purpose}</CardTitle>
            <CardDescription>Submitted by: {request.employeeName} on {format(request.submittedDate, 'MMM d, yyyy')}</CardDescription>
          </div>
          <Badge variant={getStatusVariant(request.status)} className="capitalize text-sm px-3 py-1">{request.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start space-x-2">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div><strong>Employee:</strong> {request.employeeName}</div>
          </div>
          <div className="flex items-start space-x-2">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div><strong>Cost:</strong> ${request.cost.toFixed(2)}</div>
          </div>
          <div className="flex items-start space-x-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div><strong>Dates:</strong> {format(request.startDate, 'MMM d')} - {format(request.endDate, 'MMM d, yyyy')}</div>
          </div>
          <div className="flex items-start space-x-2">
            <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div><strong>Mode:</strong> <span className="capitalize">{request.mode}</span></div>
          </div>
        </div>
        
        {request.supportingDocuments && request.supportingDocuments.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-1 flex items-center"><FileText className="h-4 w-4 mr-2 text-muted-foreground" /> Supporting Documents:</h4>
            <ul className="list-disc list-inside pl-1 text-sm">
              {request.supportingDocuments.map(doc => (
                <li key={doc.name} className="text-muted-foreground hover:text-primary transition-colors">
                  {/* In a real app, this would be a link */}
                  {doc.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {request.status !== 'pending' && request.supervisorNotes && (
           <div className="mt-4 p-3 bg-muted/50 rounded-md">
             <h4 className="font-semibold text-sm mb-1 flex items-center"><MessageSquare className="h-4 w-4 mr-2 text-muted-foreground" /> Your Notes:</h4>
             <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.supervisorNotes}</p>
           </div>
        )}

        {request.status === 'pending' && (
          <div>
            <label htmlFor={`notes-${request.id}`} className="block text-sm font-medium text-foreground mb-1">Add Notes (Optional):</label>
            <Textarea
              id={`notes-${request.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide reasoning for approval or rejection..."
              rows={3}
              className="text-sm"
            />
          </div>
        )}
      </CardContent>
      {request.status === 'pending' && (
        <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={() => handleAction('rejected')} className="w-full sm:w-auto">
            <XCircle className="mr-2 h-4 w-4" /> Reject
          </Button>
          <Button size="sm" onClick={() => handleAction('approved')} className="w-full sm:w-auto">
            <CheckCircle className="mr-2 h-4 w-4" /> Approve
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
