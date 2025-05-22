import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Info, AlertCircle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import UserAvatar from "@/components/user-avatar";
import { CreatePollDialog } from "./create-poll-dialog";

interface PollsSectionProps {
  tripId: number;
}



// Individual Poll Card Component
const PollCard = ({ poll, tripId }: { poll: any; tripId: number }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
  
  const { data: polls = [], isLoading, error } = useQuery<any[]>({
    queryKey: [`/api/trips/${tripId}/polls`],
    enabled: !!tripId,
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/trips/${tripId}/polls`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch polls');
      }
      return response.json();
    }
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
        {Array.isArray(polls) && polls.length > 0 ? (
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