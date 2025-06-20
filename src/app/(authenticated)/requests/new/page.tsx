
"use client";
import { NewRequestForm } from '@/components/requests/new-request-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewRequestPage() {
  return (
    <div className="space-y-6 w-full"> {/* Added w-full */}
       <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">New Training Request</h1>
          <p className="text-muted-foreground">Fill out the form below to submit a new training request for approval.</p>
        </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Training Request Details</CardTitle>
          <CardDescription>Please provide all necessary information for your request.</CardDescription>
        </CardHeader>
        <CardContent>
          <NewRequestForm />
        </CardContent>
      </Card>
    </div>
  );
}
