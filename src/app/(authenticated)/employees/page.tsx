
"use client";
import { useAuth } from '@/hooks/use-auth';
import { EmployeeTable } from '@/components/employees/employee-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Search, Users, AlertTriangle } from 'lucide-react';
import type { Employee } from '@/lib/types';

export default function EmployeeDirectoryPage() {
  const { users, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const allowedViewRoles: Employee['role'][] = ['supervisor', 'thr', 'ceo'];

  if (!currentUser || !allowedViewRoles.includes(currentUser.role)) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is accessible to Supervisors, THR, and CEO roles only.</p>
      </div>
    );
  }


  return (
    <div className="space-y-6 w-full"> {/* Added w-full */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Employee Directory</h1>
          <p className="text-muted-foreground">Browse and search for employees within the organization.</p>
        </div>
         <div className="relative w-full sm:w-auto sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search employees..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
           <div className="flex items-center gap-2">
             <Users className="h-6 w-6 text-primary" />
             <CardTitle>All Employees ({filteredEmployees.length})</CardTitle>
           </div>
          <CardDescription>List of all registered employees.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length > 0 ? (
            <EmployeeTable employees={filteredEmployees} />
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="mx-auto h-16 w-16 mb-6" />
              <p className="text-xl font-semibold mb-2">No Employees Found</p>
              <p>Your search for "{searchTerm}" did not match any employees.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
