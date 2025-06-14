
"use client";
import { useAuth } from '@/hooks/use-auth';
import type { TrainingRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle, Info } from 'lucide-react';

export default function DashboardPage() {
  const { currentUser, trainingRequests } = useAuth();

  const userRequests = trainingRequests.filter(req => req.employeeId === currentUser?.id)
    .sort((a,b) => b.submittedDate.getTime() - a.submittedDate.getTime());

  const getStatusVariant = (status: TrainingRequest['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved':
        return 'default'; // default is primary based on theme
      case 'pending':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  return (
    <div className="space-y-6">
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
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Info className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold">No Requests Found</p>
              <p className="text-muted-foreground mb-6">You haven't submitted any training requests yet.</p>
              <Button asChild variant="outline">
                <Link href="/requests/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Submit Your First Request
                </Link>
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-20rem)] sm:h-auto sm:max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium max-w-xs truncate" title={request.purpose}>{request.purpose}</TableCell>
                      <TableCell>{format(request.startDate, 'MMM d, yyyy')} - {format(request.endDate, 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">${request.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(request.status)} className="capitalize">
                          {request.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(request.submittedDate, 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
