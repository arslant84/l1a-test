
"use client";
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import { CalendarIcon, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, type ChangeEvent } from 'react';
import type { TrainingRequestMode } from '@/lib/types';

const newRequestSchema = z.object({
  purpose: z.string().min(10, { message: "Purpose must be at least 10 characters." }).max(500, { message: "Purpose must be at most 500 characters."}),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  cost: z.coerce.number().min(0, { message: "Cost must be a non-negative number." }),
  mode: z.enum(['online', 'in-person', 'conference'] as [TrainingRequestMode, ...TrainingRequestMode[]], { required_error: "Mode of training is required." }),
  supportingDocuments: z.custom<FileList>().optional()
    .refine(files => !files || Array.from(files).every(file => file.size <= 5 * 1024 * 1024), `Max file size is 5MB.`)
    .refine(files => !files || files.length <= 3, `You can upload a maximum of 3 files.`),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"], 
});

type NewRequestFormValues = z.infer<typeof newRequestSchema>;

export function NewRequestForm() {
  const { addTrainingRequest } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<NewRequestFormValues>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      purpose: '',
      cost: 0,
    },
  });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      setSelectedFiles(filesArray);
      form.setValue('supportingDocuments', event.target.files, { shouldValidate: true });
    }
  };

  const onSubmit: SubmitHandler<NewRequestFormValues> = async (data) => {
    setIsSubmitting(true);
    const documentNames = data.supportingDocuments ? Array.from(data.supportingDocuments).map(file => ({ name: file.name })) : [];
    
    const success = await addTrainingRequest({
      purpose: data.purpose,
      startDate: data.startDate,
      endDate: data.endDate,
      cost: data.cost,
      mode: data.mode,
      supportingDocuments: documentNames,
    });

    if (success) {
      toast({ title: "Request Submitted", description: "Your training request has been successfully submitted." });
      router.push('/dashboard');
    } else {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "Could not submit your request. Please try again.",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Purpose of Training</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe the training and its benefits..." {...field} rows={4} />
              </FormControl>
              <FormDescription>
                Clearly state the objectives and how this training aligns with your role/goals.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Start Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) } // Disable past dates
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < (form.getValues("startDate") || new Date(new Date().setHours(0,0,0,0)))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Cost (USD)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 500" {...field} min="0" step="0.01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mode of Training</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                    <SelectItem value="conference">Conference</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="supportingDocuments"
          render={({ field }) => ( // We don't use field directly for value, but for errors and registration
            <FormItem>
              <FormLabel>Supporting Documents (Optional)</FormLabel>
              <FormControl>
                <Input type="file" multiple onChange={handleFileChange} accept=".pdf,.doc,.docx,.jpg,.png" />
              </FormControl>
              <FormDescription>
                Upload up to 3 files (PDF, DOC, DOCX, JPG, PNG). Max 5MB per file.
              </FormDescription>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium">Selected files:</p>
                  <ul>
                    {selectedFiles.map(file => (
                      <li key={file.name} className="truncate" title={file.name}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                    ))}
                  </ul>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
             <Send className="mr-2 h-4 w-4" />
          )}
          Submit Request
        </Button>
      </form>
    </Form>
  );
}
