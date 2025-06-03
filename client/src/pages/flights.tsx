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
  const [newFlight, setNewFlight] = useState({
    flightNumber: "",
    arrivalDate: ""
  });
  const [editingFlight, setEditingFlight] = useState<any>(null);

  // Fetch user data
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ["/api/auth/me"]
  });

  // Fetch trip data
  const { data: trip, isLoading: isTripLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}`],
    enabled: !!tripId && !isNaN(parseInt(tripId))
  });

  // Fetch flights
  const { data: flights = [], isLoading: isFlightsLoading } = useQuery({
    queryKey: [`/api/trips/${tripId}/flights`],
    enabled: !!tripId && !isNaN(parseInt(tripId))
  });

  // Add flight mutation
  const addFlightMutation = useMutation({
    mutationFn: async (data: { flightNumber: string; arrivalDate: string }) => {
      return await apiRequest("POST", `/api/trips/${tripId}/flights`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      setNewFlight({ flightNumber: "", arrivalDate: "" });
      toast({
        title: "Flight added",
        description: "Your flight information has been added to the trip."
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

  // Flight update mutation
  const updateFlightMutation = useMutation({
    mutationFn: async (data: { id: number; flightNumber?: string; arrivalDate?: string }) => {
      const updateData: any = {};
      if (data.flightNumber) updateData.flightNumber = data.flightNumber;
      if (data.arrivalDate) updateData.arrivalDate = data.arrivalDate;
      
      return await apiRequest("PUT", `/api/flights/${data.id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      setEditingFlight(null);
      toast({
        title: "Flight updated",
        description: "Your flight information has been updated."
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

  // Flight delete mutation
  const deleteFlightMutation = useMutation({
    mutationFn: async (flightId: number) => {
      return await apiRequest("DELETE", `/api/flights/${flightId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/flights`] });
      toast({
        title: "Flight removed",
        description: "Your flight information has been removed."
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

  // Handle adding flight
  const handleAddFlight = () => {
    if (!newFlight.flightNumber || !newFlight.arrivalDate) {
      toast({
        title: "Missing information",
        description: "Please enter flight number and arrival date",
        variant: "destructive"
      });
      return;
    }

    const flightData = {
      flightNumber: newFlight.flightNumber.toUpperCase().trim(),
      arrivalDate: newFlight.arrivalDate
    };

    addFlightMutation.mutate(flightData);
  };

  // Handle flight update
  const handleUpdateFlight = () => {
    if (!editingFlight) {
      return;
    }

    // Build update data with only changed fields
    const updateData: any = { id: editingFlight.id };
    
    if (editingFlight.flightNumber) {
      updateData.flightNumber = editingFlight.flightNumber.toUpperCase().trim();
    }
    
    if (editingFlight.arrivalDate) {
      updateData.arrivalDate = editingFlight.arrivalDate;
    }

    // Ensure at least one field is being updated
    if (!updateData.flightNumber && !updateData.arrivalDate) {
      toast({
        title: "No changes",
        description: "Please update at least one field",
        variant: "destructive"
      });
      return;
    }

    updateFlightMutation.mutate(updateData);
  };

  // Debug logging
  console.log('Loading states:', { isUserLoading, isTripLoading, isFlightsLoading });
  console.log('Data:', { user: !!user, trip: !!trip, tripId, parsedTripId: parseInt(tripId) });
  console.log('Trip query enabled:', !!tripId && !isNaN(parseInt(tripId)));

  if (isUserLoading || isTripLoading || isFlightsLoading) {
    return (
      <TripDetailLayout tripId={parseInt(tripId)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p>Loading flight information...</p>
          </div>
        </div>
      </TripDetailLayout>
    );
  }

  if (!user || !trip) {
    return (
      <TripDetailLayout tripId={parseInt(tripId)}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p>Unable to load trip or user data</p>
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
          <Dialog>
            <DialogTrigger asChild>
              <Button>Add Flight</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Flight Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Flight Number</label>
                  <Input
                    placeholder="e.g., AA123"
                    value={newFlight.flightNumber}
                    onChange={(e) => setNewFlight(prev => ({ ...prev, flightNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Arrival Date</label>
                  <Input
                    type="date"
                    value={newFlight.arrivalDate}
                    onChange={(e) => setNewFlight(prev => ({ ...prev, arrivalDate: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleAddFlight}
                  disabled={addFlightMutation.isPending}
                  className="w-full"
                >
                  {addFlightMutation.isPending ? "Adding..." : "Add Flight"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Flight List */}
        <div className="space-y-4">
          {flights.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No flight information added yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add your flight details to help coordinate travel with your group.
                </p>
              </CardContent>
            </Card>
          ) : (
            flights.map((flight: any) => (
              <Card key={flight.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {flight.flightNumber || "Flight Details"}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={(flight.flightDetails?.status === "booked" || flight.flightNumber) ? "default" : "secondary"}>
                        {(flight.flightDetails?.status === "booked" || flight.flightNumber) ? "Booked" : "Searching"}
                      </Badge>
                      {user?.id === flight.userId && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingFlight({
                              id: flight.id,
                              flightNumber: flight.flightNumber || "",
                              arrivalDate: flight.flightDetails?.userProvidedArrivalDate || 
                                          (flight.arrivalTime ? new Date(flight.arrivalTime).toISOString().split('T')[0] : "")
                            })}
                          >
                            Edit
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
                {(flight.flightDetails?.status === "booked" || flight.flightNumber) && (
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Airline:</span>
                        <p>{flight.airline || "TBD"}</p>
                      </div>
                      <div>
                        <span className="font-medium">Arrival Date:</span>
                        <p>
                          {flight.arrivalTime 
                            ? new Date(flight.arrivalTime).toLocaleDateString()
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
                )}
              </Card>
            ))
          )}
        </div>

        {/* Edit Flight Dialog */}
        {editingFlight && (
          <Dialog open={!!editingFlight} onOpenChange={() => setEditingFlight(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Flight Information</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Flight Number</label>
                  <Input
                    placeholder="e.g., AA123"
                    value={editingFlight.flightNumber}
                    onChange={(e) => setEditingFlight(prev => ({ ...prev, flightNumber: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Arrival Date</label>
                  <Input
                    type="date"
                    value={editingFlight.arrivalDate}
                    onChange={(e) => setEditingFlight(prev => ({ ...prev, arrivalDate: e.target.value }))}
                  />
                </div>
                <Button 
                  onClick={handleUpdateFlight}
                  disabled={updateFlightMutation.isPending}
                  className="w-full"
                >
                  {updateFlightMutation.isPending ? "Updating..." : "Update Flight"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </TripDetailLayout>
  );
}