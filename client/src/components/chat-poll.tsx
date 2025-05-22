import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import UserAvatar from "./user-avatar";
import { toast } from "@/hooks/use-toast";

interface ChatPollProps {
  poll: any;
  tripId: number;
}

const ChatPoll = ({ poll, tripId }: ChatPollProps) => {
  const queryClient = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);
  const [localPoll, setLocalPoll] = useState(poll);
  const token = localStorage.getItem('auth_token');
  
  // Update local poll when props change using useEffect
  useEffect(() => {
    setLocalPoll(poll);
  }, [poll.id, poll.totalVotes]);
  
  const voteMutation = useMutation({
    mutationFn: async (optionIndex: number) => {
      const res = await fetch(`/api/polls/${localPoll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionIndex })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to vote');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Update the local poll data immediately to show vote changes
      const updatedPoll = {
        ...localPoll,
        voteCounts: data.voteCounts,
        totalVotes: data.totalVotes,
        hasVoted: true,
        userVotes: [...(localPoll.userVotes || []), data.vote]
      };
      setLocalPoll(updatedPoll);
      
      // Then refresh all the data to stay in sync
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/messages`] });
      
      toast({
        title: 'Vote submitted',
        description: 'Your vote has been recorded',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error voting',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const removeVoteMutation = useMutation({
    mutationFn: async (voteId: number) => {
      const res = await fetch(`/api/polls/${localPoll.id}/votes/${voteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to remove vote');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      // Update local poll data immediately
      const updatedUserVotes = localPoll.userVotes.filter((vote: any) => 
        vote.id !== data.removedVoteId
      );
      
      // Update vote counts by decrementing the removed option
      const updatedVoteCounts = [...localPoll.voteCounts];
      const removedVote = localPoll.userVotes.find((vote: any) => vote.id === data.removedVoteId);
      if (removedVote && updatedVoteCounts[removedVote.optionIndex] > 0) {
        updatedVoteCounts[removedVote.optionIndex]--;
      }
      
      const updatedPoll = {
        ...localPoll,
        voteCounts: updatedVoteCounts,
        totalVotes: Math.max(0, localPoll.totalVotes - 1),
        hasVoted: updatedUserVotes.length > 0,
        userVotes: updatedUserVotes
      };
      
      setLocalPoll(updatedPoll);
      
      // Then refresh all the data to stay in sync
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/messages`] });
      
      toast({
        title: 'Vote removed',
        description: 'Your vote has been removed',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing vote',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const handleVote = (optionIndex: number) => {
    voteMutation.mutate(optionIndex);
  };
  
  const handleRemoveVote = (voteId: number) => {
    removeVoteMutation.mutate(voteId);
  };
  
  const hasVoted = localPoll.hasVoted;
  const isExpired = localPoll.endDate && new Date(localPoll.endDate) < new Date();
  const isInactive = !localPoll.isActive;
  const isPollClosed = isExpired || isInactive;
  
  // Find which option(s) the user has voted for
  const userVoteIndices = localPoll.userVotes?.map((vote: any) => vote.optionIndex) || [];
  
  if (!showDetails) {
    return (
      <Card className="w-full max-w-md mx-auto my-2 cursor-pointer hover:bg-gray-50" onClick={() => setShowDetails(true)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{localPoll.title}</CardTitle>
            {isPollClosed && (
              <Badge variant="secondary" className="ml-2 text-xs">Closed</Badge>
            )}
          </div>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <span>Poll • {localPoll.totalVotes} vote{localPoll.totalVotes !== 1 ? 's' : ''}</span>
          </div>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-md mx-auto my-2">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{localPoll.title}</CardTitle>
            {localPoll.description && <p className="text-sm text-gray-500 mt-1">{localPoll.description}</p>}
          </div>
          {isPollClosed && (
            <Badge variant="secondary" className="ml-2 text-xs">Closed</Badge>
          )}
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <UserAvatar user={localPoll.creator} size="xs" className="mr-1" />
          <span>{localPoll.creator?.name || "Anonymous"}</span>
          {localPoll.endDate && (
            <span className="ml-2">
              Ends {format(new Date(localPoll.endDate), "MMM d")}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="py-2 space-y-2">
        {localPoll.options.map((option: string, index: number) => {
          const voteCount = localPoll.voteCounts[index] || 0;
          const percentage = localPoll.totalVotes > 0 ? Math.round((voteCount / localPoll.totalVotes) * 100) : 0;
          const userVotedForThis = userVoteIndices.includes(index);
          
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="font-medium">{option}</span>
                  {userVotedForThis && (
                    <CheckCircle className="h-3.5 w-3.5 ml-1 text-primary-600" />
                  )}
                </div>
                <span className="text-xs font-medium">{percentage}%</span>
              </div>
              
              <div className="relative">
                <Progress 
                  value={percentage} 
                  className={`h-2 ${userVotedForThis ? "bg-primary-100" : "bg-gray-100"}`}
                />
                <span className="text-xs text-gray-500 mt-0.5">{voteCount} vote{voteCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
      
      <CardFooter className="pt-0 pb-2 flex flex-wrap gap-2">
        {!isPollClosed && localPoll.options.map((option: string, index: number) => {
          const userVotedForThis = userVoteIndices.includes(index);
          const userVoteId = localPoll.userVotes?.find((vote: any) => vote.optionIndex === index)?.id;
          
          if (userVotedForThis) {
            return (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  if (userVoteId) {
                    handleRemoveVote(userVoteId);
                  }
                }}
                disabled={removeVoteMutation.isPending}
                className="text-xs h-7 px-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                Remove: {option}
              </Button>
            );
          }
          
          if (!hasVoted || localPoll.multipleChoice) {
            return (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleVote(index);
                }}
                disabled={voteMutation.isPending}
                className="text-xs h-7 px-2"
              >
                {option}
              </Button>
            );
          }
          
          return null;
        })}
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setShowDetails(false)}
          className="text-xs h-7 ml-auto"
        >
          Close
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ChatPoll;