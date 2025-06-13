import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon, Trash2 } from "lucide-react";

interface ActivityCardProps {
  id: number;
  name: string;
  description?: string;
  date: string;
  startTime?: string;
  activityType?: string;
  activityLink?: string;
  location?: string;
  duration?: string;
  cost?: string;
  paymentType?: string;
  maxParticipants?: number;
  confirmedCount: number;
  totalCount: number;
  rsvps?: any[];
  createdBy?: number;
  isAccommodationEntry?: boolean;
}

export default function ActivityCard({
  id,
  name,
  description,
  date,
  startTime,
  activityType,
  activityLink,
  location,
  duration,
  cost,
  paymentType,
  maxParticipants,
  confirmedCount,
  totalCount,
  rsvps = [],
  createdBy,
  isAccommodationEntry = false,
}: ActivityCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Find user's current RSVP status
  const userRsvp = rsvps?.find(rsvp => rsvp.userId === user?.id);
  const userStatus = userRsvp?.status || "none";
  
  const handleRsvp = async (status: string) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      await apiRequest("POST", `/api/activities/${id}/rsvp`, { status });
      
      // Invalidate and refetch activities to update the UI
      const currentUrl = window.location.pathname;
      const tripId = currentUrl.split('/')[2]; // Extract tripId from URL like /trip/39
      
      if (tripId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      }
      await queryClient.invalidateQueries({ queryKey: [`/api/activities`] });
      
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!confirm('Are you sure you want to delete this activity? This will also remove all related expenses and RSVPs.')) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await apiRequest("DELETE", `/api/activities/${id}`);
      
      // Invalidate and refetch activities to update the UI
      const currentUrl = window.location.pathname;
      const tripId = currentUrl.split('/')[2]; // Extract tripId from URL like /trip/39
      
      if (tripId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/activities`] });
      }
      await queryClient.invalidateQueries({ queryKey: [`/api/activities`] });
      
      toast({
        title: "Activity Deleted",
        description: "The activity and all related data have been removed.",
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: "There was a problem deleting the activity. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className={`border rounded-lg cursor-pointer hover:shadow-md transition-shadow ${
      isAccommodationEntry 
        ? "border-blue-200 bg-blue-50/30" 
        : "border-gray-200"
    }`}
          onClick={() => window.location.href = `/activities/${id}`}>
      <CardContent className="p-4">
        {isAccommodationEntry ? (
          // Simplified accommodation card - only title and location
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">{name}</h4>
            {location && (
              <p className="text-sm text-gray-600 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {location}
              </p>
            )}
          </div>
        ) : (
          // Regular activity card with essential info only
          <div className="space-y-3">
            {/* Title and Time row */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900 flex-1">{name}</h4>
              {startTime && (
                <span className="text-sm font-medium text-blue-600 ml-3">
                  {startTime}
                </span>
              )}
            </div>
            
            {/* Location */}
            {location && (
              <p className="text-sm text-gray-600 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 mr-2"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {location}
              </p>
            )}

            {/* Bottom row: Payment type, RSVP info, and RSVP toggles */}
            <div className="flex items-center justify-between">
              {/* Left side: Payment type */}
              <div>
                {paymentType && (
                  <Badge 
                    variant={paymentType === 'free' ? 'secondary' : paymentType === 'prepaid' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {paymentType === 'free' ? 'Free' : 
                     paymentType === 'payment_onsite' ? 'Pay Onsite' : 
                     'Prepaid'}
                  </Badge>
                )}
              </div>

              {/* Center: RSVP info and spots */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-600">
                <span>{confirmedCount}/{totalCount} going</span>
                {maxParticipants && (
                  <span className={maxParticipants - confirmedCount <= 3 ? "text-amber-600 font-medium" : ""}>
                    {maxParticipants - confirmedCount > 0 
                      ? `${maxParticipants - confirmedCount} spots left`
                      : "Full"
                    }
                  </span>
                )}
              </div>

              {/* Right side: RSVP toggles */}
              {user && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={userRsvp?.status === "going" ? "default" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRsvp("going");
                    }}
                    disabled={isSubmitting}
                    className="h-7 w-7 p-0"
                  >
                    <CheckIcon className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={userRsvp?.status === "not_going" ? "destructive" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRsvp("not_going");
                    }}
                    disabled={isSubmitting}
                    className="h-7 w-7 p-0"
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                  {/* Show delete button if user is creator */}
                  {createdBy === user.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDelete(e)}
                      disabled={isSubmitting}
                      className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
