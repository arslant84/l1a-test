
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
import { PlusCircle, Info, Trash2, Edit, Eye } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import React, { useState } from 'react';

const approvalStepRoleDisplay: Record<ApprovalStepRole, string> = {
  supervisor: 'Supervisor',
  thr: 'THR',
  ceo: 'CEO',
  cm: 'Capability Management'
};

export default function DashboardPage() {
  const { currentUser, trainingRequests, cancelTrainingRequest, users } = useAuth();
  const { toast } = useToast();
  const [requestToAction, setRequestToAction] = useState<TrainingRequest | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'closeOut' | null>(null);


  const userRequests = trainingRequests.filter(req => req.employeeId === currentUser?.id)
    .sort((a,b) => b.submittedDate.getTime() - a.submittedDate.getTime());

  const getStatusText = (request: TrainingRequest): string => {
    if (request.status === 'approved' && request.currentApprovalStep === 'cm') return 'Pending CM Processing';
    if (request.status === 'approved' && request.currentApprovalStep === 'completed') return 'Approved & Processed';
    if (request.status === 'approved') return 'Approved';
    
    if (request.status === 'cancelled') {
      const canceller = request.cancelledByUserId === currentUser?.id ? 'You' : (users.find(u => u.id === request.cancelledByUserId)?.name || 'Admin');
      return "Cancelled by " + canceller;
    }
    if (request.status === 'rejected') {
      const lastAction = request.approvalChain[request.approvalChain.length - 1];
      if (lastAction?.decision === 'rejected') {
        const roleName = approvalStepRoleDisplay[lastAction.stepRole] || lastAction.stepRole;
        return "Rejected by " + roleName;
      }
      return 'Rejected';
    }
    // Pending status
    if (request.currentApprovalStep === 'supervisor') return 'Pending Supervisor';
    if (request.currentApprovalStep === 'thr') return "Pending " + approvalStepRoleDisplay['thr'];
    if (request.currentApprovalStep === 'ceo') return "Pending " + approvalStepRoleDisplay['ceo'];
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
    
    let success = false;
    if (actionType === 'cancel' || actionType === 'closeOut') {
        success = await cancelTrainingRequest(requestToAction.id, cancellationReason); // cancellationReason is now passed
    }
    
    if (success) {
      const toastTitle = actionType === 'cancel' ? "Request Cancelled" : "Request Closed Out";
      const toastDescription = "Your request \"" + requestToAction.trainingTitle + "\" has been " + (actionType === 'cancel' ? 'cancelled' : 'closed out') + ".";
      toast({ title: toastTitle, description: toastDescription });
    } else {
      const toastTitle = actionType === 'cancel' ? "Cancellation Failed" : "Close Out Failed";
      toast({ variant: "destructive", title: toastTitle, description: "Could not complete action on the request."});
    }
    setRequestToAction(null);
    setActionType(null);
    setCancellationReason(''); // Reset reason
  };

  const [cancellationReason, setCancellationReason] = useState(''); // Added for AlertDialog

  const openActionDialog = (request: TrainingRequest, type: 'cancel' | 'closeOut') => {
    setRequestToAction(request);
    setActionType(type);
    setCancellationReason(''); // Reset reason when opening dialog
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
                      <TableCell className="font-medium max-w-xs truncate">
                        <Link href={"/requests/" + request.id} className="hover:underline" title={request.trainingTitle}>
                          {request.trainingTitle}
                        </Link>
                      </TableCell>
                      <TableCell>{format(request.startDate, 'MMM d, yyyy')} - {format(request.endDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">${request.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(request.status, request.currentApprovalStep)} className="whitespace-nowrap">
                          {getStatusText(request)}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(request.submittedDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="sm" asChild className="mr-1 p-1 h-auto">
                            <Link href={"/requests/" + request.id} title="View Details">
                                <Eye className="h-4 w-4" />
                            </Link>
                         </Button>
                        {request.status === 'pending' && request.employeeId === currentUser?.id && (
                           <Button variant="outline" size="sm" onClick={() => openActionDialog(request, 'cancel')} className="p-1 h-auto">
                             <Trash2 className="h-3.5 w-3.5" />
                           </Button>
                        )}
                        {request.status === 'rejected' && request.employeeId === currentUser?.id && (
                          <div className="inline-flex gap-1">
                             <Button variant="outline" size="sm" onClick={() => alert("Revise functionality: This would typically take you to a pre-filled new request form or allow editing the existing one.")} className="p-1 h-auto">
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openActionDialog(request, 'closeOut')} className="p-1 h-auto">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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

      <AlertDialog open={!!requestToAction} onOpenChange={(open) => {
        if (!open) { 
          setRequestToAction(null);
          setActionType(null);
          setCancellationReason('');
        }
      }}>
        {requestToAction && ( 
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionType === 'cancel' ? 'Are you sure you want to cancel this request?' : 'Are you sure you want to close out this rejected request?'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Training: "{requestToAction.trainingTitle}".
                {(actionType === 'cancel' || actionType === 'closeOut') && 
                  "This action will mark the request as cancelled and cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            { (actionType === 'cancel' || actionType === 'closeOut') && (
                <textarea
                  placeholder="Reason for cancellation/closing out (optional)"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full p-2 border rounded-md text-sm min-h-[60px]"
                />
            )}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setRequestToAction(null); setActionType(null); setCancellationReason(''); }}>Back</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleActionConfirm} 
                className={actionType === 'cancel' || actionType === 'closeOut' ? "bg-destructive hover:bg-destructive/90" : undefined}
              >
                {actionType === 'cancel' ? 'Yes, Cancel Request' : 'Yes, Close Out Request'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
