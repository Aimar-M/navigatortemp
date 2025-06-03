import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import TripDetailLayout from "@/components/trip-detail-layout";

export default function Flights() {
  const { tripId } = useParams<{ tripId: string }>();
  const { toast } = useToast();
  const [showBookingQuestion, setShowBookingQuestion] = useState(false);
  const [flightForm, setFlightForm] = useState({
    flightNumber: "",
    departureDate: ""
  });

  // Fetch user data
  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false
  });

  // Fetch flights for this trip
  const { data: flights = [], isLoading: isFlightsLoading, refetch: refetchFlights } = useQuery({
    queryKey: [`/api/trips/${tripId}/flights`],
    enabled: !!tripId
  });

  // Add flight mutation
  const addFlightMutation = useMutation({
    mutationFn: async (data: { flightNumber: string; arrivalDate: string }) => {
      return await apiRequest("POST", `/api/trips/${tripId}/flights`, data);
    },
    onSuccess: () => {
      refetchFlights();
      setFlightForm({ flightNumber: "", departureDate: "" });
      setShowBookingQuestion(false);
      toast({
        title: "Flight added",
        description: "Your flight information has been added and verified."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add flight",
        variant: "destructive"
      });
    }
  });

  // Delete flight mutation
  const deleteFlightMutation = useMutation({
    mutationFn: async (flightId: number) => {
      return await apiRequest("DELETE", `/api/flights/${flightId}`);
    },
    onSuccess: () => {
      refetchFlights();
      toast({
        title: "Flight removed",
        description: "Your flight has been removed."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove flight",
        variant: "destructive"
      });
    }
  });

  const handleAddFlight = () => {
    if (!flightForm.flightNumber || !flightForm.departureDate) {
      toast({
        title: "Missing information",
        description: "Please enter both flight number and departure date",
        variant: "destructive"
      });
      return;
    }

    addFlightMutation.mutate({
      flightNumber: flightForm.flightNumber.toUpperCase().trim(),
      arrivalDate: flightForm.departureDate
    });
  };

  const handleBookingRedirect = () => {
    toast({
      title: "Booking platform",
      description: "Flight booking platform integration coming soon!"
    });
  };

  if (!user) {
    return (
      <TripDetailLayout tripId={parseInt(tripId)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p>Please log in to view flights</p>
          </div>
        </div>
      </TripDetailLayout>
    );
  }

  return (
    <TripDetailLayout tripId={parseInt(tripId)}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Flight Information</h2>
          <Dialog open={showBookingQuestion} onOpenChange={setShowBookingQuestion}>
            <DialogTrigger asChild>
              <Button>Add Flight</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Flight Booking Status</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p>Have you already booked your flight for this trip?</p>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setShowBookingQuestion(false)}
                    variant="outline"
                  >
                    Yes, I have booked
                  </Button>
                  <Button 
                    onClick={handleBookingRedirect}
                    variant="outline"
                  >
                    No, help me book
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Flight Details Dialog - shown when user says they have booked */}
        <Dialog open={showBookingQuestion === false} onOpenChange={(open) => {
          if (!open) {
            setShowBookingQuestion(true);
            setFlightForm({ flightNumber: "", departureDate: "" });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Your Flight Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter your flight number and departure date. We'll automatically verify the airline information.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Flight Number</label>
                  <Input
                    placeholder="e.g., AA123"
                    value={flightForm.flightNumber}
                    onChange={(e) => setFlightForm(prev => ({ ...prev, flightNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Departure Date</label>
                  <Input
                    type="date"
                    value={flightForm.departureDate}
                    onChange={(e) => setFlightForm(prev => ({ ...prev, departureDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddFlight}
                  disabled={addFlightMutation.isPending}
                  className="w-full"
                >
                  {addFlightMutation.isPending ? "Adding..." : "Add Flight"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Flights List */}
        <div className="space-y-4">
          {isFlightsLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p>Loading flights...</p>
              </CardContent>
            </Card>
          ) : flights.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No flight information added yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add your flight details to help coordinate travel with your group.
                </p>
              </CardContent>
            </Card>
          ) : (
            (flights as any[]).map((flight: any) => (
              <Card key={flight.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {flight.flightNumber || "Flight Details"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        Verified
                      </Badge>
                      {user?.id === flight.userId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteFlightMutation.mutate(flight.id)}
                          disabled={deleteFlightMutation.isPending}
                        >
                          🗑️
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Airline:</span>
                      <p>{flight.airline || "TBD"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Departure Date:</span>
                      <p>
                        {flight.departureTime 
                          ? new Date(flight.departureTime).toLocaleDateString()
                          : flight.flightDetails?.userProvidedArrivalDate || "TBD"
                        }
                      </p>
                    </div>
                    <div>
                      <span className="font-medium">Departure:</span>
                      <p>{flight.departureAirport || "TBD"}</p>
                    </div>
                    <div>
                      <span className="font-medium">Arrival:</span>
                      <p>{flight.arrivalAirport || "TBD"}</p>
                    </div>
                  </div>
                  {flight.notes && (
                    <div className="text-sm">
                      <span className="font-medium">Notes:</span>
                      <p className="text-muted-foreground">{flight.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </TripDetailLayout>
  );
}