
"use client";
import { useAuth } from '@/hooks/use-auth';
import type { TrainingRequest, ApprovalStepRole } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Info, Trash2, Edit, RotateCcw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';

const approvalStepRoleDisplay: Record<ApprovalStepRole, string> = {
  supervisor: 'Supervisor',
  thr: 'THR',
  ceo: 'CEO',
  cm: 'Capability Management'
};

export default function DashboardPage() {
  const { currentUser, trainingRequests, cancelTrainingRequest } = useAuth();
  const { toast } = useToast();
  const [requestToAction, setRequestToAction] = useState<TrainingRequest | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'closeOut' | null>(null);


  const userRequests = trainingRequests.filter(req => req.employeeId === currentUser?.id)
    .sort((a,b) => b.submittedDate.getTime() - a.submittedDate.getTime());

  const getStatusText = (request: TrainingRequest): string => {
    if (request.status === 'approved' && request.currentApprovalStep === 'cm') return 'Pending CM Processing';
    if (request.status === 'approved') return 'Approved & Processed';
    if (request.status === 'cancelled') {
      const canceller = request.cancelledByUserId === currentUser?.id ? 'You' : 'Admin';
      return `Cancelled by ${canceller}`;
    }
    if (request.status === 'rejected') {
      const lastAction = request.approvalChain[request.approvalChain.length - 1];
      if (lastAction?.decision === 'rejected') {
        const roleName = approvalStepRoleDisplay[lastAction.stepRole] || lastAction.stepRole;
        return `Rejected by ${roleName}`;
      }
      return 'Rejected';
    }
    // Pending status
    if (request.currentApprovalStep === 'supervisor') return 'Pending Supervisor';
    if (request.currentApprovalStep === 'thr') return `Pending ${approvalStepRoleDisplay['thr']}`;
    if (request.currentApprovalStep === 'ceo') return `Pending ${approvalStepRoleDisplay['ceo']}`;
    return 'Pending Review';
  };
  
  const getStatusVariant = (status: TrainingRequest['status'], currentStep?: TrainingRequest['currentApprovalStep']): "default" | "secondary" | "destructive" | "outline" => {
    if (status === 'approved' && currentStep === 'cm') return 'secondary';
    switch (status) {
      case 'approved':
        return 'default'; 
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'outline'; 
      default:
        return 'outline';
    }
  };

  const handleActionConfirm = async () => {
    if (!requestToAction || !currentUser || !actionType) return;
    
    const success = await cancelTrainingRequest(requestToAction.id, "Request actioned by employee.");
    
    if (success) {
      const toastTitle = actionType === 'cancel' ? "Request Cancelled" : "Request Closed Out";
      const toastDescription = `Your request "${requestToAction.trainingTitle}" has been ${actionType === 'cancel' ? 'cancelled' : 'closed out'}.`;
      toast({ title: toastTitle, description: toastDescription });
    } else {
      const toastTitle = actionType === 'cancel' ? "Cancellation Failed" : "Close Out Failed";
      toast({ variant: "destructive", title: toastTitle, description: "Could not complete action on the request."});
    }
    setRequestToAction(null);
    setActionType(null);
  };

  const openActionDialog = (request: TrainingRequest, type: 'cancel' | 'closeOut') => {
    setRequestToAction(request);
    setActionType(type);
  };
  
  return (
    <div className="space-y-8 p-1 md:p-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">My Training Requests</h1>
          <p className="text-muted-foreground">View the status of your submitted training requests.</p>
        </div>
        <Button asChild>
          <Link href="/requests/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Request History</CardTitle>
          <CardDescription>A list of all training requests you have submitted.</CardDescription>
        </CardHeader>
        <CardContent>
          {userRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Info className="h-20 w-20 text-muted-foreground mb-8" />
              <p className="text-xl font-semibold mb-2">No Requests Found</p>
              <p className="text-muted-foreground mb-6">You haven't submitted any training requests yet.</p>
              <Button asChild variant="outline">
                <Link href="/requests/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Submit Your First Request
                </Link>
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-22rem)] sm:h-auto sm:max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Training Title</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={request.trainingTitle}>{request.trainingTitle}</TableCell>
                      <TableCell>{format(request.startDate, 'MMM d, yyyy')} - {format(request.endDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">${request.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(request.status, request.currentApprovalStep)} className="whitespace-nowrap">
                          {getStatusText(request)}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(request.submittedDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' && request.employeeId === currentUser?.id && (
                           <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openActionDialog(request, 'cancel')}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          </AlertDialogTrigger>
                        )}
                        {request.status === 'rejected' && request.employeeId === currentUser?.id && (
                          <div className="flex gap-2 justify-end">
                             <Button variant="outline" size="sm" onClick={() => alert("Revise functionality: This would typically take you to a pre-filled new request form or allow editing the existing one.")}>
                              <Edit className="mr-1 h-3.5 w-3.5" />
                              Revise
                            </Button>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" onClick={() => openActionDialog(request, 'closeOut')}>
                                <Trash2 className="mr-1 h-3.5 w-3.5" />
                                Close Out
                              </Button>
                            </AlertDialogTrigger>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {requestToAction && actionType && (
        <AlertDialog open={!!requestToAction} onOpenChange={(open) => !open && (setRequestToAction(null), setActionType(null))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'cancel' ? 'Are you sure you want to cancel this request?' : 'Are you sure you want to close out this rejected request?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Training: "{requestToAction.trainingTitle}". This action cannot be undone for cancellation, and will archive a rejected request.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => (setRequestToAction(null), setActionType(null))}>Back</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleActionConfirm} 
                className={actionType === 'cancel' ? "bg-destructive hover:bg-destructive/90" : undefined}
              >
                {actionType === 'cancel' ? 'Yes, Cancel Request' : 'Yes, Close Out Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

