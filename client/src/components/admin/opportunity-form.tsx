import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Publication } from "@shared/schema";

// Industry options based on the screenshot
const industryOptions = [
  "Capital Markets",
  "Crypto",
  "Accounting",
  "Mortgage",
  "Culinary",
  "Fitness",
  "Politics",
  "Real Estate",
  "Technology",
  "Healthcare",
  "Education",
  "Entertainment"
];

// Request types based on the screenshot
const requestTypeOptions = [
  "Experts",
  "Guests",
  "Speakers",
  "Products",
  "Man On The Street"
];

// Define the form schema with validation
const opportunitySchema = z.object({
  title: z.string().min(50, "Title must be at least 50 characters").max(80, "Title must be 80 characters or less"),
  description: z.string().min(1, "Description is required"),
  publicationId: z.coerce.number().min(1, "Publication is required"),
  requestType: z.string().min(1, "Request type is required"),
  industry: z.string().min(1, "Industry is required"),
  tier: z.string().min(1, "Tier is required"),
  minimumBid: z.coerce.number().min(1, "Minimum bid is required"),
  deadline: z.date({
    required_error: "Deadline is required",
  }),
  tags: z.string().optional()
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface OpportunityFormProps {
  onSubmit: (values: OpportunityFormValues) => Promise<void>;
  isEdit?: boolean;
  defaultValues?: Partial<OpportunityFormValues>;
}

export function OpportunityForm({ onSubmit, isEdit = false, defaultValues }: OpportunityFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Fetch publications for the dropdown
  const { data: publications } = useQuery<Publication[]>({
    queryKey: ["/api/publications"],
    staleTime: 60000, // 1 minute
  });

  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunitySchema),
    defaultValues: defaultValues || {
      title: "",
      description: "",
      publicationId: undefined,
      requestType: "",
      industry: "",
      tier: "",
      minimumBid: undefined,
      tags: "",
    },
  });

  const handleSubmit = async (values: OpportunityFormValues) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.reset();
      toast({
        title: `Opportunity ${isEdit ? "updated" : "created"} successfully`,
        description: `The PR opportunity was ${isEdit ? "updated" : "added to the queue"}.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEdit ? "Edit PR Opportunity" : "Add New PR Opportunity"}</CardTitle>
        <CardDescription>
          {isEdit 
            ? "Update the details for this PR opportunity" 
            : "Add a new PR opportunity to the marketplace"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="What kind of expert are you looking for?" 
                        {...field} 
                        maxLength={80}
                        minLength={50}
                        className="pr-16"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm font-medium z-10">
                        <span className={`px-2 py-1 rounded-md ${
                          field.value?.length < 50 
                            ? "bg-red-100 text-red-700 border border-red-300"
                            : field.value?.length > 70 
                            ? "bg-orange-100 text-orange-700 border border-orange-300" 
                            : "bg-green-100 text-green-700 border border-green-300"
                        }`}>
                          {field.value?.length || 0}/80
                        </span>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Create a descriptive title between 50-80 characters for consistent card display
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Be as specific as possible about the type of expertise you need!" 
                      rows={6}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="publicationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Publication</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select publication" />
                        </SelectTrigger>
                        <SelectContent>
                          {publications?.map((publication) => (
                            <SelectItem key={publication.id} value={publication.id.toString()}>
                              {publication.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="requestType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Type</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select request type" />
                        </SelectTrigger>
                        <SelectContent>
                          {requestTypeOptions.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industryOptions.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tier Level</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Tier 1">Tier 1 (Premium)</SelectItem>
                          <SelectItem value="Tier 2">Tier 2 (Standard)</SelectItem>
                          <SelectItem value="Tier 3">Tier 3 (Basic)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Higher tier opportunities are more valuable and typically have higher minimum bids
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minimumBid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Bid (USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" {...field} />
                    </FormControl>
                    <FormDescription>
                      Starting bid amount for this opportunity
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Deadline</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
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
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      When this opportunity closes for pitches
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter tags separated by commas" {...field} />
                  </FormControl>
                  <FormDescription>
                    Add relevant keywords to help users find this opportunity
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : isEdit ? "Update Opportunity" : "Create Opportunity"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}