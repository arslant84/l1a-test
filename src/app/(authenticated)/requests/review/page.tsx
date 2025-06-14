
"use client";
import { useAuth } from '@/hooks/use-auth';
import { ReviewCard } from '@/components/requests/review-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TrainingRequest, Employee } from '@/lib/types';
import { AlertTriangle, CheckSquare, ListFilter, Search, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export default function ReviewRequestsPage() {
  const { currentUser, trainingRequests, users } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'costHigh' | 'costLow'>('newest');

  const allowedReviewRoles: Employee['role'][] = ['supervisor', 'thr', 'ceo'];

  const requestsForReview = useMemo(() => {
    if (!currentUser || !allowedReviewRoles.includes(currentUser.role)) return [];

    let filtered = trainingRequests.filter(req => {
      if (req.status !== 'pending') return false;

      // Check if the request's current approval step matches the current user's role
      if (req.currentApprovalStep === currentUser.role) {
        // If the current user is a supervisor, there's an additional check:
        // The request's employee must be managed by this supervisor.
        if (currentUser.role === 'supervisor') {
          const employee = users.find(u => u.id === req.employeeId);
          // Ensure employee and relevant IDs exist before comparing
          if (employee && typeof employee.managerId === 'string' && typeof currentUser.id === 'string') {
            return employee.managerId === currentUser.id;
          }
          return false; // Employee not found or IDs are problematic
        }
        return true; // For THR and CEO, if the step matches their role, it's for them.
      }
      return false; // Not pending for the current user's role/step.
    });
    
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.trainingTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (sortOrder) {
      case 'newest':
        filtered.sort((a,b) => b.submittedDate.getTime() - a.submittedDate.getTime());
        break;
      case 'oldest':
        filtered.sort((a,b) => a.submittedDate.getTime() - b.submittedDate.getTime());
        break;
      case 'costHigh':
        filtered.sort((a,b) => b.cost - a.cost);
        break;
      case 'costLow':
        filtered.sort((a,b) => a.cost - b.cost);
        break;
    }
    return filtered;
  }, [trainingRequests, currentUser, users, searchTerm, sortOrder]);

   const processedRequests = useMemo(() => {
    if (!currentUser || !allowedReviewRoles.includes(currentUser.role)) return [];
    
    let filtered = trainingRequests.filter(req => {
      // Condition 1: Request is completed (not pending), and currentUser was involved in the approval chain.
      if (req.status !== 'pending' && req.approvalChain.some(action => action.userId === currentUser.id)) {
        return true;
      }

      // Condition 2: Request is pending, but NOT specifically for the currentUser to action.
      if (req.status === 'pending') {
        let isAwaitingThisUserDirectly = false;
        if (req.currentApprovalStep === currentUser.role) {
          if (currentUser.role === 'supervisor') {
            const employee = users.find(u => u.id === req.employeeId);
            if (employee && typeof employee.managerId === 'string' && typeof currentUser.id === 'string') {
              isAwaitingThisUserDirectly = employee.managerId === currentUser.id;
            }
          } else {
            // For THR/CEO, if the step matches their role, it's directly for them.
            isAwaitingThisUserDirectly = true;
          }
        }
        
        // If it's NOT awaiting this user directly (e.g. wrong supervisor, or different role step), include in "other".
        if (!isAwaitingThisUserDirectly) {
          return true;
        }
      }
      return false;
    });

    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.trainingTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
     switch (sortOrder) {
      case 'newest':
        // For processed requests, sorting by lastUpdated might be more relevant
        filtered.sort((a,b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
        break;
      case 'oldest':
        filtered.sort((a,b) => a.lastUpdated.getTime() - b.lastUpdated.getTime());
        break;
      case 'costHigh':
        filtered.sort((a,b) => b.cost - a.cost);
        break;
      case 'costLow':
        filtered.sort((a,b) => a.cost - b.cost);
        break;
    }
    return filtered;
  }, [trainingRequests, currentUser, users, searchTerm, sortOrder]);


  if (!currentUser || !allowedReviewRoles.includes(currentUser.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Review Training Requests</h1>
        <p className="text-muted-foreground">Approve or reject training requests submitted by employees.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by employee or training title..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <ListFilter className="h-5 w-5 text-muted-foreground" />
          <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="costHigh">Cost: High to Low</SelectItem>
              <SelectItem value="costLow">Cost: Low to High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-flex mb-4">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" /> Awaiting My Action ({requestsForReview.length})
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> All Other Requests ({processedRequests.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {requestsForReview.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {requestsForReview.map(request => (
                <ReviewCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <CheckSquare className="mx-auto h-16 w-16 mb-6" />
              <p className="text-xl font-semibold mb-2">All caught up!</p>
              <p>No requests awaiting your action at this time.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="processed">
          {processedRequests.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {processedRequests.map(request => (
                <ReviewCard key={request.id} request={request} isReadOnly={true} />
              ))}
            </div>
          ) : (
             <div className="text-center py-16 text-muted-foreground">
               <ListFilter className="mx-auto h-16 w-16 mb-6" />
              <p className="text-xl font-semibold mb-2">No Other Requests</p>
              <p>There are no other requests to display at this time.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
