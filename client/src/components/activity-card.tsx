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
    <Card className="border border-gray-200 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => window.location.href = `/activities/${id}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-xs text-gray-500">
              {formatDate(date)}
              {startTime && (
                <span className="ml-2 font-medium text-blue-600">
                  at {startTime}
                </span>
              )}
            </div>
            <h4 className="font-medium text-gray-900">{name}</h4>
            {activityType && (
              <div className="mt-1">
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {activityType}
                </Badge>
              </div>
            )}
            {description && (
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            )}
            {location && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 mr-1"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                {location}
              </p>
            )}
            {duration && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3 w-3 mr-1"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12,6 12,12 16,14"></polyline>
                </svg>
                {duration}
              </p>
            )}
            {(cost || paymentType) && (
              <div className="flex items-center gap-2 mt-2">
                {cost && (
                  <span className="text-xs text-gray-600 font-medium">${cost}</span>
                )}
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
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
              {confirmedCount}/{totalCount} Going
            </Badge>
            {maxParticipants && (
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary" className="text-xs">
                  Cap: {maxParticipants}
                </Badge>
                <Badge 
                  variant={maxParticipants - confirmedCount <= 0 ? "destructive" : maxParticipants - confirmedCount <= 3 ? "default" : "outline"} 
                  className="text-xs"
                >
                  {maxParticipants - confirmedCount > 0 
                    ? `${maxParticipants - confirmedCount} spots left`
                    : "Full"
                  }
                </Badge>
              </div>
            )}
          </div>
        </div>
        
        {/* RSVP Buttons or Delete Button */}
        <div className="flex justify-end space-x-2 mt-3">
          {user?.id === createdBy && paymentType === 'prepaid' ? (
            // For activity creators of prepaid activities - show delete button instead of RSVP
            <>
              <div className="text-xs text-gray-600 mr-2 self-center">
                You created this activity
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex items-center h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Activity
              </Button>
            </>
          ) : user?.id === createdBy ? (
            // For activity creators of non-prepaid activities - show delete button along with going status
            <>
              <div className="text-xs text-gray-600 mr-2 self-center">
                You created this activity
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex items-center h-8"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </>
          ) : (
            // For regular users - show normal RSVP buttons
            <>
              <Button
                size="sm"
                variant={userStatus === "going" ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRsvp("going");
                }}
                disabled={isSubmitting}
                className={`flex items-center h-8 ${userStatus === "going" ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                {userStatus === "going" ? "You're Going" : "Going"}
              </Button>
              <Button
                size="sm"
                variant={userStatus === "not going" ? "default" : "outline"}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRsvp("not going");
                }}
                disabled={isSubmitting}
                className={`flex items-center h-8 ${userStatus === "not going" ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                <XIcon className="h-4 w-4 mr-1" />
                Not Going
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
