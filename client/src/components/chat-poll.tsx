import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import UserAvatar from "./user-avatar";

interface ChatPollProps {
  poll: any;
  tripId: number;
}

const ChatPoll = ({ poll, tripId }: ChatPollProps) => {
  const queryClient = useQueryClient();
  const [showDetails, setShowDetails] = useState(false);
  const token = localStorage.getItem('auth_token');
  
  const voteMutation = useMutation({
    mutationFn: (optionIndex: number) => {
      return fetch(`/api/polls/${poll.id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ optionIndex })
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || 'Failed to vote');
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/polls`] });
    },
  });
  
  const removeVoteMutation = useMutation({
    mutationFn: (voteId: number) => {
      return fetch(`/api/polls/${poll.id}/votes/${voteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            throw new Error(err.message || 'Failed to remove vote');
          });
        }
        return res.json();
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
  
  if (!showDetails) {
    return (
      <Card className="w-full max-w-md mx-auto my-2 cursor-pointer hover:bg-gray-50" onClick={() => setShowDetails(true)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{poll.title}</CardTitle>
            {isPollClosed && (
              <Badge variant="secondary" className="ml-2 text-xs">Closed</Badge>
            )}
          </div>
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <span>Poll • {poll.totalVotes} vote{poll.totalVotes !== 1 ? 's' : ''}</span>
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
            <CardTitle className="text-base">{poll.title}</CardTitle>
            {poll.description && <p className="text-sm text-gray-500 mt-1">{poll.description}</p>}
          </div>
          {isPollClosed && (
            <Badge variant="secondary" className="ml-2 text-xs">Closed</Badge>
          )}
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <UserAvatar user={poll.creator} size="xs" className="mr-1" />
          <span>{poll.creator?.name || "Anonymous"}</span>
          {poll.endDate && (
            <span className="ml-2">
              Ends {format(new Date(poll.endDate), "MMM d")}
            </span>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="py-2 space-y-2">
        {poll.options.map((option: string, index: number) => {
          const voteCount = poll.voteCounts[index] || 0;
          const percentage = poll.totalVotes > 0 ? Math.round((voteCount / poll.totalVotes) * 100) : 0;
          const userVotedForThis = userVoteIndices.includes(index);
          
          // Find the vote ID if the user voted for this option
          const userVoteId = poll.userVotes?.find((vote: any) => vote.optionIndex === index)?.id;
          
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
        {!isPollClosed && poll.options.map((option: string, index: number) => {
          const userVotedForThis = userVoteIndices.includes(index);
          const userVoteId = poll.userVotes?.find((vote: any) => vote.optionIndex === index)?.id;
          
          if (userVotedForThis) {
            return (
              <Button 
                key={index}
                variant="outline" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveVote(userVoteId);
                }}
                disabled={removeVoteMutation.isPending}
                className="text-xs h-7 px-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                Remove: {option}
              </Button>
            );
          }
          
          if (!hasVoted || poll.multipleChoice) {
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