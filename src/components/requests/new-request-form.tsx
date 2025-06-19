
"use client";
import { useForm, type SubmitHandler } from 'react-hook-form';
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
import { 
  CalendarIcon, Loader2, Send, UserCircle, Briefcase, Mail, Building, Award, 
  CalendarCheck2, LayoutList, MapPin, DollarSign, FileText, BookOpen, MapPinned, History, Paperclip, CalendarDays,
  Tag, PackagePlus, Banknote, Landmark // Icons for new fields
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, type ChangeEvent } from 'react';
import type { TrainingRequestLocationMode, ProgramType } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const locationModes: [TrainingRequestLocationMode, ...TrainingRequestLocationMode[]] = ['online', 'in-house', 'local', 'overseas'];
const programTypes: [ProgramType, ...ProgramType[]] = [
  'course', 
  'conference/seminar/forum', 
  'on-the-job attachment', 
  'skg/fsa', 
  'hse', 
  'functional', 
  'leadership', 
  'specialized', 
  'others'
];

const newRequestSchema = z.object({
  trainingTitle: z.string().min(5, { message: "Training title must be at least 5 characters." }).max(200, { message: "Training title must be at most 200 characters."}),
  justification: z.string().min(10, { message: "Justification must be at least 10 characters." }).max(1000, { message: "Justification must be at most 1000 characters."}),
  organiser: z.string().min(3, { message: "Organiser must be at least 3 characters." }).max(200),
  venue: z.string().min(3, { message: "Venue must be at least 3 characters." }).max(200),
  startDate: z.date({ required_error: "Start date is required." }),
  endDate: z.date({ required_error: "End date is required." }),
  cost: z.coerce.number().min(0, { message: "Course Fee must be a non-negative number." }), // Labelled as Course Fee
  mode: z.enum(locationModes, { required_error: "Mode of training is required." }),
  programType: z.enum(programTypes, { required_error: "Type of program is required." }),
  previousRelevantTraining: z.string().max(1000, {message: "Previous training details must be at most 1000 characters."}).optional(),
  supportingDocuments: z.custom<FileList>().optional()
    .refine(files => !files || Array.from(files).every(file => file.size <= 5 * 1024 * 1024), `Max file size is 5MB.`)
    .refine(files => !files || files.length <= 3, `You can upload a maximum of 3 files.`),
  // New fields from L1A PDF
  costCenter: z.string().optional().refine(val => !val || val.length <= 100, { message: "Cost center must be at most 100 characters." }),
  estimatedLogisticCost: z.coerce.number().min(0, {message: "Estimated logistic cost must be non-negative."}).optional(),
  departmentApprovedBudget: z.coerce.number().min(0, {message: "Department approved budget must be non-negative."}).optional(),
  departmentBudgetBalance: z.coerce.number().min(0, {message: "Department budget balance must be non-negative."}).optional(),
}).refine(data => data.endDate >= data.startDate, {
  message: "End date cannot be before start date.",
  path: ["endDate"], 
});

type NewRequestFormValues = z.infer<typeof newRequestSchema>;

interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}

const InfoRow: React.FC<InfoRowProps> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center space-x-3">
    <Icon className="h-5 w-5 text-muted-foreground" />
    <span className="font-medium text-sm text-muted-foreground">{label}:</span>
    <span className="text-sm">{value || 'N/A'}</span>
  </div>
);


export function NewRequestForm() {
  const { currentUser, addTrainingRequest } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const form = useForm<NewRequestFormValues>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      trainingTitle: '',
      justification: '',
      organiser: '',
      venue: '',
      cost: 0,
      previousRelevantTraining: '',
      costCenter: '',
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
    
    // Ensure all optional numeric fields are passed as numbers or undefined
    const requestPayload = {
      trainingTitle: data.trainingTitle,
      justification: data.justification,
      organiser: data.organiser,
      venue: data.venue,
      startDate: data.startDate,
      endDate: data.endDate,
      cost: data.cost,
      mode: data.mode,
      programType: data.programType,
      previousRelevantTraining: data.previousRelevantTraining,
      supportingDocuments: documentNames,
      costCenter: data.costCenter,
      estimatedLogisticCost: data.estimatedLogisticCost,
      departmentApprovedBudget: data.departmentApprovedBudget,
      departmentBudgetBalance: data.departmentBudgetBalance,
    };

    const success = await addTrainingRequest(requestPayload);

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
  
  const programTypeDisplayNames: Record<ProgramType, string> = {
    'course': 'Course',
    'conference/seminar/forum': 'Conference/Seminar/Forum',
    'on-the-job attachment': 'On-the-Job Attachment',
    'skg/fsa': 'SKG/FSA',
    'hse': 'HSE',
    'functional': 'Functional',
    'leadership': 'Leadership',
    'specialized': 'Specialized',
    'others': 'Others',
  };

  const locationModeDisplayNames: Record<TrainingRequestLocationMode, string> = {
    'online': 'Online',
    'in-house': 'In-House',
    'local': 'Local (External)',
    'overseas': 'Overseas (External)',
  };


  return (
    <>
      {currentUser && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-headline">A. Nominee's Personal Particulars</CardTitle>
            <CardDescription>This information is based on your current profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
              <InfoRow icon={UserCircle} label="Name" value={currentUser.name} />
              <InfoRow icon={Briefcase} label="Staff No." value={currentUser.staffNo} />
              <InfoRow icon={Briefcase} label="Position" value={currentUser.position} />
              <InfoRow icon={Building} label="Department" value={currentUser.department} />
              <InfoRow icon={Mail} label="Email" value={currentUser.email} />
              <InfoRow icon={Award} label="Academic Qualification" value={currentUser.academicQualification} />
              <InfoRow icon={CalendarCheck2} label="Date Joined" value={currentUser.dateJoined ? format(currentUser.dateJoined, "PPP") : 'N/A'} />
            </div>
          </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold mb-1 font-headline">B. Training Proposal Particulars</h2>
      <p className="text-sm text-muted-foreground mb-6">Please provide all necessary information for your request.</p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="trainingTitle"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <FormLabel>Training Title / Programme Name</FormLabel>
                </div>
                <FormControl>
                  <Input placeholder="e.g., Advanced Project Management Workshop" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="mode"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Program Location</FormLabel>
                  </div>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {locationModes.map(value => (
                        <SelectItem key={value} value={value}>{locationModeDisplayNames[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="programType" // Also serves for "Course Category"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <LayoutList className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Type of Program / Course Category</FormLabel>
                  </div>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select program type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                       {programTypes.map(value => (
                        <SelectItem key={value} value={value}>{programTypeDisplayNames[value]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
             <FormField
              control={form.control}
              name="costCenter"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Cost Center (Optional)</FormLabel>
                  </div>
                  <FormControl>
                    <Input placeholder="e.g., CC12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cost" // This is Course Fee
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Course Fee (USD)</FormLabel>
                  </div>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 500" {...field} min="0" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Dates: Start Date</FormLabel>
                  </div>
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
                        disabled={(date) => date < new Date(new Date().setHours(0,0,0,0)) }
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
                  <div className="flex items-center gap-2 mb-2">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>End Date</FormLabel>
                  </div>
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
          
           <FormField
            control={form.control}
            name="estimatedLogisticCost"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <PackagePlus className="h-5 w-5 text-muted-foreground" />
                  <FormLabel>Estimated Logistic Cost (USD - Optional)</FormLabel>
                </div>
                <FormControl>
                  <Input type="number" placeholder="e.g., 100" {...field} min="0" step="0.01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <FormField
              control={form.control}
              name="organiser" // Training Provider
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Training Provider</FormLabel>
                  </div>
                  <FormControl>
                    <Input placeholder="e.g., TechSeminars Inc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="departmentApprovedBudget"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Dep. Approved Budget (USD - Optional)</FormLabel>
                  </div>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5000" {...field} min="0" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
             <FormField
              control={form.control}
              name="venue"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Venue</FormLabel>
                  </div>
                  <FormControl>
                    <Input placeholder="e.g., Online, New York City, Local Training Center" {...field} />
                  </FormControl>
                   <FormDescription>
                    For 'Online' or 'In-House' mode, specify platform or building name.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="departmentBudgetBalance"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-muted-foreground" />
                    <FormLabel>Dep. Budget Balance (USD - Optional)</FormLabel>
                  </div>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 2500" {...field} min="0" step="0.01" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="justification"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <FormLabel>Justification for Training</FormLabel>
                </div>
                <FormControl>
                  <Textarea placeholder="Describe the training benefits and how it aligns with your role/goals..." {...field} rows={4} />
                </FormControl>
                <FormDescription>
                  Clearly state the objectives and expected outcomes (this will be used for Job Relevancy/Career Development sections in L1A).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="previousRelevantTraining"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  <FormLabel>Previous Relevant Training (Past 3 years - Optional)</FormLabel>
                </div>
                <FormControl>
                  <Textarea placeholder="List any relevant training attended in the last 3 years..." {...field} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="supportingDocuments"
            render={() => ( 
              <FormItem>
                <div className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                  <FormLabel>Supporting Documents (Optional)</FormLabel>
                </div>
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
    </>
  );
}

