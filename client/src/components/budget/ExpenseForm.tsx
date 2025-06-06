import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the form schema using zod
const expenseFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  amount: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    { message: "Amount must be a positive number" }
  ),
  currency: z.string().default("USD"),
  category: z.string().min(1, { message: "Please select a category" }),
  date: z.date(),
  description: z.string().optional(),
  paidBy: z.string().min(1, { message: "Please select who paid" }),
  splitWith: z.array(z.string()).min(1, { message: "Must select at least one person to split with" }),
  splitMethod: z.string().default("equal"),
  receiptUrl: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

interface ExpenseFormProps {
  tripId: number;
  expense?: any; // Optional: for editing existing expense
  onSuccess: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ tripId, expense, onSuccess }) => {
  const { toast } = useToast();
  const isEditing = !!expense;

  // Fetch trip members for the paidBy dropdown
  const { data: tripMembers, isLoading: loadingMembers } = useQuery<Array<{
    tripId: number;
    userId: number;
    status: string;
    user: {
      id: number;
      username: string;
      name?: string;
      email?: string;
      avatar?: string;
    };
  }>>({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId,
  });

  // Initialize form with default values or existing expense data
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      title: expense?.title || "",
      amount: expense?.amount ? String(expense.amount) : "",
      currency: expense?.currency || "USD",
      category: expense?.category || "other",
      date: expense?.date ? new Date(expense.date) : new Date(),
      description: expense?.description || "",
      paidBy: expense?.paidBy ? String(expense.paidBy) : "",
      splitWith: expense?.splitWith ? expense.splitWith.map(String) : [],
      splitMethod: expense?.splitMethod || "equal",
      receiptUrl: expense?.receiptUrl || "",
    },
  });

  // Set form values after trip members have loaded
  useEffect(() => {
    if (tripMembers && tripMembers.length > 0 && !isEditing) {
      if (!form.getValues("paidBy")) {
        form.setValue("paidBy", String(tripMembers[0]?.userId));
      }
      if (!form.getValues("splitWith") || form.getValues("splitWith").length === 0) {
        // Default to splitting with all members
        form.setValue("splitWith", tripMembers.map(member => String(member.userId)));
      }
    }
  }, [tripMembers, form, isEditing]);

  // Create or update expense mutation
  const mutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      // Format the data for API
      const expenseData = {
        ...data,
        amount: parseFloat(data.amount),
        paidBy: parseInt(data.paidBy),
        splitWith: data.splitWith.map(id => parseInt(id)),
      };

      if (isEditing) {
        // Update existing expense
        return await apiRequest("PUT", `/api/expenses/${expense.id}`, expenseData);
      } else {
        // Create new expense
        return await apiRequest("POST", `/api/trips/${tripId}/expenses`, expenseData);
      }
    },
    onSuccess: () => {
      toast({
        title: isEditing ? "Expense updated" : "Expense added",
        description: isEditing
          ? "Your expense has been updated successfully."
          : "Your expense has been added to the trip.",
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} expense. Please try again.`,
        variant: "destructive",
      });
      console.error("Expense form error:", error);
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    mutation.mutate(data);
  };

  if (loadingMembers) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Hotel Reservation" {...field} />
              </FormControl>
              <FormDescription>
                A clear name for the expense
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input placeholder="0.00" type="number" step="0.01" min="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="JPY">JPY (¥)</SelectItem>
                    <SelectItem value="CAD">CAD (C$)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="accommodation">Accommodation</SelectItem>
                  <SelectItem value="transportation">Transportation</SelectItem>
                  <SelectItem value="food">Food & Drinks</SelectItem>
                  <SelectItem value="activities">Activities</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
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
          name="paidBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid By</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tripMembers && tripMembers.map((member: any) => (
                    <SelectItem 
                      key={member.userId} 
                      value={String(member.userId)}
                    >
                      {member.user?.name || member.user?.username || `User ${member.userId}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="splitWith"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Split With</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  {tripMembers && tripMembers.map((member) => (
                    <div key={member.userId} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`member-${member.userId}`}
                        checked={field.value?.includes(String(member.userId)) || false}
                        onChange={(e) => {
                          const currentValue = field.value || [];
                          const memberIdStr = String(member.userId);
                          if (e.target.checked) {
                            field.onChange([...currentValue, memberIdStr]);
                          } else {
                            field.onChange(currentValue.filter((id: string) => id !== memberIdStr));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <label htmlFor={`member-${member.userId}`} className="text-sm">
                        {member.user?.name || member.user?.username || `User ${member.userId}`}
                      </label>
                    </div>
                  ))}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="splitMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Split Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="How to split the expense" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="equal">Equal Split</SelectItem>
                  <SelectItem value="percentage">Percentage Split</SelectItem>
                  <SelectItem value="fixed">Fixed Amount Split</SelectItem>
                  <SelectItem value="none">No Split (Personal Expense)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                How this expense should be split among trip members
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
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add any additional details here..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt URL (Optional)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="https://..." 
                  type="url" 
                  {...field} 
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Link to a receipt image or document
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Expense" : "Add Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ExpenseForm;