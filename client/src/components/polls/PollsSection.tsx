import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { PlusCircle, Info, AlertCircle, Check, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import UserAvatar from "@/components/user-avatar";
import { apiRequest } from "@/lib/queryClient";

interface PollsSectionProps {
  tripId: number;
}

// Define the schema for creating a new poll
const createPollSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  options: z.array(z.string()).min(2, "At least 2 options are required"),
  multipleChoice: z.boolean().default(false),
  endDate: z.string().optional(),
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
const CreatePollDialog = ({ tripId }: { tripId: number }) => {
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
      return apiRequest("POST", `/api/trips/${tripId}/polls`, data);
    },
    onSuccess: () => {
      // Invalidate the polls query to refetch the data
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
      setOpen(false);
      form.reset();
    },
  });
  
  const handleSubmit = (data: CreatePollFormValues) => {
    // Filter out any empty options
    const filteredOptions = data.options.filter(option => option.trim() !== "");
    
    if (filteredOptions.length < 2) {
      form.setError("options", { message: "At least 2 non-empty options are required" });
      return;
    }
    
    createPollMutation.mutate({
      ...data,
      options: filteredOptions,
    });
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
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <PlusCircle className="h-4 w-4 mr-2" />
          Create a Poll
        </Button>
      </DialogTrigger>
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

// Individual Poll Card Component
const PollCard = ({ poll, tripId }: { poll: any; tripId: number }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const voteMutation = useMutation({
    mutationFn: (optionIndex: number) => {
      return apiRequest("POST", `/api/polls/${poll.id}/vote`, { optionIndex });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
    },
  });
  
  const removeVoteMutation = useMutation({
    mutationFn: (voteId: number) => {
      return apiRequest(`/api/polls/${poll.id}/votes/${voteId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
    },
  });
  
  const handleVote = (optionIndex: number) => {
    voteMutation.mutate(optionIndex);
  };
  
  const handleRemoveVote = (voteId: number) => {
    removeVoteMutation.mutate(voteId);
  };
  
  const hasVoted = poll.hasVoted;
  const isExpired = poll.endDate && new Date(poll.endDate) < new Date();
  const isInactive = !poll.isActive;
  const isPollClosed = isExpired || isInactive;
  
  // Find which option(s) the user has voted for
  const userVoteIndices = poll.userVotes?.map((vote: any) => vote.optionIndex) || [];
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{poll.title}</CardTitle>
            {poll.description && <CardDescription>{poll.description}</CardDescription>}
          </div>
          {isPollClosed && (
            <Badge variant="secondary" className="ml-2">Closed</Badge>
          )}
        </div>
        <div className="flex items-center text-sm text-gray-500 mt-2">
          <UserAvatar user={poll.creator} size="sm" className="mr-2" />
          <span>Created by {poll.creator?.name || "Anonymous"}</span>
          {poll.endDate && (
            <span className="ml-4">
              Ends {format(new Date(poll.endDate), "MMM d, yyyy 'at' h:mm a")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {poll.options.map((option: string, index: number) => {
          const voteCount = poll.voteCounts[index] || 0;
          const percentage = poll.totalVotes > 0 ? Math.round((voteCount / poll.totalVotes) * 100) : 0;
          const userVotedForThis = userVoteIndices.includes(index);
          
          // Find the vote ID if the user voted for this option
          const userVoteId = poll.userVotes?.find((vote: any) => vote.optionIndex === index)?.id;
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium">{option}</span>
                  {userVotedForThis && (
                    <Badge variant="outline" className="ml-2 bg-primary-50 text-primary-700 border-primary-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Your vote
                    </Badge>
                  )}
                </div>
                <span className="text-sm font-medium">{percentage}%</span>
              </div>
              
              <div className="relative">
                <Progress 
                  value={percentage} 
                  className={`h-2 ${userVotedForThis ? "bg-primary-100" : "bg-gray-100"}`}
                />
                <span className="text-xs text-gray-500 mt-1">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
              </div>
              
              {!isPollClosed && (
                <div className="mt-1">
                  {userVotedForThis ? (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveVote(userVoteId)} 
                      disabled={removeVoteMutation.isPending}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 py-0 h-6"
                    >
                      Remove vote
                    </Button>
                  ) : (
                    (!hasVoted || poll.multipleChoice) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleVote(index)} 
                        disabled={voteMutation.isPending}
                        className="text-primary-500 hover:text-primary-700 hover:bg-primary-50 py-0 h-6"
                      >
                        Vote
                      </Button>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
      <CardFooter className="text-sm text-gray-500">
        {poll.totalVotes} total vote{poll.totalVotes !== 1 ? 's' : ''}
        {poll.multipleChoice && (
          <Badge variant="outline" className="ml-2">
            Multiple choice
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
};

// Main Polls Section Component
const PollsSection: React.FC<PollsSectionProps> = ({ tripId }) => {
  const { user } = useAuth();
  
  const { data: polls, isLoading, error } = useQuery({
    queryKey: [`/api/trips/${tripId}/polls`],
    enabled: !!tripId,
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2].map((index) => (
          <Card key={index}>
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-2/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900">Failed to load polls</h3>
        <p className="text-gray-600">Please try again later</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Polls</h2>
        <CreatePollDialog tripId={tripId} />
      </div>
      
      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll: any) => (
            <PollCard key={poll.id} poll={poll} tripId={tripId} />
          ))
        ) : (
          <div className="text-center p-8 bg-white rounded-lg border border-gray-200">
            <Info className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900">No polls yet</h3>
            <p className="text-gray-500 mb-4">Create a poll to gather opinions from your trip members</p>
            <CreatePollDialog tripId={tripId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PollsSection;