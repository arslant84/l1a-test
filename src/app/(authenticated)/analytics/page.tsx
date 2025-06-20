
"use client";
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import type { BarChartProps, PieChartProps } from 'recharts';
import { Cell, Pie, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts';
import { AlertTriangle, Hourglass, CheckCircle2, XCircle, Banknote, CalendarClock, Users2, Building2, BarChart3, PieChartIcon, Loader2, CalendarRange } from 'lucide-react';
import type { Employee, TrainingRequest } from '@/lib/types';
import React, { useState, useMemo } from 'react';
import { format, subMonths, getYear, getMonth, isWithinInterval, startOfYear, endOfYear, subYears, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import dynamic from 'next/dynamic';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CHART_COLORS = {
  pending: "hsl(var(--chart-1))",
  approved: "hsl(var(--chart-2))",
  rejected: "hsl(var(--chart-3))",
  department1: "hsl(var(--chart-4))",
  department2: "hsl(var(--chart-5))",
};

const DynamicBarChart = dynamic(() => import('recharts').then(mod => mod.BarChart) as Promise<React.ComponentType<BarChartProps>>, {
  loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading chart...</span></div>,
  ssr: false
});

const DynamicPieChart = dynamic(() => import('recharts').then(mod => mod.PieChart) as Promise<React.ComponentType<PieChartProps>>, {
  loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <span className="ml-2">Loading chart...</span></div>,
  ssr: false
});

type PeriodValue = 'current_year' | 'last_year' | 'last_12_months' | 'last_6_months' | 'all_time';

interface PeriodOption {
  value: PeriodValue;
  label: string;
}

const periodOptions: PeriodOption[] = [
  { value: 'current_year', label: 'Current Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'last_12_months', label: 'Last 12 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'all_time', label: 'All Time' },
];

function getDateRangeForPeriod(period: PeriodValue): { start: Date | null, end: Date | null } {
  const now = new Date();
  switch (period) {
    case 'current_year':
      return { start: startOfYear(now), end: now };
    case 'last_year':
      const lastYearDate = subYears(now, 1);
      return { start: startOfYear(lastYearDate), end: endOfYear(lastYearDate) };
    case 'last_12_months':
      return { start: subMonths(now, 11), end: now }; // start from beginning of the month 12 months ago
    case 'last_6_months':
      return { start: subMonths(now, 5), end: now }; // start from beginning of the month 6 months ago
    case 'all_time':
    default:
      return { start: null, end: null };
  }
}

function getPeriodDisplayLabel(period: PeriodValue): string {
  const now = new Date();
  switch (period) {
    case 'current_year':
      return `Current Year (${getYear(now)})`;
    case 'last_year':
      return `Last Year (${getYear(subYears(now, 1))})`;
    case 'last_12_months':
      return 'Last 12 Months';
    case 'last_6_months':
      return 'Last 6 Months';
    case 'all_time':
    default:
      return 'All Time';
  }
}


export default function AnalyticsPage() {
  const { currentUser, trainingRequests, users } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodValue>('current_year');

  const allowedViewRoles: Employee['role'][] = ['thr', 'ceo'];

  const dateRange = useMemo(() => getDateRangeForPeriod(selectedPeriod), [selectedPeriod]);
  const periodLabel = useMemo(() => getPeriodDisplayLabel(selectedPeriod), [selectedPeriod]);

  const filteredRequests = useMemo(() => {
    if (!dateRange.start || !dateRange.end) {
      return trainingRequests; // All Time
    }
    return trainingRequests.filter(req => 
      isWithinInterval(req.submittedDate, { start: dateRange.start!, end: dateRange.end! })
    );
  }, [trainingRequests, dateRange]);


  const metrics = useMemo(() => {
    const totalPending = trainingRequests.filter(req => req.status === 'pending').length; // Live pending, not period dependent
    
    const relevantRequests = filteredRequests; // Use period-filtered requests
    const totalApprovedInPeriod = relevantRequests.filter(req => req.status === 'approved').length;
    const totalRejectedInPeriod = relevantRequests.filter(req => req.status === 'rejected').length;

    const approvedCostsInPeriod = relevantRequests
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + req.cost, 0);
    const averageCostApprovedInPeriod = totalApprovedInPeriod > 0 ? approvedCostsInPeriod / totalApprovedInPeriod : 0;

    return {
      totalPending,
      totalApprovedInPeriod,
      totalRejectedInPeriod,
      averageCostApprovedInPeriod,
    };
  }, [trainingRequests, filteredRequests]);

  const requestsByStatusData = useMemo(() => {
    const counts = filteredRequests.reduce((acc, req) => { // Use period-filtered requests
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: counts.pending || 0, fill: CHART_COLORS.pending },
      { name: 'Approved', value: counts.approved || 0, fill: CHART_COLORS.approved },
      { name: 'Rejected', value: counts.rejected || 0, fill: CHART_COLORS.rejected },
    ].filter(item => item.value > 0);
  }, [filteredRequests]);

  const monthlySubmissionsData = useMemo(() => {
    if (selectedPeriod === 'all_time') {
      // Aggregate by year for "All Time"
      const yearlyCounts: Record<string, number> = {};
      trainingRequests.forEach(req => {
        const year = getYear(req.submittedDate).toString();
        yearlyCounts[year] = (yearlyCounts[year] || 0) + 1;
      });
      return Object.entries(yearlyCounts)
        .map(([year, count]) => ({ name: year, Submissions: count }))
        .sort((a,b) => parseInt(a.name) - parseInt(b.name));
    }

    const { start, end } = dateRange;
    if (!start || !end) return [];

    const monthsInPeriod = eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });
    const monthsData = monthsInPeriod.map(monthDate => ({
      name: format(monthDate, 'MMM yy'),
      date: monthDate,
      submissions: 0,
    }));

    filteredRequests.forEach(req => { // Use period-filtered requests
      const monthName = format(req.submittedDate, 'MMM yy');
      const monthEntry = monthsData.find(m => m.name === monthName);
      if (monthEntry) {
        monthEntry.submissions += 1;
      }
    });
    return monthsData.map(m => ({ name: m.name, Submissions: m.submissions }));
  }, [trainingRequests, filteredRequests, dateRange, selectedPeriod]);


  const spendingByDepartmentData = useMemo(() => {
    const departmentSpending: Record<string, number> = {};
    const requestsApprovedInPeriod = filteredRequests.filter(req => req.status === 'approved'); // Use period-filtered requests

    requestsApprovedInPeriod.forEach(req => {
      const employee = users.find(u => u.id === req.employeeId);
      if (employee && employee.department) {
        departmentSpending[employee.department] = (departmentSpending[employee.department] || 0) + req.cost;
      }
    });
    
    return Object.entries(departmentSpending)
      .map(([name, totalCost], index) => ({ 
        name, 
        "Total Cost": totalCost,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`
      }))
      .sort((a,b) => b["Total Cost"] - a["Total Cost"]);
  }, [filteredRequests, users]);


  if (!currentUser || !allowedViewRoles.includes(currentUser.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">This page is accessible to THR and CEO roles only.</p>
      </div>
    );
  }

  const chartConfigStatus = {
    value: { label: "Requests" },
    Pending: { label: "Pending", color: CHART_COLORS.pending },
    Approved: { label: "Approved", color: CHART_COLORS.approved },
    Rejected: { label: "Rejected", color: CHART_COLORS.rejected },
  } as const;

  const chartConfigMonthly = {
    Submissions: { label: "Submissions", color: "hsl(var(--chart-1))" },
  } as const;
  
  const chartConfigSpending = {
     "Total Cost": { label: "Total Cost", color: "hsl(var(--chart-1))" },
  } as const;


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Training Analytics</h1>
          <p className="text-muted-foreground">Overview of training request metrics and trends.</p>
        </div>
         <div className="flex items-center gap-2 w-full sm:w-auto">
           <CalendarRange className="h-5 w-5 text-muted-foreground" />
           <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodValue)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
         </div>
      </div>


      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalPending}</div>
            <p className="text-xs text-muted-foreground">Requests awaiting approval (live)</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalApprovedInPeriod}</div>
            <p className="text-xs text-muted-foreground">Submitted in {periodLabel}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalRejectedInPeriod}</div>
            <p className="text-xs text-muted-foreground">Submitted in {periodLabel}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cost (Approved)</CardTitle>
            <Banknote className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${metrics.averageCostApprovedInPeriod.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Submitted & Approved in {periodLabel}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2">
                <PieChartIcon className="h-6 w-6 text-primary" />
                <CardTitle>Requests by Status</CardTitle>
            </div>
            <CardDescription>Distribution of training requests submitted in {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {requestsByStatusData.length > 0 ? (
                <ChartContainer config={chartConfigStatus} className="min-h-[300px]">
                <DynamicPieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie data={requestsByStatusData} dataKey="value" nameKey="name" labelLine={false} label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                    {requestsByStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent />} />
                </DynamicPieChart>
                </ChartContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <PieChartIcon className="w-16 h-16 mb-4" />
                    <p className="text-lg">No request data for this period.</p>
                </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-primary" />
                <CardTitle>
                    {selectedPeriod === 'all_time' ? 'Yearly Submissions' : 'Monthly Submissions'}
                </CardTitle>
            </div>
            <CardDescription>Number of training requests submitted in {periodLabel}.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {monthlySubmissionsData.length > 0 ? (
                <ChartContainer config={chartConfigMonthly} className="min-h-[300px]">
                <DynamicBarChart data={monthlySubmissionsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={selectedPeriod === 'all_time' ? 0 : -30} textAnchor={selectedPeriod === 'all_time' ? "middle" : "end"} height={selectedPeriod === 'all_time' ? 30 : 50} interval={0} fontSize={10} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="Submissions" fill="var(--color-Submissions)" radius={4}>
                    <LabelList dataKey="Submissions" position="top" offset={5} fontSize={10} formatter={(value: number) => value > 0 ? value : ''} />
                    </Bar>
                </DynamicBarChart>
                </ChartContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <CalendarClock className="w-16 h-16 mb-4" />
                    <p className="text-lg">No submission data for this period.</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <CardTitle>Approved Spending by Department</CardTitle>
            </div>
            <CardDescription>Total cost of approved training requests (submitted in {periodLabel}) per department.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
             {spendingByDepartmentData.length > 0 ? (
                <ChartContainer config={chartConfigSpending} className="min-h-[350px]">
                  <DynamicBarChart data={spendingByDepartmentData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                     <Bar dataKey="Total Cost" radius={4}>
                      {spendingByDepartmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <LabelList dataKey="Total Cost" position="right" offset={8} fontSize={10} formatter={(value: number) => `$${value.toLocaleString()}`} />
                    </Bar>
                    {/* Disabling legend for this chart as colors are distinct per bar already */}
                    {/* <ChartLegend content={<ChartLegendContent nameKey="name" />} /> */} 
                  </DynamicBarChart>
                </ChartContainer>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BarChart3 className="w-16 h-16 mb-4" />
                    <p className="text-lg">No approved spending data for this period.</p>
                </div>
             )}
          </CardContent>
        </Card>
    </div>
  );
}

