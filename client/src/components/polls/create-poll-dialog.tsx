import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusCircle, PieChart } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/use-auth";

// Define the schema for creating a new poll
const createPollSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  options: z.array(z.string()).min(2, "At least 2 options are required"),
  multipleChoice: z.boolean().default(false),
  endDate: z.string().optional().nullable(),
});

type CreatePollFormValues = z.infer<typeof createPollSchema>;

// Poll option component for the create form
const PollOption = ({ 
  index, 
  value, 
  onChange, 
  onRemove 
}: { 
  index: number; 
  value: string; 
  onChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) => {
  return (
    <div className="flex items-center space-x-2 mb-2">
      <Input
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="flex-1"
      />
      {index > 1 && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onRemove(index)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          Remove
        </Button>
      )}
    </div>
  );
};

// Create Poll Dialog Component
export const CreatePollDialog = ({ 
  tripId, 
  children,
  variant = "default"
}: { 
  tripId: number;
  children?: React.ReactNode;
  variant?: "default" | "compact" | "icon";
}) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const form = useForm<CreatePollFormValues>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      title: "",
      description: "",
      options: ["", ""],
      multipleChoice: false,
      endDate: "",
    },
  });
  
  const createPollMutation = useMutation({
    mutationFn: (data: CreatePollFormValues) => {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      
      return fetch(`/api/trips/${tripId}/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            console.error("Poll creation error:", err);
            throw new Error(err.message || 'Failed to create poll');
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      // Invalidate the polls query to refetch the data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating poll:", error);
    }
  });
  
  const handleSubmit = (data: CreatePollFormValues) => {
    // Filter out any empty options
    const filteredOptions = data.options.filter(option => option.trim() !== "");
    
    if (filteredOptions.length < 2) {
      form.setError("options", { message: "At least 2 non-empty options are required" });
      return;
    }
    
    // Remove the endDate field entirely for now until we fix the API
    const { endDate, ...restData } = data;
    const formattedData = {
      ...restData,
      options: filteredOptions
    };
    
    createPollMutation.mutate(formattedData);
  };
  
  const addOption = () => {
    const currentOptions = form.getValues().options;
    form.setValue("options", [...currentOptions, ""]);
  };
  
  const removeOption = (index: number) => {
    const currentOptions = form.getValues().options;
    form.setValue("options", currentOptions.filter((_, i) => i !== index));
  };
  
  const updateOption = (index: number, value: string) => {
    const currentOptions = form.getValues().options;
    currentOptions[index] = value;
    form.setValue("options", currentOptions);
  };
  
  const renderTrigger = () => {
    if (children) {
      return <DialogTrigger asChild>{children}</DialogTrigger>;
    }
    
    switch(variant) {
      case "compact":
        return (
          <DialogTrigger asChild>
            <Button size="sm" className="h-8">
              <PlusCircle className="h-4 w-4 mr-1" />
              Poll
            </Button>
          </DialogTrigger>
        );
      case "icon":
        return (
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <PieChart className="h-5 w-5" />
            </Button>
          </DialogTrigger>
        );
      default:
        return (
          <DialogTrigger asChild>
            <Button className="w-full">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create a Poll
            </Button>
          </DialogTrigger>
        );
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {renderTrigger()}
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a New Poll</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poll Question</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Where should we go for dinner?" />
                  </FormControl>
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
                      {...field} 
                      placeholder="Add some context to your poll"
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div>
              <FormLabel>Options</FormLabel>
              {form.watch("options").map((option, index) => (
                <PollOption
                  key={index}
                  index={index}
                  value={option}
                  onChange={updateOption}
                  onRemove={removeOption}
                />
              ))}
              
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addOption}
                className="mt-2"
              >
                Add Option
              </Button>
              {form.formState.errors.options && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.options.message}</p>
              )}
            </div>
            
            <FormField
              control={form.control}
              name="multipleChoice"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between space-y-0 rounded-md border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Allow Multiple Choices</FormLabel>
                    <FormDescription>Participants can select multiple options</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date (Optional)</FormLabel>
                  <FormDescription>When should this poll close?</FormDescription>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPollMutation.isPending}
              >
                {createPollMutation.isPending ? "Creating..." : "Create Poll"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};