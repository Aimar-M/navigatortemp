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
  const { id: tripId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [showBookingQuestion, setShowBookingQuestion] = useState(false);
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<any>(null);
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

  // Fetch trip members to get user information
  const { data: members = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId
  });

  // Add flight mutation
  const addFlightMutation = useMutation({
    mutationFn: async (data: { flightNumber: string; departureDate: string }) => {
      return await apiRequest("POST", `/api/trips/${tripId}/flights`, data);
    },
    onSuccess: () => {
      refetchFlights();
      setFlightForm({ flightNumber: "", departureDate: "" });
      setShowBookingQuestion(false);
      setShowFlightForm(false);
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

  // Edit flight mutation
  const editFlightMutation = useMutation({
    mutationFn: async (data: { flightNumber: string; departureDate: string }) => {
      return await apiRequest("PUT", `/api/flights/${editingFlight.id}`, data);
    },
    onSuccess: () => {
      refetchFlights();
      setFlightForm({ flightNumber: "", departureDate: "" });
      setEditingFlight(null);
      setShowFlightForm(false);
      toast({
        title: "Flight updated",
        description: "Your flight information has been updated and verified."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update flight",
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

    const flightData = {
      flightNumber: flightForm.flightNumber.toUpperCase().trim(),
      departureDate: flightForm.departureDate
    };

    if (editingFlight) {
      editFlightMutation.mutate(flightData);
    } else {
      addFlightMutation.mutate(flightData);
    }
  };

  const handleEditFlight = (flight: any) => {
    setEditingFlight(flight);
    setFlightForm({
      flightNumber: flight.flightNumber,
      departureDate: flight.flightDetails?.userProvidedDepartureDate || flight.departureTime || flight.arrivalTime
    });
    setShowFlightForm(true);
  };

  // Check if current user already has a flight
  const userHasExistingFlight = (flights as any[]).some((flight: any) => flight.userId === user?.id);

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
          {!userHasExistingFlight && (
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
                    onClick={() => {
                      setShowBookingQuestion(false);
                      setShowFlightForm(true);
                    }}
                    variant="outline"
                  >
                    Yes, I have booked
                  </Button>
                  <Button 
                    onClick={() => {
                      handleBookingRedirect();
                      setShowBookingQuestion(false);
                    }}
                    variant="outline"
                  >
                    No, help me book
                  </Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Flight Details Dialog - shown when user says they have booked */}
        <Dialog open={showFlightForm} onOpenChange={(open) => {
          if (!open) {
            setShowFlightForm(false);
            setFlightForm({ flightNumber: "", departureDate: "" });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFlight ? "Edit Flight Details" : "Add Your Flight Details"}</DialogTitle>
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
                  disabled={addFlightMutation.isPending || editFlightMutation.isPending}
                  className="w-full"
                >
                  {editingFlight 
                    ? (editFlightMutation.isPending ? "Updating..." : "Update Flight")
                    : (addFlightMutation.isPending ? "Adding..." : "Add Flight")
                  }
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
            (flights as any[])
              .sort((a: any, b: any) => {
                // Sort by arrival date (departure date in our case)
                const dateA = new Date(a.arrivalDate || a.departureDate);
                const dateB = new Date(b.arrivalDate || b.departureDate);
                return dateA.getTime() - dateB.getTime();
              })
              .map((flight: any) => {
                const flightUser = (members as any[]).find((member: any) => member.userId === flight.userId);
                return (
                  <Card key={flight.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {flight.flightNumber || "Flight Details"}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Added by {flightUser?.username || 'User'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        Verified
                      </Badge>
                      {user?.id === flight.userId && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFlight(flight)}
                            disabled={editFlightMutation.isPending}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFlightMutation.mutate(flight.id)}
                            disabled={deleteFlightMutation.isPending}
                          >
                            🗑️
                          </Button>
                        </div>
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
                        {flight.flightDetails?.userProvidedDepartureDate 
                          ? new Date(flight.flightDetails.userProvidedDepartureDate).toLocaleDateString()
                          : flight.departureTime 
                          ? new Date(flight.departureTime).toLocaleDateString()
                          : "TBD"
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
                );
              })
          )}
        </div>
      </div>
    </TripDetailLayout>
  );
}