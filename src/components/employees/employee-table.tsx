
"use client";
import type { Employee } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import React from 'react'; // Import React

interface EmployeeTableProps {
  employees: Employee[];
}

const roleDisplayNames: Record<Employee['role'], string> = {
  employee: 'Employee',
  supervisor: 'Supervisor',
  thr: 'THR',
  ceo: 'CEO',
  cm: 'Capability Management'
};

function EmployeeTableComponent({ employees }: EmployeeTableProps) {
  const getInitials = (name: string) => {
    const names = name.split(' ');
    let initials = names[0].substring(0, 1).toUpperCase();
    if (names.length > 1) {
      initials += names[names.length - 1].substring(0, 1).toUpperCase();
    }
    return initials;
  };

  return (
    <ScrollArea className="h-[calc(100vh-22rem)] sm:h-auto sm:max-h-[70vh] rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-center">Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={employee.avatarUrl} alt={employee.name} data-ai-hint="employee avatar" />
                    <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{employee.name}</span>
                </div>
              </TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.department}</TableCell>
              <TableCell className="text-center">
                <Badge variant={employee.role === 'supervisor' || employee.role === 'cm' ? 'default' : 'secondary'}>
                  {roleDisplayNames[employee.role] || employee.role}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

export const EmployeeTable = React.memo(EmployeeTableComponent);
