
"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import type { Employee } from '@/lib/types';

const userRoles: [Employee['role'], ...Employee['role'][]] = ['employee', 'supervisor', 'thr', 'ceo', 'cm'];

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  role: z.enum(userRoles, { required_error: "You must select a role." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      role: 'employee',
    },
  });

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoggingIn(true);
    const success = await login(data.email, data.role);
    if (success) {
      toast({ title: "Login Successful", description: "Welcome back!" });
      router.replace('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Invalid email or role. Please try again with a mock user email.",
      });
      setIsLoggingIn(false);
    }
  };
  
  const roleDisplayNames: Record<Employee['role'], string> = {
    employee: 'Employee',
    supervisor: 'Supervisor',
    thr: 'THR',
    ceo: 'CEO',
    cm: 'Contract Manager (CM)'
  };


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="items-center text-center">
          <Logo className="mb-4" />
          <CardTitle className="font-headline text-2xl">Sign In</CardTitle>
          <CardDescription>Access your L1A Approve account. Use a mock email.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="e.g., alice@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Select Your Role</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-x-4 gap-y-2"
                      >
                        {userRoles.map(roleValue => (
                          <FormItem key={roleValue} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={roleValue} />
                            </FormControl>
                            <FormLabel className="font-normal">
                              {roleDisplayNames[roleValue]}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col items-start text-xs text-muted-foreground space-y-1">
           <p>Mock emails:</p>
           <ul className="list-disc list-inside pl-2">
            <li>alice@example.com (employee)</li>
            <li>carol@example.com (supervisor)</li>
            <li>tom@example.com (thr)</li>
            <li>grace@example.com (ceo)</li>
            <li>charles@example.com (cm)</li>
           </ul>
        </CardFooter>
      </Card>
    </div>
  );
}
