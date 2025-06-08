import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

interface PendingTrip {
  id: number;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  description?: string;
  organizer: number;
  membershipStatus: string;
  rsvpStatus: string;
  joinedAt: string;
}

export default function RSVPNotification() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch pending RSVP trips
  const { data: pendingTrips = [], isLoading } = useQuery<PendingTrip[]>({
    queryKey: ["/api/trips/rsvp/pending"],
    enabled: !!user
  });

  // RSVP status update mutation
  const updateRSVPMutation = useMutation({
    mutationFn: async ({ tripId, rsvpStatus }: { tripId: number; rsvpStatus: string }) => {
      if (!user) throw new Error("User not authenticated");
      return await apiRequest("PUT", `/api/trips/${tripId}/members/${user.id}/rsvp`, { rsvpStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips/rsvp/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({
        title: "RSVP updated",
        description: "Your response has been recorded"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update RSVP",
        variant: "destructive"
      });
    }
  });

  const handleRSVP = (tripId: number, rsvpStatus: string) => {
    updateRSVPMutation.mutate({ tripId, rsvpStatus });
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Loading pending invitations...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (pendingTrips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-900">Pending Trip Invitations</h2>
      {pendingTrips.map((trip) => (
        <Card key={trip.id} className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <span>Invitation to {trip.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleRSVP(trip.id, 'confirmed')}
                  disabled={updateRSVPMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRSVP(trip.id, 'declined')}
                  disabled={updateRSVPMutation.isPending}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  Decline
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>{trip.destination}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(trip.startDate), "MMM d")} - {format(new Date(trip.endDate), "MMM d, yyyy")}
                </span>
              </div>
              {trip.description && (
                <p className="text-sm text-gray-700 mt-2">{trip.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Invited {format(new Date(trip.joinedAt), "MMM d, yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}