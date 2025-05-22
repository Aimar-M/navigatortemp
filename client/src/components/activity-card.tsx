import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon, XIcon } from "lucide-react";

interface ActivityCardProps {
  id: number;
  name: string;
  description?: string;
  date: string;
  location?: string;
  duration?: number;
  cost?: string;
  confirmedCount: number;
  totalCount: number;
  rsvps?: any[];
}

export default function ActivityCard({
  id,
  name,
  description,
  date,
  location,
  confirmedCount,
  totalCount,
  rsvps = [],
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
      await queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      
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
    <Card className="border border-gray-200 rounded-lg">
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs text-gray-500">{formatDateTime(date)}</span>
            <h4 className="font-medium text-gray-900">{name}</h4>
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
          </div>
          <Badge variant="outline" className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
            {confirmedCount}/{totalCount} Going
          </Badge>
        </div>
        
        {/* RSVP Buttons */}
        <div className="flex justify-end space-x-2 mt-3">
          <Button
            size="sm"
            variant={userStatus === "going" ? "default" : "outline"}
            onClick={() => handleRsvp("going")}
            disabled={isSubmitting}
            className={`flex items-center h-8 ${userStatus === "going" ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            <CheckIcon className="h-4 w-4 mr-1" />
            {userStatus === "going" ? "You're Going" : "Going"}
          </Button>
          <Button
            size="sm"
            variant={userStatus === "not going" ? "default" : "outline"}
            onClick={() => handleRsvp("not going")}
            disabled={isSubmitting}
            className={`flex items-center h-8 ${userStatus === "not going" ? "bg-red-600 hover:bg-red-700" : ""}`}
          >
            <XIcon className="h-4 w-4 mr-1" />
            Not Going
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
