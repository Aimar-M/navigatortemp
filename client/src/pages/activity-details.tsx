import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, DollarSign, Users, CheckIcon, XIcon } from "lucide-react";
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
  location?: string;
  duration?: string;
  cost?: string;
  paymentType: string;
  maxParticipants?: number;
  rsvps: ActivityRSVP[];
}

export default function ActivityDetails() {
  const { activityId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: activity, isLoading } = useQuery<ActivityDetail>({
    queryKey: [`/api/activities/${activityId}`],
  });

  const { data: currentUser } = useQuery<{ id: number; name: string; email: string }>({
    queryKey: ["/api/auth/me"],
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: string) => {
      return await apiRequest(`/api/activities/${activityId}/rsvp`, "POST", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/activities/${activityId}`] });
      if (activity?.tripId) {
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${activity.tripId}/activities`] });
      }
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
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setLocation(`/trips/${activity.tripId}`)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Trip
        </Button>
      </div>

      {/* Activity Details Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">{activity.name}</CardTitle>
              <p className="text-gray-500 mt-1">{formatDate(activity.date)}</p>
            </div>
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
          </div>
        </CardHeader>
        <CardContent>
          {activity.description && (
            <p className="text-gray-700 mb-4">{activity.description}</p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <Button
              variant={userRSVP?.status === "not going" ? "default" : "outline"}
              onClick={() => handleRSVP("not going")}
              disabled={isSubmitting}
              className={`flex items-center gap-2 ${userRSVP?.status === "not going" ? "bg-red-600 hover:bg-red-700" : ""}`}
            >
              <XIcon className="h-4 w-4" />
              {userRSVP?.status === "not going" ? "You're Not Going" : "Not Going"}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                        {rsvp.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">{rsvp.user.name}</span>
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
                        {rsvp.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-gray-900">{rsvp.user.name}</span>
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