
"use client";
import { useAuth } from '@/hooks/use-auth';
import { ReviewCard } from '@/components/requests/review-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TrainingRequest } from '@/lib/types';
import { AlertTriangle, CheckSquare, ListFilter, Search } from 'lucide-react';
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
  const { currentUser, trainingRequests } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'costHigh' | 'costLow'>('newest');

  const requestsForReview = useMemo(() => {
    let filtered = trainingRequests.filter(req => req.employeeId !== currentUser?.id);
    
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
  }, [trainingRequests, currentUser, searchTerm, sortOrder]);

  const pendingRequests = requestsForReview.filter(req => req.status === 'pending');
  const processedRequests = requestsForReview.filter(req => req.status !== 'pending');

  if (currentUser?.role !== 'supervisor') {
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
            <AlertTriangle className="h-4 w-4" /> Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" /> Processed ({processedRequests.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">
          {pendingRequests.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pendingRequests.map(request => (
                <ReviewCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="mx-auto h-12 w-12 mb-4" />
              <p className="text-xl font-semibold">All caught up!</p>
              <p>No pending requests to review at this time.</p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="processed">
          {processedRequests.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {processedRequests.map(request => (
                <ReviewCard key={request.id} request={request} />
              ))}
            </div>
          ) : (
             <div className="text-center py-12 text-muted-foreground">
               <ListFilter className="mx-auto h-12 w-12 mb-4" />
              <p className="text-xl font-semibold">No Processed Requests</p>
              <p>There are no approved or rejected requests yet.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
