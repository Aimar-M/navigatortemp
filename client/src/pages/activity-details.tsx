import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, DollarSign, Users, CheckIcon, XIcon, Trash2, ExternalLink, UserCheck, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";

interface ActivityRSVP {
  id: number;
  activityId: number;
  userId: number;
  status: string;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
}

interface ActivityDetail {
  id: number;
  tripId: number;
  name: string;
  description?: string;
  date: string;
  startTime?: string;
  activityType?: string;
  activityLink?: string;
  location?: string;
  duration?: string;
  cost?: string;
  paymentType: string;
  maxParticipants?: number;
  createdBy: number;
  rsvps: ActivityRSVP[];
}

interface Trip {
  id: number;
  organizer: number;
  adminOnlyItinerary?: boolean;
}

interface TripMember {
  tripId: number;
  userId: number;
  isOrganizer: boolean;
  isAdmin?: boolean;
  status: string;
  user?: {
    id: number;
    name: string;
    username: string;
    avatar?: string;
  };
}

export default function ActivityDetails() {
  const { activityId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const { data: activity, isLoading } = useQuery<ActivityDetail>({
    queryKey: [`/api/activities/${activityId}`],
  });

  const { data: currentUser } = useQuery<{ id: number; name: string; email: string }>({
    queryKey: ["/api/auth/me"],
  });

  // Fetch trip details to check admin permissions
  const { data: trip } = useQuery<Trip>({
    queryKey: [`/api/trips/${activity?.tripId}`],
    enabled: !!activity?.tripId,
  });

  // Fetch trip members to check admin status
  const { data: members = [] } = useQuery<TripMember[]>({
    queryKey: [`/api/trips/${activity?.tripId}/members`],
    enabled: !!activity?.tripId,
  });

  // Check if current user can edit/delete activities
  const isOrganizer = currentUser && trip && trip.organizer === currentUser.id;
  const currentUserMembership = members.find(member => member.userId === currentUser?.id);
  const isCurrentUserAdmin = currentUserMembership?.isAdmin || isOrganizer;
  const canEditActivity = !trip?.adminOnlyItinerary || isCurrentUserAdmin || (currentUser && activity?.createdBy === currentUser.id);

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest("POST", `/api/activities/${activityId}/rsvp`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${activity.tripId}/activities`] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/activities/${activityId}`);
    },
    onSuccess: () => {
      toast({
        title: "Activity deleted",
        description: "The activity has been removed from the trip.",
      });
      setLocation(`/trips/${activity?.tripId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const transferOwnershipMutation = useMutation({
    mutationFn: async (newOwnerId: number) => {
      return await apiRequest("PUT", `/api/activities/${activityId}/transfer-ownership`, { newOwnerId });
    },
    onSuccess: () => {
      toast({
        title: "Ownership transferred",
        description: "Activity ownership has been successfully transferred.",
      });
      setTransferDialogOpen(false);
      setSelectedNewOwner("");
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${activity.tripId}/activities`] });
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${activity.tripId}/expenses`] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer ownership. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Activity not found</h2>
          <Button onClick={() => setLocation("/")}>Go back</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const goingRSVPs = activity.rsvps?.filter(rsvp => rsvp.status === "going") || [];
  const notGoingRSVPs = activity.rsvps?.filter(rsvp => rsvp.status === "not going") || [];
  const userRSVP = activity.rsvps?.find(rsvp => rsvp.userId === currentUser?.id);
  const spotsLeft = activity.maxParticipants ? activity.maxParticipants - goingRSVPs.length : null;

  const handleRSVP = async (status: string) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await rsvpMutation.mutateAsync(status);
      toast({
        title: status === "going" ? "You're going!" : "You're not going",
        description: status === "going" 
          ? "You've been added to the attendee list" 
          : "You've been removed from the attendee list",
      });
    } catch (error) {
      console.error("RSVP error:", error);
      toast({
        title: "RSVP Failed",
        description: "There was a problem with your RSVP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/trips/${activity.tripId}/itinerary`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Itinerary
        </Button>
        
        {/* Delete button - show for activity creator or admins when admin-only mode is enabled */}
        {currentUser && canEditActivity && (activity.createdBy === currentUser.id || isCurrentUserAdmin) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (confirm("Are you sure you want to delete this activity? This will also remove any associated expenses.")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Activity"}
          </Button>
        )}
      </div>

      {/* Activity Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{activity.name}</CardTitle>
              <div className="text-gray-500 mt-1">
                {formatDate(activity.date)}
                {activity.startTime && (
                  <span className="ml-2 font-medium text-blue-600">
                    at {activity.startTime}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className="bg-primary-100 text-primary-800">
                  {goingRSVPs.length} Going
                </Badge>
                {activity.maxParticipants && (
                  <>
                    <Badge variant="secondary" className="text-xs">
                      Cap: {activity.maxParticipants}
                    </Badge>
                    <Badge 
                      variant={spotsLeft === 0 ? "destructive" : spotsLeft && spotsLeft <= 3 ? "default" : "outline"}
                      className="text-xs"
                    >
                      {spotsLeft && spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
                    </Badge>
                  </>
                )}
              </div>
              
              {/* Admin actions dropdown */}
              {isCurrentUserAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {activity.paymentType === 'prepaid' && (
                      <DropdownMenuItem onSelect={() => setTransferDialogOpen(true)}>
                        <UserCheck className="mr-2 h-4 w-4" />
                        Transfer Ownership
                      </DropdownMenuItem>
                    )}
                    {canEditActivity && (
                      <DropdownMenuItem 
                        onSelect={() => deleteMutation.mutate()}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Activity
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activity.description && (
            <p className="text-gray-700 mb-4">{activity.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {activity.activityType && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {activity.activityType}
                </Badge>
              </div>
            )}
            
            {activity.activityLink && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-gray-500" />
                <a 
                  href={activity.activityLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  View Activity Website
                </a>
              </div>
            )}
            
            {activity.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{activity.location}</span>
              </div>
            )}
            
            {activity.duration && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">{activity.duration}</span>
              </div>
            )}
            
            {activity.cost && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-700">${activity.cost}</span>
              </div>
            )}
            
            {activity.paymentType && (
              <div className="flex items-center gap-2">
                <Badge 
                  variant={activity.paymentType === 'free' ? 'secondary' : activity.paymentType === 'prepaid' ? 'default' : 'outline'}
                >
                  {activity.paymentType === 'free' ? 'Free' : 
                   activity.paymentType === 'payment_onsite' ? 'Pay Onsite' : 
                   'Prepaid'}
                </Badge>
              </div>
            )}
          </div>

          {/* RSVP Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              variant={userRSVP?.status === "going" ? "default" : "outline"}
              onClick={() => handleRSVP("going")}
              disabled={isSubmitting}
              className={`flex items-center gap-2 ${userRSVP?.status === "going" ? "bg-green-600 hover:bg-green-700" : ""}`}
            >
              <CheckIcon className="h-4 w-4" />
              {userRSVP?.status === "going" ? "You're Going" : "Going"}
            </Button>
            
            {/* Prevent activity creator from declining prepaid activities */}
            {!(currentUser && activity.createdBy === currentUser.id && activity.paymentType === 'prepaid') && (
              <Button
                variant={userRSVP?.status === "not going" ? "default" : "outline"}
                onClick={() => handleRSVP("not going")}
                disabled={isSubmitting}
                className={`flex items-center gap-2 ${userRSVP?.status === "not going" ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                <XIcon className="h-4 w-4" />
                {userRSVP?.status === "not going" ? "You're Not Going" : "Not Going"}
              </Button>
            )}
            
            {/* Show delete button for activity creators */}
            {currentUser && activity.createdBy === currentUser.id && (
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Activity
              </Button>
            )}
          </div>
          
          {/* Show message for prepaid activity creators - moved below button container */}
          {currentUser && activity.createdBy === currentUser.id && activity.paymentType === 'prepaid' && (
            <div className="flex items-center text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded mt-4">
              <span>As the creator of this prepaid activity, you must attend.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Activity Ownership</DialogTitle>
            <DialogDescription>
              Select a new owner for this prepaid activity. This will transfer any financial obligations associated with this activity to the new owner.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select New Owner
            </label>
            <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a trip member..." />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(m => {
                    // Only show confirmed members who are not the current owner
                    if (m.status !== 'confirmed' || m.userId === activity.createdBy) {
                      return false;
                    }
                    // Only show members who have RSVP'd "going" to this activity
                    const userRSVP = activity.rsvps?.find(rsvp => rsvp.userId === m.userId);
                    return userRSVP && userRSVP.status === 'going';
                  })
                  .map(member => (
                    <SelectItem key={member.userId} value={member.userId.toString()}>
                      {member.user?.name || member.user?.username || `User ${member.userId}`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setTransferDialogOpen(false);
                setSelectedNewOwner("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedNewOwner) {
                  transferOwnershipMutation.mutate(parseInt(selectedNewOwner));
                }
              }}
              disabled={!selectedNewOwner || transferOwnershipMutation.isPending}
            >
              {transferOwnershipMutation.isPending ? "Transferring..." : "Transfer Ownership"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Participants Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Going */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              Going ({goingRSVPs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goingRSVPs.length > 0 ? (
              <div className="space-y-3">
                {goingRSVPs.map((rsvp) => (
                  <div key={rsvp.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={rsvp.user.avatar} />
                      <AvatarFallback className="bg-green-100 text-green-600">
                        {(rsvp.user.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">{rsvp.user.name || 'Unknown User'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No one has confirmed yet</p>
            )}
          </CardContent>
        </Card>

        {/* Not Going */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XIcon className="h-5 w-5 text-red-600" />
              Not Going ({notGoingRSVPs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notGoingRSVPs.length > 0 ? (
              <div className="space-y-3">
                {notGoingRSVPs.map((rsvp) => (
                  <div key={rsvp.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={rsvp.user.avatar} />
                      <AvatarFallback className="bg-red-100 text-red-600">
                        {(rsvp.user.name || 'U').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">{rsvp.user.name || 'Unknown User'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No one has declined yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}