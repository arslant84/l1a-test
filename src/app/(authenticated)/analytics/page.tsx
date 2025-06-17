
"use client";
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
// Import Bar and Pie directly for types, dynamic imports will handle loading
import type { BarChartProps, PieChartProps } from 'recharts';
import { Cell, Pie, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from 'recharts'; // Keep these for non-dynamic parts
import { AlertTriangle, Hourglass, CheckCircle2, XCircle, Banknote, CalendarClock, Users2, Building2, BarChart3, PieChartIcon, Loader2 } from 'lucide-react';
import type { Employee } from '@/lib/types';
import { useMemo } from 'react';
import { format, subMonths, getYear, getMonth, isWithinInterval } from 'date-fns';
import dynamic from 'next/dynamic';

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


export default function AnalyticsPage() {
  const { currentUser, trainingRequests, users } = useAuth();

  const allowedViewRoles: Employee['role'][] = ['thr', 'ceo'];

  const currentYear = getYear(new Date());

  const metrics = useMemo(() => {
    const totalPending = trainingRequests.filter(req => req.status === 'pending').length;
    
    const requestsThisYear = trainingRequests.filter(req => getYear(req.submittedDate) === currentYear);
    const totalApprovedThisYear = requestsThisYear.filter(req => req.status === 'approved').length;
    const totalRejectedThisYear = requestsThisYear.filter(req => req.status === 'rejected').length;

    const approvedCostsThisYear = requestsThisYear
      .filter(req => req.status === 'approved')
      .reduce((sum, req) => sum + req.cost, 0);
    const averageCostApprovedThisYear = totalApprovedThisYear > 0 ? approvedCostsThisYear / totalApprovedThisYear : 0;

    return {
      totalPending,
      totalApprovedThisYear,
      totalRejectedThisYear,
      averageCostApprovedThisYear,
    };
  }, [trainingRequests, currentYear]);

  const requestsByStatusData = useMemo(() => {
    const counts = trainingRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Pending', value: counts.pending || 0, fill: CHART_COLORS.pending },
      { name: 'Approved', value: counts.approved || 0, fill: CHART_COLORS.approved },
      { name: 'Rejected', value: counts.rejected || 0, fill: CHART_COLORS.rejected },
    ].filter(item => item.value > 0);
  }, [trainingRequests]);

  const monthlySubmissionsData = useMemo(() => {
    const twelveMonthsAgo = subMonths(new Date(), 11);
    const monthsData = Array.from({ length: 12 }).map((_, i) => {
      const monthDate = subMonths(new Date(), 11 - i);
      return {
        name: format(monthDate, 'MMM yy'),
        date: monthDate,
        submissions: 0,
      };
    });

    trainingRequests.forEach(req => {
      if (isWithinInterval(req.submittedDate, { start: twelveMonthsAgo, end: new Date() })) {
        const monthName = format(req.submittedDate, 'MMM yy');
        const monthEntry = monthsData.find(m => m.name === monthName);
        if (monthEntry) {
          monthEntry.submissions += 1;
        }
      }
    });
    return monthsData.map(m => ({ name: m.name, Submissions: m.submissions }));
  }, [trainingRequests]);

  const spendingByDepartmentData = useMemo(() => {
    const departmentSpending: Record<string, number> = {};
    const requestsApprovedThisYear = trainingRequests.filter(req => req.status === 'approved' && getYear(req.submittedDate) === currentYear);

    requestsApprovedThisYear.forEach(req => {
      const employee = users.find(u => u.id === req.employeeId);
      if (employee && employee.department) {
        departmentSpending[employee.department] = (departmentSpending[employee.department] || 0) + req.cost;
      }
    });
    
    return Object.entries(departmentSpending)
      .map(([name, totalCost], index) => ({ 
        name, 
        "Total Cost": totalCost,
        fill: `hsl(var(--chart-${(index % 5) + 1}))` // Cycle through chart colors
      }))
      .sort((a,b) => b["Total Cost"] - a["Total Cost"]);
  }, [trainingRequests, users, currentYear]);


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
    <div className="space-y-8 p-1 md:p-2">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Training Analytics</h1>
        <p className="text-muted-foreground">Overview of training request metrics and trends.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
            <Hourglass className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalPending}</div>
            <p className="text-xs text-muted-foreground">Requests awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved This Year</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalApprovedThisYear}</div>
            <p className="text-xs text-muted-foreground">For {currentYear}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected This Year</CardTitle>
            <XCircle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.totalRejectedThisYear}</div>
            <p className="text-xs text-muted-foreground">For {currentYear}</p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cost (Approved)</CardTitle>
            <Banknote className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${metrics.averageCostApprovedThisYear.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Per training, this year</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2">
                <PieChartIcon className="h-6 w-6 text-primary" />
                <CardTitle>Requests by Status (All Time)</CardTitle>
            </div>
            <CardDescription>Distribution of all training requests by their current status.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
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
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
                <CalendarClock className="h-6 w-6 text-primary" />
                <CardTitle>Monthly Submissions (Last 12 Months)</CardTitle>
            </div>
            <CardDescription>Number of training requests submitted per month.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ChartContainer config={chartConfigMonthly} className="min-h-[300px]">
              <DynamicBarChart data={monthlySubmissionsData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} angle={-30} textAnchor="end" height={50} interval={0} fontSize={10} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="Submissions" fill="var(--color-Submissions)" radius={4}>
                   <LabelList dataKey="Submissions" position="top" offset={5} fontSize={10} formatter={(value: number) => value > 0 ? value : ''} />
                </Bar>
              </DynamicBarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
          <CardHeader>
             <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <CardTitle>Approved Spending by Department (This Year)</CardTitle>
            </div>
            <CardDescription>Total cost of approved training requests per department for {currentYear}.</CardDescription>
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
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </DynamicBarChart>
                </ChartContainer>
             ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <BarChart3 className="w-16 h-16 mb-4" />
                    <p className="text-lg">No approved spending data for this year yet.</p>
                </div>
             )}
          </CardContent>
        </Card>
    </div>
  );
}

