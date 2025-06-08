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
import { Plane, Users } from "lucide-react";

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

  // Fetch trip details
  const { data: trip } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId
  });

  // Fetch trip members to get user information
  const { data: members = [] } = useQuery({
    queryKey: [`/api/trips/${tripId}/members`],
    enabled: !!tripId
  });

  // Check user's RSVP status
  const isOrganizer = user && trip && (trip as any).organizer === (user as any).id;
  const currentUserMembership = (members as any[]).find((member: any) => member.userId === (user as any)?.id);
  const isConfirmedMember = currentUserMembership?.rsvpStatus === 'confirmed' || isOrganizer;

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
  const userHasExistingFlight = (flights as any[]).some((flight: any) => flight.userId === (user as any)?.id);

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
    <TripDetailLayout 
      tripId={parseInt(tripId)}
      title="Flights"
      description="Coordinate flight information for your trip"
      isConfirmedMember={isConfirmedMember as boolean}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Flight Information</h2>
          {!userHasExistingFlight && (
            <Dialog open={showBookingQuestion} onOpenChange={setShowBookingQuestion}>
              <DialogTrigger asChild>
                <Button disabled={!isConfirmedMember}>Add Flight</Button>
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

        {/* My Flight Details Section */}
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">My Flight Details</h3>
            {(() => {
              const userFlight = (flights as any[]).find((flight: any) => flight.userId === user?.id);
              
              if (isFlightsLoading) {
                return (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p>Loading your flight details...</p>
                    </CardContent>
                  </Card>
                );
              }
              
              if (!userFlight) {
                return (
                  <Card className="border-dashed border-2">
                    <CardContent className="p-6 text-center">
                      <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">You haven't added your flight details yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Add your flight information to help coordinate travel with your group.
                      </p>
                      <Button onClick={() => setShowBookingQuestion(true)}>
                        <Plane className="h-4 w-4 mr-2" />
                        Add My Flight Details
                      </Button>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-blue-900">
                          {userFlight.flightNumber || "My Flight"}
                        </CardTitle>
                        <p className="text-sm text-blue-700">
                          Your flight information
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-blue-600">
                          My Flight
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditFlight(userFlight)}
                            disabled={editFlightMutation.isPending}
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteFlightMutation.mutate(userFlight.id)}
                            disabled={deleteFlightMutation.isPending}
                          >
                            🗑️
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Airline:</span>
                        <p className="text-gray-900">{userFlight.airline || "TBD"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Departure Date:</span>
                        <p className="text-gray-900">
                          {userFlight.flightDetails?.userProvidedDepartureDate 
                            ? new Date(userFlight.flightDetails.userProvidedDepartureDate).toLocaleDateString()
                            : userFlight.departureTime 
                            ? new Date(userFlight.departureTime).toLocaleDateString()
                            : "TBD"
                          }
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Departure:</span>
                        <p className="text-gray-900">{userFlight.departureAirport || "TBD"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Arrival:</span>
                        <p className="text-gray-900">{userFlight.arrivalAirport || "TBD"}</p>
                      </div>
                    </div>
                    {userFlight.notes && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">Notes:</span>
                        <p className="text-gray-600">{userFlight.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Group Travel Information Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Group Travel Information</h3>
            {(() => {
              const otherFlights = (flights as any[]).filter((flight: any) => flight.userId !== user?.id);
              
              if (isFlightsLoading) {
                return (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <p>Loading group flight information...</p>
                    </CardContent>
                  </Card>
                );
              }

              if (otherFlights.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No other group members have added their flights yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Flight details from other travelers will appear here when they're added.
                      </p>
                    </CardContent>
                  </Card>
                );
              }

              return (
                <div className="space-y-4">
                  {otherFlights
                    .sort((a: any, b: any) => {
                      const dateA = new Date(a.flightDetails?.userProvidedDepartureDate || a.departureTime);
                      const dateB = new Date(b.flightDetails?.userProvidedDepartureDate || b.departureTime);
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
                                  {flightUser?.user?.username || flightUser?.username || 'Unknown User'}
                                </p>
                              </div>
                              <Badge variant="secondary">
                                Group Member
                              </Badge>
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
                    })}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </TripDetailLayout>
  );
}